begin;
select plan(26);

-- Hosted projects grant the Data API roles nothing by default (config.toml api.auto_expose_new_tables = false); with
-- the old defaults every assertion below would pass whether or not a migration granted it.
select is(
  (select count(*)::int from pg_default_acl a, aclexplode(a.defaclacl) x
   where a.defaclrole = 'postgres'::regrole and a.defaclnamespace = 'public'::regnamespace
     and x.grantee in ('anon'::regrole, 'authenticated'::regrole, 'service_role'::regrole)
     and (x.privilege_type in ('SELECT', 'INSERT', 'DELETE', 'USAGE', 'EXECUTE')
          or (x.privilege_type = 'UPDATE' and a.defaclobjtype = 'r'))),
  0,
  'new public tables, sequences and functions grant the Data API roles nothing, as on the hosted project'
);

select ok(has_table_privilege('service_role', 'public.fx_rates', 'select'), 'fx-rate: upsert reads the conflict key');
select ok(has_table_privilege('service_role', 'public.fx_rates', 'insert'), 'fx-rate: stores a new day');
select ok(has_table_privilege('service_role', 'public.fx_rates', 'update'), 'fx-rate: refreshes a stored day');
select ok(not has_table_privilege('service_role', 'public.fx_rates', 'delete'), 'fx-rate: never deletes rates');

select ok(
  has_column_privilege('service_role', 'public.payments', 'id', 'select')
  and has_column_privilege('service_role', 'public.payments', 'title', 'select')
  and has_column_privilege('service_role', 'public.payments', 'amount_minor', 'select')
  and has_column_privilege('service_role', 'public.payments', 'currency', 'select')
  and has_column_privilege('service_role', 'public.payments', 'payer_id', 'select')
  and has_column_privilege('service_role', 'public.payments', 'payee_id', 'select')
  and has_column_privilege('service_role', 'public.payments', 'state', 'select')
  and has_column_privilege('service_role', 'public.payments', 'created_at', 'select'),
  'account-delete: lists the unsettled payments of the leaving user'
);
select ok(
  has_column_privilege('service_role', 'public.profiles', 'id', 'select')
  and has_column_privilege('service_role', 'public.profiles', 'display_name', 'select'),
  'account-delete: names the counterparts'
);
select ok(not has_table_privilege('service_role', 'public.payments', 'update'), 'account-delete: never edits payments');
select ok(
  not has_column_privilege('service_role', 'public.profiles', 'avatar_url', 'select'),
  'account-delete: reads no profile column it does not show'
);
select ok(has_function_privilege('service_role', 'public.active_bounties_of(uuid)', 'execute'), 'account-delete: active bounties');
select ok(has_function_privilege('service_role', 'public.active_rides_of(uuid)', 'execute'), 'account-delete: active rides');

select ok(has_function_privilege('service_role', 'public.payment_proofs_to_delete(interval)', 'execute'), 'payment-proof-cleanup: payment proofs');
select ok(has_function_privilege('service_role', 'public.ride_receipts_to_delete(interval)', 'execute'), 'payment-proof-cleanup: ride receipts');
select ok(has_function_privilege('service_role', 'public.chat_images_to_delete(interval)', 'execute'), 'payment-proof-cleanup: chat images');
select ok(has_function_privilege('service_role', 'public.clear_payment_proof(uuid)', 'execute'), 'payment-proof-cleanup: clears a payment proof');
select ok(has_function_privilege('service_role', 'public.clear_ride_receipt(uuid)', 'execute'), 'payment-proof-cleanup: clears a ride receipt');

select ok(has_function_privilege('service_role', 'public.claim_due_pushes(integer)', 'execute'), 'notify: claims due pushes');
select ok(has_function_privilege('service_role', 'public.finish_push(bigint, text)', 'execute'), 'notify: finishes a push');
select ok(has_function_privilege('service_role', 'public.drop_push_token(text)', 'execute'), 'notify: drops a dead token');
select ok(has_table_privilege('service_role', 'public.recorded_pushes', 'insert'), 'notify: records pushes in tests');

select ok(has_function_privilege('service_role', 'public.ai_begin_call(uuid)', 'execute'), 'ai-draft: begins a call');
select ok(
  has_function_privilege('service_role', 'public.ai_finish_call(uuid, uuid, text, text, integer, integer, integer)', 'execute')
  and has_function_privilege('service_role', 'public.ai_discard_call(uuid, uuid, text, text, integer, integer)', 'execute')
  and has_function_privilege('service_role', 'public.ai_abort_call(uuid, uuid)', 'execute'),
  'ai-draft: settles a call'
);
select ok(has_function_privilege('service_role', 'public.ai_memory_for_call(uuid)', 'execute'), 'ai-draft: reads memory');

select ok(
  has_function_privilege('service_role', 'public.iap_credit(uuid, text, text, text, public.iap_environment, timestamptz)', 'execute'),
  'iap-verify: credits a purchase'
);
select ok(
  has_function_privilege('service_role', 'public.iap_revoke(uuid, text, text, text, public.iap_environment, timestamptz, timestamptz)', 'execute'),
  'iap: revokes a purchase'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.iap_apply_notification(uuid, text, text, public.iap_environment, timestamptz, text, text, text, timestamptz, timestamptz)',
    'execute'
  ),
  'iap-notify: applies a notification'
);

select * from finish();
rollback;
