begin;
select plan(55);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@example.com', '{"full_name":"Devi"}');

insert into public.payee_methods (user_id, type)
values ('00000000-0000-0000-0000-0000000000b2', 'cash'), ('00000000-0000-0000-0000-0000000000d4', 'cash');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.bounty_in(
  state public.bounty_status, starts_ago interval default null, selected_ago interval default null
) returns uuid
language plpgsql as $$
declare
  item uuid := gen_random_uuid();
begin
  insert into public.coin_ledger (user_id, reason, delta)
  values ('00000000-0000-0000-0000-0000000000a1', 'help_settled', 1);
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
  perform public.publish_bounty(
    item, '帮取快递', 'pickup', 500, starts_at => case when starts_ago is not null then now() + interval '1 hour' end
  );
  update public.bounties set starts_at = now() - starts_ago where id = item and starts_ago is not null;
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
  perform public.apply_to_bounty(item);
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000d4');
  perform public.apply_to_bounty(item);
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
  if state = 'closed' then
    perform public.close_bounty(item);
  elsif state <> 'open' then
    perform public.select_helper(item, '00000000-0000-0000-0000-0000000000b2');
    update public.bounty_events set created_at = now() - selected_ago
    where bounty_id = item and kind = 'selected' and selected_ago is not null;
  end if;
  if state in ('en_route', 'done', 'disputed', 'confirmed') then
    perform pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
    perform public.start_bounty(item);
    if state <> 'en_route' then
      perform public.complete_bounty(item);
      perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
      if state = 'disputed' then
        perform public.report_bounty_problem(item, '没看到东西');
      elsif state = 'confirmed' then
        perform public.confirm_bounty(item);
      end if;
    end if;
  end if;
  return item;
end;
$$;

create temp table fx (name text primary key, id uuid not null);
create temp table results (name text primary key, r jsonb);
grant all on fx, results to authenticated;

create function pg_temp.fx(n text) returns uuid language sql as $$
  select id from fx where name = n;
$$;

create function pg_temp.call(n text, actor uuid, fn text, item text) returns jsonb language plpgsql as $$
declare
  answer jsonb;
begin
  perform pg_temp.act_as(actor);
  execute format('select public.%I(%L)', fn, pg_temp.fx(item)) into answer;
  insert into results values (n, answer);
  return answer;
end;
$$;

create function pg_temp.no_shows(item text) returns text[] language sql as $$
  select array_agg(
    case user_id when '00000000-0000-0000-0000-0000000000a1' then 'A' when '00000000-0000-0000-0000-0000000000b2' then 'B' end
    || case when waived then ' waived' else ' counted' end
  )
  from public.reputation_events where kind = 'no_show' and item_kind = 'bounty' and item_id = pg_temp.fx(item);
$$;

create function pg_temp.footprint() returns bigint[] language sql as $$
  select array[(select count(*) from public.bounty_events), (select count(*) from public.reputation_events)];
$$;

insert into fx
select n, pg_temp.bounty_in(s::public.bounty_status, ago, picked)
from (values
  ('helper-first', 'assigned', null::interval, null::interval), ('helper-second', 'assigned', null, null),
  ('poster-en-route', 'en_route', interval '31 minutes', interval '1 hour 31 minutes'),
  ('late-31', 'assigned', interval '31 minutes', interval '1 hour 31 minutes'),
  ('late-29', 'assigned', interval '29 minutes', interval '1 hour 29 minutes'), ('no-start', 'assigned', null, null),
  ('helper-later', 'assigned', null, null), ('late-select', 'assigned', interval '2 hours', null),
  ('late-select-31', 'assigned', interval '2 hours', interval '31 minutes'),
  ('open', 'open', null, null), ('done', 'done', null, null), ('disputed', 'disputed', null, null),
  ('closed', 'closed', null, null)
) v (n, s, ago, picked);
insert into fx values ('confirmed', pg_temp.bounty_in('confirmed'));
create temp table charges_before as select count(*) as n from public.post_charges where refunded_at is not null;

select is(
  pg_temp.call('preview-helper', '00000000-0000-0000-0000-0000000000b2', 'bounty_cancel_preview', 'helper-first'),
  '{"offender": "self", "waiverAvailable": true, "waiverBackAt": null}'::jsonb, 'the helper is told the cancel counts against them with a waiver'
);
select is(
  pg_temp.call('helper-first', '00000000-0000-0000-0000-0000000000b2', 'cancel_bounty', 'helper-first'),
  '{"status": "cancelled", "offender": "self", "noShow": "waived"}'::jsonb,
  'the helper cancelling an assigned bounty uses the waiver'
);
select is(
  (select array_agg(concat_ws(' ', kind, from_status, to_status) order by id) from public.bounty_events
   where bounty_id = pg_temp.fx('helper-first') and kind = 'cancelled' and actor_id = '00000000-0000-0000-0000-0000000000b2'),
  array['cancelled assigned cancelled'], 'one cancelled event by the helper'
);
select is(pg_temp.no_shows('helper-first'), array['B waived'], 'one waived no-show for the helper');
select is(
  (select row(b.status::text, a.status::text)::text from public.bounties b
   join public.bounty_applications a on a.bounty_id = b.id and a.applicant_id = b.helper_id
   where b.id = pg_temp.fx('helper-first')),
  row('cancelled', 'selected')::text, 'the bounty is cancelled and the application stays selected'
);
select is(
  pg_temp.call('preview-second', '00000000-0000-0000-0000-0000000000b2', 'bounty_cancel_preview', 'helper-second') - 'waiverBackAt',
  '{"offender": "self", "waiverAvailable": false}'::jsonb, 'the next preview shows the waiver is used'
);
select is(
  pg_temp.call('helper-second', '00000000-0000-0000-0000-0000000000b2', 'cancel_bounty', 'helper-second'),
  '{"status": "cancelled", "offender": "self", "noShow": "counted"}'::jsonb,
  'a second helper cancel within 60 days is counted'
);
select is(pg_temp.no_shows('helper-second'), array['B counted'], 'the second no-show is counted');

