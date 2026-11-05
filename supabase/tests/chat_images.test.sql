begin;
select plan(35);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', k || '@example.com', jsonb_build_object('full_name', n)
from (values ('a1', 'Alice'), ('b2', 'Bob'), ('c3', 'Chen'), ('d4', 'Devi'), ('e5', 'Eli')) v (k, n);

insert into public.payee_methods (user_id, type)
select ('00000000-0000-0000-0000-0000000000' || k)::uuid, 'cash' from unnest(array['a1', 'b2', 'c3', 'd4']) k;

create function pg_temp.u(k text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || k)::uuid;
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.c(n integer) returns uuid language sql as $$
  select ('c5000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
$$;

create function pg_temp.path(thread uuid, k text, n integer) returns text language sql as $$
  select thread::text || '/' || pg_temp.u(k)::text || '/' || pg_temp.c(n)::text || '.jpg';
$$;

create function pg_temp.upload(k text, name text) returns void language sql as $$
  select pg_temp.act_as(pg_temp.u(k));
  insert into storage.objects (bucket_id, name, owner) values ('chat-images', name, pg_temp.u(k));
$$;

create function pg_temp.visible(k text, name text) returns bigint language sql as $$
  select pg_temp.act_as(pg_temp.u(k));
  select count(*) from storage.objects o where o.bucket_id = 'chat-images' and o.name = visible.name;
$$;

create function pg_temp.send_image(k text, thread uuid, n integer, body text default '') returns jsonb language sql as $$
  select pg_temp.act_as(pg_temp.u(k));
  select public.send_message(thread, pg_temp.c(n), body, pg_temp.path(thread, k, n), 1536, 2048);
$$;

insert into public.coin_ledger (user_id, reason, delta) values (pg_temp.u('a1'), 'help_settled', 1);
select pg_temp.act_as(pg_temp.u('a1'));
select public.publish_bounty('b0000000-0000-4000-8000-000000000007', '帮取快递', 'pickup', 500, 'MYR');
select pg_temp.act_as(pg_temp.u('b2'));
select public.apply_to_bounty('b0000000-0000-4000-8000-000000000007', '我可以');
select pg_temp.act_as(pg_temp.u('a1'));
select public.select_helper('b0000000-0000-4000-8000-000000000007', pg_temp.u('b2'));

create temp table bt as
select t.id from public.threads t where t.bounty_id = 'b0000000-0000-4000-8000-000000000007';
grant select on bt to authenticated;

select is(
  (select array[public::text, file_size_limit::text, array_to_string(allowed_mime_types, ',')]
   from storage.buckets where id = 'chat-images'),
  array['false', '10485760', 'image/jpeg'], 'chat images live in a private JPEG-only bucket of 10 MB per file'
);

set local role authenticated;
select lives_ok(
  format('select pg_temp.upload(%L, %L)', 'a1', pg_temp.path((select id from bt), 'a1', 1)),
  'a member uploads under their own folder of the thread'
);
select throws_ok(
  format('select pg_temp.upload(%L, %L)', 'a1', pg_temp.path((select id from bt), 'b2', 2)),
  '42501', null, 'a member cannot upload into the other member''s folder'
);
select throws_ok(
  format('select pg_temp.upload(%L, %L)', 'c3', pg_temp.path((select id from bt), 'c3', 3)),
  '42501', null, 'someone outside the thread cannot upload into it'
);
select throws_ok(
  format('select pg_temp.upload(%L, %L)', 'a1', (select id from bt)::text || '/' || pg_temp.u('a1') || '/x.png'),
  '42501', null, 'only <client id>.jpg names are accepted'
);
select throws_ok(
  format('select pg_temp.upload(%L, %L)', 'a1', 'not-a-thread/' || pg_temp.u('a1') || '/' || pg_temp.c(4) || '.jpg'),
  '42501', null, 'a folder that is not a thread id is refused'
);

select is(pg_temp.visible('b2', pg_temp.path((select id from bt), 'a1', 1)), 0::bigint,
  'an upload is not readable by the other member before its message is stored');

select is(
  pg_temp.send_image('a1', (select id from bt), 1) -> 'image',
  jsonb_build_object('path', pg_temp.path((select id from bt), 'a1', 1), 'width', 1536, 'height', 2048),
  'an image message without text is stored with its path and size'
);
select is(
  pg_temp.send_image('a1', (select id from bt), 1) ->> 'body', '', 'an image message keeps an empty body'
);
select is(
  (select count(*) from public.messages m where m.client_id = pg_temp.c(1)), 1::bigint,
  'a resend with the same client id stores nothing new'
);
select throws_ok(
  format('select pg_temp.send_image(%L, %L, 1, %L)', 'a1', (select id from bt), '另一张'),
  '22023', 'client_id_reused', 'the same client id with other content is refused'
);
select is(pg_temp.visible('b2', pg_temp.path((select id from bt), 'a1', 1)), 1::bigint,
  'the other member reads the image once the message is stored');
select is(pg_temp.visible('a1', pg_temp.path((select id from bt), 'a1', 1)), 1::bigint,
  'the sender reads their own image');
select is(pg_temp.visible('c3', pg_temp.path((select id from bt), 'a1', 1)), 0::bigint,
  'someone outside the thread cannot read the image');

select throws_ok(
  format('select pg_temp.send_image(%L, %L, 6)', 'a1', (select id from bt)),
  'P0002', 'image_missing', 'an image that was never uploaded answers image_missing, which the client may retry'
);
select throws_ok(
  format('select public.send_message(%L, %L, %L, %L, 10, 20)', (select id from bt), pg_temp.c(7), '',
         pg_temp.path((select id from bt), 'a1', 8)),
  '22023', 'invalid_message', 'the image path must be derived from the message''s own client id'
);
select throws_ok(
  format('select public.send_message(%L, %L, %L, %L, 0, 20)', (select id from bt), pg_temp.c(9), '',
         pg_temp.path((select id from bt), 'a1', 9)),
  '22023', 'invalid_message', 'an image needs a size between 1 and 4096'
);
select throws_ok(
  format('select public.send_message(%L, %L, %L)', (select id from bt), pg_temp.c(10), ' '),
  '22023', 'invalid_message', 'without an image the body still needs text'
);

select pg_temp.upload('a1', pg_temp.path((select id from bt), 'a1', 11));
select is(
  pg_temp.send_image('a1', (select id from bt), 11, '  快递柜在这  ') ->> 'body', '快递柜在这',
  'an image may carry text, trimmed like any message'
);

reset role;
select pg_temp.act_as(pg_temp.u('b2'));
select public.block_user(pg_temp.u('a1'));
set local role authenticated;
select throws_ok(
  format('select pg_temp.upload(%L, %L)', 'a1', pg_temp.path((select id from bt), 'a1', 12)),
  '42501', null, 'after a block in a bounty thread the blocked side cannot upload'
);
select is(pg_temp.visible('b2', pg_temp.path((select id from bt), 'a1', 1)), 1::bigint,
  'the history''s images stay readable after a block');

reset role;
select pg_temp.act_as(pg_temp.u('a1'));
select public.publish_ride(
  'a2000000-0000-4000-8000-000000000007', 'Sunway Geo', '双威', 3.0733, 101.6078, 'KLIA2', 'KLIA2', 2.7456, 101.7113,
  now() + interval '3 hours', 6, 'MYR'
);
select pg_temp.act_as(pg_temp.u('c3'));
select public.request_ride('a2000000-0000-4000-8000-000000000007');
select pg_temp.act_as(pg_temp.u('d4'));
select public.request_ride('a2000000-0000-4000-8000-000000000007');
select pg_temp.act_as(pg_temp.u('a1'));
select public.decide_ride_request('a2000000-0000-4000-8000-000000000007', pg_temp.u('c3'), true);
select public.decide_ride_request('a2000000-0000-4000-8000-000000000007', pg_temp.u('d4'), true);

create temp table rt as
select t.id from public.threads t where t.ride_id = 'a2000000-0000-4000-8000-000000000007';
grant select on rt to authenticated;

set local role authenticated;
select pg_temp.upload('c3', pg_temp.path((select id from rt), 'c3', 20));
select pg_temp.send_image('c3', (select id from rt), 20);
select pg_temp.upload('c3', pg_temp.path((select id from rt), 'c3', 21));
select pg_temp.send_image('c3', (select id from rt), 21);
select pg_temp.upload('d4', pg_temp.path((select id from rt), 'd4', 22));

select pg_temp.act_as(pg_temp.u('a1'));
select public.block_user(pg_temp.u('d4'));
select pg_temp.upload('a1', pg_temp.path((select id from rt), 'a1', 23));
select is(
  (pg_temp.send_image('a1', (select id from rt), 23) ->> 'clientId')::uuid, pg_temp.c(23),
  'in a ride group a block does not stop images (group block rule)'
);

select pg_temp.act_as(pg_temp.u('d4'));
select public.leave_ride('a2000000-0000-4000-8000-000000000007');
select throws_ok(
  format('select pg_temp.upload(%L, %L)', 'd4', pg_temp.path((select id from rt), 'd4', 24)),
  '42501', null, 'a member who left cannot upload'
);
select is(pg_temp.visible('d4', pg_temp.path((select id from rt), 'c3', 20)), 1::bigint,
  'a member who left still reads images sent before leaving');
select pg_temp.upload('c3', pg_temp.path((select id from rt), 'c3', 25));
select pg_temp.send_image('c3', (select id from rt), 25);
select is(pg_temp.visible('d4', pg_temp.path((select id from rt), 'c3', 25)), 0::bigint,
  'a member who left cannot read images sent after leaving');

select pg_temp.act_as(pg_temp.u('a1'));
select isnt(
  public.report(null, (select m.id from public.messages m where m.client_id = pg_temp.c(20)), 'inappropriate', null) ->> 'id',
  null, 'a member reports an image message'
);

reset role;
select is(
  (select array[r.message_image_path, coalesce(r.message_body, 'null')] from public.reports r
   where r.message_id = (select m.id from public.messages m where m.client_id = pg_temp.c(20))),
  array[pg_temp.path((select id from rt), 'c3', 20), 'null'],
  'the report snapshots the image path, and an image-only message leaves no body'
);
select is(
  (select q.message_image_path from private.report_queue q where q.message_image_path is not null),
  pg_temp.path((select id from rt), 'c3', 20), 'the report queue shows the snapshot image'
);

select is(
  (select count(*) from public.chat_images_to_delete()), 0::bigint,
  'nothing is swept while every object is referenced or still within its grace'
);
select is(
  (select array_agg(object_name order by object_name) from public.chat_images_to_delete(interval '0 seconds')),
  array[pg_temp.path((select id from rt), 'd4', 22)], 'an upload whose message was never stored is swept after the grace'
);

update public.rides set status = 'cancelled' where id = 'a2000000-0000-4000-8000-000000000007';
select pg_temp.act_as(pg_temp.u('c3'));
delete from auth.users where id = pg_temp.u('c3');
select is((select count(*) from public.messages m where m.sender_id = pg_temp.u('c3')), 0::bigint,
  'account deletion removes the user''s messages');
select is(
  (select array_agg(object_name order by object_name) from public.chat_images_to_delete(interval '0 seconds')),
  (select array_agg(p order by p) from unnest(array[
    pg_temp.path((select id from rt), 'c3', 21), pg_temp.path((select id from rt), 'c3', 25),
    pg_temp.path((select id from rt), 'd4', 22)
  ]) p),
  'a deleted account''s images are swept, except the one a report keeps as evidence'
);

update public.reports set created_at = now() - interval '1 year 1 minute' where message_image_path is not null;
select is(public.expire_report_snapshots(), 1, 'the yearly cleanup clears the snapshot image with the body');
select is(
  (select count(*) from public.chat_images_to_delete(interval '0 seconds')
   where object_name = pg_temp.path((select id from rt), 'c3', 20)),
  1::bigint, 'once the snapshot is cleared its image is swept too'
);

set local role authenticated;
select throws_ok('select public.chat_images_to_delete()', '42501', null, 'clients cannot list objects to delete');

select * from finish();
rollback;
