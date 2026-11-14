begin;
select plan(37);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', k)
from unnest(array['f1', 'f2', 'f3', 'f4']) as k;

create function pg_temp.uid(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(k text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', pg_temp.uid(k)::text, true),
         set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.uid(k), 'role', 'authenticated')::text, true);
$$;

create function pg_temp.for_call(k text) returns jsonb language sql as $$
  select public.ai_memory_for_call(pg_temp.uid(k));
$$;

select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relrowsecurity and c.relname in ('ai_memory', 'ai_memory_prefs')),
  2::bigint, 'both memory tables have row level security on'
);

select pg_temp.act_as('f1');
set local role authenticated;

select is(
  public.save_ai_memory(null, 'place', ' 宿舍 ', ' Sunway Geo ') - 'id' - 'updatedAt',
  '{"kind": "place", "label": "宿舍", "content": "Sunway Geo"}'::jsonb,
  'saving trims and answers with the entry'
);
select is(
  (public.save_ai_memory(null, 'place', '宿舍', 'Sunway Pyramid') ->> 'content'), 'Sunway Pyramid',
  'saving a label already kept replaces its value'
);
select is((select count(*) from public.ai_memory), 1::bigint, 'and keeps one entry per label');
select lives_ok(
  $$select public.save_ai_memory(null, 'place', '宿舍', 'Sunway Geo')$$, 'labels match whatever their case'
);
select public.save_ai_memory(null, 'preference', '赏金一般给', 'RM 10–15');
select throws_ok(
  $$select public.save_ai_memory(null, 'place', '   ', 'x')$$, '22023', 'invalid_memory', 'a blank label is refused'
);
select throws_ok(
  $$select public.save_ai_memory(null, 'place', 'x', repeat('长', 201))$$, '22023', 'invalid_memory',
  'a value over 200 characters is refused'
);
select throws_ok(
  $$select public.save_ai_memory(null, 'habit', 'x', 'y')$$, '22023', 'invalid_memory', 'an unknown kind is refused'
);
select throws_ok(
  $$select public.save_ai_memory(null, 'place', repeat('x', 41), 'y')$$, '22023', 'invalid_memory',
  'a label over 40 characters is refused'
);

reset role;
create temp table ids as select id, label from public.ai_memory;
grant all on ids to authenticated;
set local role authenticated;
select is(
  public.save_ai_memory((select id from ids where label = '宿舍'), 'place', '宿舍', 'Sunway Geo Residence') ->> 'content',
  'Sunway Geo Residence', 'the owner edits an entry by its id'
);
select throws_ok(
  format($$select public.save_ai_memory(%L, 'place', '宿舍', 'x')$$, (select id from ids where label = '赏金一般给')),
  '23505', 'label_taken', 'an edit cannot take a label another entry holds'
);
select throws_ok(
  format($$select public.save_ai_memory(%L, 'place', 'x', 'y')$$, gen_random_uuid()), 'P0002', 'memory_not_found',
  'an edit of an unknown entry is refused'
);

select pg_temp.act_as('f2');
select throws_ok(
  format($$select public.save_ai_memory(%L, 'place', '宿舍', 'hijack')$$, (select id from ids where label = '宿舍')),
  'P0002', 'memory_not_found', 'another user cannot edit it'
);
select is((select count(*) from public.ai_memory), 0::bigint, 'another user reads nothing');
select is(public.clear_ai_memory(), 0, 'another user''s 全部删除 removes nothing of mine');
select is((select count(*) from public.ai_memory_prefs), 0::bigint, 'and reads no switch of mine');

select pg_temp.act_as('f1');
select throws_ok(
  $$update public.ai_memory set content = 'x'$$, '42501', null, 'a client cannot update past the save function'
);
select throws_ok(
  $$insert into public.ai_memory_prefs (user_id, enabled) values (auth.uid(), false)$$, '42501', null,
  'a client cannot write the switch directly'
);

-- 283 A: the switch off saves nothing new and sends nothing; the entries stay to read, edit and delete.
select is(public.set_ai_memory_enabled(false), '{"enabled": false}'::jsonb, 'the switch turns off');
select is((select enabled from public.ai_memory_prefs), false, 'and the owner reads it');
select throws_ok(
  $$select public.save_ai_memory(null, 'place', '学校', 'Sunway University')$$, '55000', 'memory_off',
  'nothing new is saved while it is off'
);
select throws_ok(
  $$select public.save_ai_memory(null, 'place', '宿舍', 'Elsewhere')$$, '55000', 'memory_off',
  'not even a value replaced through 记住'
);
select is(
  public.save_ai_memory((select id from ids where label = '宿舍'), 'place', '宿舍', 'Sunway Geo') ->> 'content',
  'Sunway Geo', 'an entry already kept can still be corrected'
);
select is((select count(*) from public.ai_memory), 2::bigint, 'the old entries stay');
reset role;
select is(pg_temp.for_call('f1') -> 'entries', '[]'::jsonb, 'and none is sent while it is off');
select is(pg_temp.for_call('f1') ->> 'enabled', 'false', 'the call is told the switch is off');
select pg_temp.act_as('f1');
set local role authenticated;
select public.set_ai_memory_enabled(true);
reset role;
update public.ai_memory set updated_at = now() + interval '1 minute' where label = '宿舍';
select is(jsonb_array_length(pg_temp.for_call('f1') -> 'entries'), 2, 'switched on, the entries are sent again');
select is(
  pg_temp.for_call('f1') #>> '{entries,0,label}', '宿舍', 'newest first'
);
select is(pg_temp.for_call('f2') -> 'entries', '[]'::jsonb, 'a call carries only its own user''s entries');
select is(pg_temp.for_call('f3') ->> 'enabled', 'true', 'the switch is on until turned off');

-- 284 A: at most 50 kept; 282 A: at most 30 sent.
insert into public.ai_memory (user_id, kind, label, content, updated_at)
select pg_temp.uid('f3'), 'place', 'p' || i, 'v' || i, now() - make_interval(mins => i)
from generate_series(1, 50) as i;
select is(jsonb_array_length(pg_temp.for_call('f3') -> 'entries'), 30, 'a call carries at most 30 entries');
select is(pg_temp.for_call('f3') #>> '{entries,0,label}', 'p1', 'the newest ones');
select is(pg_temp.for_call('f3') ->> 'full', 'true', 'and knows the list is full');
select pg_temp.act_as('f3');
set local role authenticated;
select throws_ok(
  $$select public.save_ai_memory(null, 'place', 'p51', 'x')$$, '55000', 'memory_full', 'the 51st entry is refused'
);
select lives_ok(
  $$select public.save_ai_memory(null, 'place', 'p50', 'new')$$, 'a full list still takes a new value for a kept label'
);
select is(public.clear_ai_memory(), 50, '全部删除 removes every entry');
reset role;

select pg_temp.act_as('f4');
set local role authenticated;
select public.save_ai_memory(null, 'place', '宿舍', 'x');
select public.set_ai_memory_enabled(false);
reset role;
delete from auth.users where id = pg_temp.uid('f4');
select is(
  (select count(*) from public.ai_memory where user_id = pg_temp.uid('f4'))
    + (select count(*) from public.ai_memory_prefs where user_id = pg_temp.uid('f4')),
  0::bigint, 'deleting the account deletes the entries and the switch'
);

select * from finish();
rollback;
