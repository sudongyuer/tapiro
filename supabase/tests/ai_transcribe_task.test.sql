begin;
select plan(3);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-0000000000e6', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'e6@example.com', jsonb_build_object('full_name', 'Eve'));

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e6', true),
       set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select public.record_consent(1);

create temp table held as
select (public.ai_begin_call('00000000-0000-0000-0000-0000000000e6') ->> 'lease')::uuid as lease;

select lives_ok(
  $$select public.ai_finish_call('00000000-0000-0000-0000-0000000000e6', (select lease from held), 'transcribe', 'fake', 300, 60, 34)$$,
  'a cloud transcription is metered as transcribe'
);
select is(
  (select task from public.ai_metering where user_id = '00000000-0000-0000-0000-0000000000e6'),
  'transcribe',
  'the meter row names the task, not the tool the model chose'
);
select throws_ok(
  $$insert into public.ai_metering (user_id, task, model, input_tokens, output_tokens, energy_spent)
    values ('00000000-0000-0000-0000-0000000000e6', 'transcript', 'fake', 0, 0, 0)$$,
  '23514', null, 'a tool name is not a task'
);

select * from finish();
rollback;