select is(
  pg_temp.call('poster-en-route', '00000000-0000-0000-0000-0000000000a1', 'cancel_bounty', 'poster-en-route'),
  '{"status": "cancelled", "offender": "self", "noShow": "waived"}'::jsonb,
  'the poster cancelling an en-route bounty, even 31 minutes after the start, is their own no-show'
);
select is(pg_temp.no_shows('poster-en-route'), array['A waived'], 'the no-show is the poster''s');

create temp table footprint_before as select pg_temp.footprint() as f;
select is(
  pg_temp.call('preview-31', '00000000-0000-0000-0000-0000000000a1', 'bounty_cancel_preview', 'late-31'),
  '{"offender": "other", "waiverAvailable": null, "waiverBackAt": null}'::jsonb,
  '31 minutes after the start the preview names the helper'
);
select is(
  pg_temp.call('preview-29', '00000000-0000-0000-0000-0000000000a1', 'bounty_cancel_preview', 'late-29') - 'waiverBackAt',
  '{"offender": "self", "waiverAvailable": false}'::jsonb, '29 minutes after the start the preview names the poster'
);
select is(
  pg_temp.call('preview-none', '00000000-0000-0000-0000-0000000000a1', 'bounty_cancel_preview', 'no-start') - 'waiverBackAt',
  '{"offender": "self", "waiverAvailable": false}'::jsonb, 'without a start time the preview names the poster'
);
select is(pg_temp.footprint(), (select f from footprint_before), 'previews write nothing');

select is(
  pg_temp.call('late-31', '00000000-0000-0000-0000-0000000000a1', 'cancel_bounty', 'late-31'),
  '{"status": "cancelled", "offender": "other", "noShow": null}'::jsonb,
  'the poster cancelling 31 minutes after the start does not learn the helper''s waiver'
);
select is(pg_temp.no_shows('late-31'), array['B counted'], 'the no-show 31 minutes after the start is the helper''s');
select is(
  pg_temp.call('late-29', '00000000-0000-0000-0000-0000000000a1', 'cancel_bounty', 'late-29'),
  '{"status": "cancelled", "offender": "self", "noShow": "counted"}'::jsonb,
  'the poster cancelling 29 minutes after the start is their own no-show'
);
select is(pg_temp.no_shows('late-29'), array['A counted'], 'the no-show 29 minutes after the start is the poster''s');
select is(
  pg_temp.call('no-start', '00000000-0000-0000-0000-0000000000a1', 'cancel_bounty', 'no-start'),
  '{"status": "cancelled", "offender": "self", "noShow": "counted"}'::jsonb,
  'the poster cancelling a bounty without a start time is their own no-show'
);
select is(pg_temp.no_shows('no-start'), array['A counted'], 'the no-show without a start time is the poster''s');
select is(
  (select array_agg(
     (p.r ->> 'offender') = (c.r ->> 'offender')
     and (p.r -> 'waiverAvailable') = case c.r ->> 'noShow' when 'waived' then 'true' when 'counted' then 'false' else 'null' end::jsonb
     order by p.name)
   from results p join results c on c.name = 'late-' || substr(p.name, 9)
   where p.name in ('preview-31', 'preview-29')),
  array[true, true], 'each preview matches the cancel that followed'
);
select is(
  (select (p.r ->> 'offender') = (c.r ->> 'offender') and (p.r ->> 'waiverAvailable')::boolean = false
     and c.r ->> 'noShow' = 'counted'
   from results p, results c where p.name = 'preview-none' and c.name = 'no-start'),
  true, 'the preview without a start time matches its cancel'
);

