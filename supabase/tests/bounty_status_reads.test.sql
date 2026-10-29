begin;
select plan(14);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"full_name":"Alice Tan"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"full_name":"Bob Lim"}'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.com', '{"full_name":"Chen"}'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@example.com', '{"full_name":"Devi"}');

insert into public.payee_methods (user_id, type)
values
  ('00000000-0000-0000-0000-0000000000b2', 'cash'),
  ('00000000-0000-0000-0000-0000000000c3', 'cash'),
  ('00000000-0000-0000-0000-0000000000d4', 'cash');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.u(n text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || n)::uuid;
$$;

create temp table fx (name text primary key, id uuid not null);
grant all on fx to authenticated;

create function pg_temp.fx(n text) returns uuid language sql as $$
  select id from fx where name = n;
$$;

create function pg_temp.post(n text, applicants text[]) returns uuid language plpgsql as $$
declare
  item uuid := gen_random_uuid();
  applicant text;
begin
  insert into public.coin_ledger (user_id, reason, delta) values (pg_temp.u('a1'), 'help_settled', 1);
  perform pg_temp.act_as(pg_temp.u('a1'));
  perform public.publish_bounty(item, '帮取快递', 'pickup', 500, 'MYR', null, 'KL Sentral', 3.1340, 101.6860, 'Block C, 3-2');
  foreach applicant in array applicants loop
    perform pg_temp.act_as(pg_temp.u(applicant));
    perform public.apply_to_bounty(item);
  end loop;
  insert into fx values (n, item);
  return item;
end;
$$;

create function pg_temp.select_b2(n text) returns void language plpgsql as $$
begin
  perform pg_temp.act_as(pg_temp.u('a1'));
  perform public.select_helper(pg_temp.fx(n), pg_temp.u('b2'));
end;
$$;

create function pg_temp.items(viewer text, n text) returns jsonb language plpgsql as $$
  begin perform pg_temp.act_as(pg_temp.u(viewer));
  return (select coalesce(jsonb_agg(x), '[]') from jsonb_array_elements(public.bounty_live_items()) x
          where x ->> 'bountyId' = pg_temp.fx(n)::text);
  end;
$$;

create function pg_temp.shape(x jsonb) returns text language sql as $$
  select concat_ws('/', x ->> 'role', x ->> 'kind', x ->> 'action', x ->> 'card', x ->> 'status');
$$;

create function pg_temp.detail(viewer text, n text) returns jsonb language plpgsql as $$
  begin perform pg_temp.act_as(pg_temp.u(viewer)); return public.bounty_detail(pg_temp.fx(n)); end;
$$;

create function pg_temp.preview(viewer text, n text) returns jsonb language plpgsql as $$
  begin perform pg_temp.act_as(pg_temp.u(viewer)); return public.bounty_cancel_preview(pg_temp.fx(n)); end;
$$;

select pg_temp.post('main', array['b2', 'd4']);
select pg_temp.post('withdrawn', array['b2']);
select pg_temp.post('blocked', array['c3']);
select pg_temp.post('first', array['b2']);
select pg_temp.post('second', array['b2']);
select pg_temp.select_b2('first');
select pg_temp.select_b2('second');
create temp table charges as
select c.charge::text as charge from public.post_charges c where c.item_kind = 'bounty' and c.item_id = pg_temp.fx('main');
grant select on charges to authenticated;

set local role authenticated;

select is(
  (select jsonb_agg(pg_temp.shape(x)) from jsonb_array_elements(pg_temp.items('b2', 'main')) x),
  '["applicant/bountyInProgress/open"]'::jsonb,
  'a pending applicant on an open bounty has one in-progress row without action or card'
);
select is(
  pg_temp.items('b2', 'main') #>> '{0,counterpartName}', 'Alice Tan', 'the pending row names the poster'
);

select pg_temp.act_as(pg_temp.u('b2'));
select public.withdraw_application(pg_temp.fx('withdrawn'));
select is(pg_temp.items('b2', 'withdrawn'), '[]'::jsonb, 'a withdrawn application has no row');

select is(
  jsonb_array_length(pg_temp.items('c3', 'blocked')), 1, 'the applicant has a row before the block'
);
select pg_temp.act_as(pg_temp.u('a1'));
select public.block_user(pg_temp.u('c3'));
select is(pg_temp.items('c3', 'blocked'), '[]'::jsonb, 'a blocked pair has no pending row');

select is(
  pg_temp.detail('a1', 'main') ->> 'charge',
  (select charge from charges),
  'the poster of an open bounty reads its charge'
);
select isnt(pg_temp.detail('a1', 'main') ->> 'charge', null, 'the open bounty has a charge');
select is(pg_temp.detail('b2', 'main') ->> 'charge', null, 'an applicant reads no charge');

select pg_temp.select_b2('main');
select is(pg_temp.detail('a1', 'main') ->> 'charge', null, 'the poster reads no charge once the bounty is assigned');
select is(
  (select jsonb_agg(pg_temp.shape(x)) from jsonb_array_elements(pg_temp.items('d4', 'main')) x),
  '["applicant/oneTime/not_selected/assigned"]'::jsonb,
  'after selection the other applicant loses the pending row and gets the not_selected card'
);
select is(
  (select jsonb_agg(pg_temp.shape(x)) from jsonb_array_elements(pg_temp.items('b2', 'main')) x),
  '["helper/bountyAction/start/assigned"]'::jsonb,
  'the selected applicant loses the pending row and has the helper row'
);

select is(
  pg_temp.preview('b2', 'first'), '{"offender": "self", "waiverAvailable": true, "waiverBackAt": null}'::jsonb,
  'with the waiver available there is no waiverBackAt'
);
select pg_temp.act_as(pg_temp.u('b2'));
select public.cancel_bounty(pg_temp.fx('first'));
reset role;
create temp table waiver as
select r.created_at + interval '60 days' as back_at from public.reputation_events r
where r.kind = 'no_show' and r.item_kind = 'bounty' and r.item_id = pg_temp.fx('first') and r.waived;
grant select on waiver to authenticated;
set local role authenticated;
select is(
  pg_temp.preview('b2', 'second'),
  jsonb_build_object(
    'offender', 'self', 'waiverAvailable', false,
    'waiverBackAt', (select back_at from waiver)
  ),
  'once the waiver is used waiverBackAt is 60 days after the waived no-show'
);
select is(
  pg_temp.preview('a1', 'second') ->> 'waiverBackAt', null, 'the poster, whose waiver is unused, gets no waiverBackAt'
);

select * from finish();
rollback;