select is(
  (select count(*) from public.coin_ledger where reason = 'post_refund'
   and item_id in (select id from public.bounties where status = 'cancelled')),
  0::bigint, 'no cancel refunds a coin'
);
select is(
  (select count(*) from public.post_charges where refunded_at is not null), (select n from charges_before),
  'no cancel refunds a free slot'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select is(
  public.cancel_bounty(pg_temp.fx('helper-first')), (select r from results where name = 'helper-first'),
  'replaying the helper cancel returns the first answer'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is(
  public.cancel_bounty(pg_temp.fx('late-31')), (select r from results where name = 'late-31'),
  'replaying the poster cancel returns the first answer'
);
select is(
  pg_temp.footprint(),
  (select array[f[1] + 3, f[2] + 3] from footprint_before), 'replays write no event and no no-show'
);

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d4');
select throws_ok(
  format('select public.cancel_bounty(%L)', pg_temp.fx('helper-second')), '42501', 'not_helper',
  'someone who is not a party cannot cancel'
);
select throws_ok(
  format('select public.bounty_cancel_preview(%L)', pg_temp.fx('helper-second')), '42501', 'not_helper',
  'someone who is not a party cannot preview'
);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  format('select public.cancel_bounty(%L)', gen_random_uuid()), 'P0002', 'bounty_not_found',
  'an unknown bounty is not found'
);
select throws_ok(
  format('select public.cancel_bounty(%L)', pg_temp.fx(s)), '55000', 'invalid_transition',
  format('cancel_bounty on %s is rejected', s)
)
from unnest(array['open', 'done', 'disputed', 'confirmed', 'closed', 'helper-first']) s;
select throws_ok(
  format('select public.bounty_cancel_preview(%L)', pg_temp.fx(s)), '55000', 'invalid_transition',
  format('bounty_cancel_preview on %s is rejected', s)
)
from unnest(array['open', 'done', 'disputed', 'confirmed', 'closed', 'helper-first']) s;
reset role;
select is(
  (select array_agg(b.status::text order by n) from unnest(array['closed', 'confirmed', 'disputed', 'done', 'open']) n
   join public.bounties b on b.id = pg_temp.fx(n)),
  array['closed', 'confirmed', 'disputed', 'done', 'open'], 'rejected cancels leave the status'
);
select is(
  pg_temp.footprint(),
  (select array[f[1] + 3, f[2] + 3] from footprint_before), 'rejected cancels write nothing'
);

update public.reputation_events set created_at = now() - interval '61 days'
where kind = 'no_show' and item_id = pg_temp.fx('helper-first');
select is(
  pg_temp.call('preview-later', '00000000-0000-0000-0000-0000000000b2', 'bounty_cancel_preview', 'helper-later'),
  '{"offender": "self", "waiverAvailable": true, "waiverBackAt": null}'::jsonb,
  'a waiver used 61 days ago is available again although counted no-shows are recent'
);
select is(
  pg_temp.call('helper-later', '00000000-0000-0000-0000-0000000000b2', 'cancel_bounty', 'helper-later'),
  '{"status": "cancelled", "offender": "self", "noShow": "waived"}'::jsonb, 'and the cancel uses it'
);

select is(
  pg_temp.call('preview-late-select', '00000000-0000-0000-0000-0000000000a1', 'bounty_cancel_preview', 'late-select')
    ->> 'offender',
  'self', 'selected 2 hours after the start, the preview right after the selection names the poster'
);
select is(
  pg_temp.call('late-select', '00000000-0000-0000-0000-0000000000a1', 'cancel_bounty', 'late-select') ->> 'offender',
  'self', 'and the poster cancelling right after the selection is their own no-show'
);
select is(
  pg_temp.no_shows('late-select'), array['A counted'], 'the no-show of a late selection cancelled at once is the poster''s'
);
select is(
  pg_temp.call('preview-late-select-31', '00000000-0000-0000-0000-0000000000a1', 'bounty_cancel_preview',
    'late-select-31') ->> 'offender',
  'other', 'selected after the start, 31 minutes after the selection the preview names the helper'
);
select is(
  pg_temp.call('late-select-31', '00000000-0000-0000-0000-0000000000a1', 'cancel_bounty', 'late-select-31'),
  '{"status": "cancelled", "offender": "other", "noShow": null}'::jsonb,
  'and the poster cancelling 31 minutes after a late selection names the helper'
);
select is(
  pg_temp.no_shows('late-select-31'), array['B counted'], 'the no-show 31 minutes after a late selection is the helper''s'
);

create function pg_temp.cancellable_without_helper(item uuid, uid uuid) returns void language plpgsql as $$
declare
  b public.bounties;
begin
  select * into b from public.bounties where id = item;
  b.helper_id := null;
  perform private.cancellable_by(b, uid);
end;
$$;
insert into fx values ('party-check', pg_temp.bounty_in('assigned'));
select throws_ok(
  format('select pg_temp.cancellable_without_helper(%L, %L)', pg_temp.fx('party-check'),
    '00000000-0000-0000-0000-0000000000d4'),
  '42501', 'not_helper', 'a stranger is not a party even when the helper is missing'
);

select is(
  has_function_privilege('anon', 'public.cancel_bounty(uuid)', 'execute'), false, 'anon cannot cancel'
);
select is(
  has_function_privilege('authenticated', 'private.no_show_offender(public.bounties, uuid)', 'execute'), false,
  'clients cannot call the offender rule'
);

select * from finish();
rollback;
