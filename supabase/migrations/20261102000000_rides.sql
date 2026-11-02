create type public.ride_status as enum (
  'open', 'gathering', 'departed', 'arrived', 'settling', 'closed', 'cancelled', 'expired'
);
create type public.ride_split_mode as enum ('tapiro', 'grab');
create type public.ride_member_status as enum (
  'requested', 'accepted', 'declined', 'withdrawn', 'left', 'boarded', 'no_show', 'appealed'
);
create type public.place_kind as enum ('airport', 'mall', 'campus', 'home');
create type public.ride_event_kind as enum (
  'published', 'requested', 'withdrawn', 'approved', 'declined', 'left', 'cancelled', 'gathering', 'expired',
  'arrived', 'arrival_undone', 'late', 'time_revised', 'details_changed', 'split_mode_changed', 'departed',
  'no_show', 'appealed', 'appeal_confirmed', 'reached', 'split_sent', 'receipt_set', 'share_disputed',
  'share_changed', 'settled'
);

create table public.place_short_names (
  pattern text primary key check (
    char_length(pattern) between 2 and 60 and pattern = btrim(lower(pattern)) and pattern !~ '\s\s'
  ),
  short_name text not null check (short_name = btrim(short_name) and char_length(short_name) between 1 and 8),
  kind public.place_kind
);

insert into public.place_short_names (pattern, short_name, kind)
values
  ('klia', 'KLIA', 'airport'),
  ('klia1', 'KLIA', 'airport'),
  ('klia terminal 1', 'KLIA', 'airport'),
  ('kuala lumpur international airport', 'KLIA', 'airport'),
  ('klia2', 'KLIA2', 'airport'),
  ('klia 2', 'KLIA2', 'airport'),
  ('klia terminal 2', 'KLIA2', 'airport'),
  ('kuala lumpur international airport terminal 2', 'KLIA2', 'airport'),
  ('sultan abdul aziz shah airport', '梳邦机场', 'airport'),
  ('subang airport', '梳邦机场', 'airport'),
  ('sunway geo', '双威', 'home'),
  ('sunway pyramid', '双威金字塔', 'mall'),
  ('sunway university', '双威大学', 'campus'),
  ('mid valley megamall', '谷中城', 'mall'),
  ('mid valley', '谷中城', 'mall'),
  ('pavilion kuala lumpur', '柏威年', 'mall'),
  ('pavilion kl', '柏威年', 'mall'),
  ('taylor''s university', '泰莱大学', 'campus'),
  ('monash university malaysia', '蒙纳士', 'campus'),
  ('asia pacific university', 'APU', 'campus'),
  ('cyberjaya', '赛城', null);

create table public.rides (
  id uuid primary key,
  organiser_id uuid references auth.users (id) on delete set null,
  start_point extensions.geography(Point, 4326) not null,
  start_label text not null check (char_length(btrim(start_label)) between 1 and 80),
  start_short text not null check (start_short = btrim(start_short) and char_length(start_short) between 1 and 8),
  start_kind public.place_kind,
  dest_point extensions.geography(Point, 4326) not null,
  dest_label text not null check (char_length(btrim(dest_label)) between 1 and 80),
  dest_short text not null check (dest_short = btrim(dest_short) and char_length(dest_short) between 1 and 8),
  dest_kind public.place_kind,
  depart_at timestamptz not null,
  revised_at timestamptz,
  seats smallint not null default 4 check (seats between 2 and 6),
  currency char(3) not null references public.currencies (code),
  estimate_minor bigint,
  total_minor bigint,
  split_mode public.ride_split_mode not null default 'tapiro',
  flight_departs_at timestamptz,
  large_bags smallint check (large_bags between 0 and 9),
  status public.ride_status not null default 'open',
  settled_at timestamptz,
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rides_settled check ((settled_at is not null) = (status = 'closed')),
  constraint rides_total check (total_minor is null or status in ('settling', 'closed'))
);

-- 0.001 degrees is about 110 m: what a non-member may learn about where a ride starts and ends.
alter table public.rides
  add column start_public extensions.geography(Point, 4326)
    generated always as (extensions.st_snaptogrid(start_point::extensions.geometry, 0.001)::extensions.geography) stored,
  add column dest_public extensions.geography(Point, 4326)
    generated always as (extensions.st_snaptogrid(dest_point::extensions.geometry, 0.001)::extensions.geography) stored;

create index rides_open_start on public.rides using gist (start_public) where status in ('open', 'gathering');
create index rides_open_depart on public.rides (coalesce(revised_at, depart_at)) where status in ('open', 'gathering');
create index rides_organiser on public.rides (organiser_id, status);

create trigger rides_set_updated_at
  before update on public.rides
  for each row execute function public.set_updated_at();

create function private.rides_money_within_limits() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.estimate_minor is not null and not private.within_post_limits('ride', new.estimate_minor, new.currency))
    or (new.total_minor is not null and not private.within_post_limits('ride', new.total_minor, new.currency))
  then
    raise exception 'invalid_ride' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.rides_money_within_limits() from public, anon, authenticated;

create trigger rides_money_within_limits
  before insert or update of estimate_minor, total_minor, currency on public.rides
  for each row execute function private.rides_money_within_limits();

create table public.ride_details (
  ride_id uuid primary key references public.rides (id) on delete cascade,
  meeting_note text check (char_length(meeting_note) between 1 and 140),
  plate text check (char_length(btrim(plate)) between 1 and 40),
  eta timestamptz
);

create table public.ride_receipts (
  ride_id uuid primary key references public.rides (id) on delete cascade,
  proof_path text not null check (char_length(proof_path) between 1 and 200),
  created_at timestamptz not null default now()
);

create table public.ride_members (
  ride_id uuid not null references public.rides (id) on delete cascade,
  member_id uuid not null references auth.users (id) on delete cascade,
  status public.ride_member_status not null default 'requested',
  note text check (char_length(note) between 1 and 140),
  arrived_at timestamptz,
  late_until timestamptz,
  share_minor bigint check (share_minor >= 0),
  payment_id uuid references public.payments (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (ride_id, member_id)
);

create index ride_members_member on public.ride_members (member_id, status);
create index ride_members_ride_status on public.ride_members (ride_id, status);

create trigger ride_members_set_updated_at
  before update on public.ride_members
  for each row execute function public.set_updated_at();

create table public.ride_events (
  id bigint generated always as identity primary key,
  ride_id uuid not null references public.rides (id) on delete cascade,
  kind public.ride_event_kind not null,
  actor_id uuid references auth.users (id) on delete set null,
  member_id uuid references auth.users (id) on delete set null,
  from_status public.ride_status,
  to_status public.ride_status,
  at timestamptz,
  minor bigint,
  note text check (char_length(note) between 1 and 140),
  created_at timestamptz not null default now()
);

create index ride_events_ride on public.ride_events (ride_id, created_at);

insert into public.post_limits (item_kind, currency, min_minor, max_minor, step_minor)
values ('ride', 'MYR', 100, 100000, 1), ('ride', 'CNY', 100, 160000, 1);

create function private.ride_departs_at(r public.rides) returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select coalesce(r.revised_at, r.depart_at);
$$;

create function private.ride_phase(r public.rides) returns public.ride_status
language sql
stable
set search_path = ''
as $$
  select case
    when r.status in ('open', 'gathering') and now() >= private.ride_departs_at(r) + interval '2 hours'
      then 'expired'
    when r.status = 'open' and now() >= private.ride_departs_at(r) - interval '30 minutes' then 'gathering'
    else r.status
  end::public.ride_status;
$$;

create function private.normalise_place(name text) returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(translate(lower(normalize(name, NFKC)), '‘’`', ''''''''), '\s+', ' ', 'g'));
$$;

create function private.place_kind(name text) returns public.place_kind
language sql
stable
set search_path = ''
as $$
  select s.kind from public.place_short_names s
  where strpos(private.normalise_place(name), s.pattern) > 0
  order by char_length(s.pattern) desc, s.pattern
  limit 1;
$$;

create function private.is_ride_member(ride uuid, uid uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.ride_members m
    where m.ride_id = ride and m.member_id = uid and m.status in ('accepted', 'boarded', 'no_show', 'appealed')
  );
$$;

create function private.is_ride_boarded(ride uuid, uid uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.ride_members m where m.ride_id = ride and m.member_id = uid and m.status = 'boarded'
  );
$$;

create function private.has_ride_row(ride uuid, uid uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.ride_members m where m.ride_id = ride and m.member_id = uid);
$$;

create function private.ride_organiser(ride uuid) returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select r.organiser_id from public.rides r where r.id = ride;
$$;

revoke all on function private.ride_departs_at(public.rides) from public, anon, authenticated;
revoke all on function private.ride_phase(public.rides) from public, anon, authenticated;
revoke all on function private.normalise_place(text) from public, anon, authenticated;
revoke all on function private.place_kind(text) from public, anon, authenticated;
revoke all on function private.is_ride_member(uuid, uuid) from public, anon, authenticated;
revoke all on function private.is_ride_boarded(uuid, uuid) from public, anon, authenticated;
revoke all on function private.has_ride_row(uuid, uuid) from public, anon, authenticated;
revoke all on function private.ride_organiser(uuid) from public, anon, authenticated;
grant execute on function private.is_ride_member(uuid, uuid) to authenticated, service_role;
grant execute on function private.is_ride_boarded(uuid, uuid) to authenticated, service_role;
grant execute on function private.has_ride_row(uuid, uuid) to authenticated, service_role;
grant execute on function private.ride_organiser(uuid) to authenticated, service_role;

alter table public.place_short_names enable row level security;
alter table public.rides enable row level security;
alter table public.ride_details enable row level security;
alter table public.ride_receipts enable row level security;
alter table public.ride_members enable row level security;
alter table public.ride_events enable row level security;

revoke all on public.place_short_names, public.rides, public.ride_details, public.ride_receipts,
  public.ride_members, public.ride_events from anon, authenticated;

grant select on public.place_short_names to anon, authenticated;
grant select (id, organiser_id, start_label, start_short, start_kind, dest_label, dest_short, dest_kind, depart_at, revised_at, seats, currency, estimate_minor, total_minor, split_mode, flight_departs_at,
  large_bags, status, settled_at, status_changed_at, created_at, updated_at) on public.rides to authenticated;
grant select on public.ride_details, public.ride_receipts to authenticated;
grant select (ride_id, member_id, status, arrived_at, late_until, created_at, updated_at)
  on public.ride_members to authenticated;

create policy place_short_names_select on public.place_short_names
  for select to anon, authenticated
  using (true);

create policy rides_select on public.rides
  for select to authenticated
  using (
    organiser_id = (select auth.uid())
    or private.is_ride_member(id, (select auth.uid()))
    or (
      not private.is_blocked_between((select auth.uid()), organiser_id)
      and (status in ('open', 'gathering') or private.has_ride_row(id, (select auth.uid())))
    )
  );

create policy ride_details_select on public.ride_details
  for select to authenticated
  using (
    private.ride_organiser(ride_id) = (select auth.uid()) or private.is_ride_member(ride_id, (select auth.uid()))
  );

create policy ride_receipts_select on public.ride_receipts
  for select to authenticated
  using (
    private.ride_organiser(ride_id) = (select auth.uid()) or private.is_ride_boarded(ride_id, (select auth.uid()))
  );

create policy ride_members_select on public.ride_members
  for select to authenticated
  using (
    member_id = (select auth.uid())
    or (
      private.ride_organiser(ride_id) = (select auth.uid())
      and not private.is_blocked_between((select auth.uid()), member_id)
    )
    or (
      status in ('accepted', 'boarded', 'no_show', 'appealed')
      and private.is_ride_member(ride_id, (select auth.uid()))
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ride-receipts', 'ride-receipts', false, 5242880, array['image/jpeg', 'image/png', 'image/heic']);

create policy ride_receipts_insert_organiser on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ride-receipts' and exists (
      select 1 from public.rides r
      where r.id::text = (storage.foldername(name))[1]
        and r.organiser_id = (select auth.uid())
        and r.status in ('arrived', 'settling')
    )
  );

create policy ride_receipts_select_boarded on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ride-receipts' and exists (
      select 1 from public.ride_receipts rr
      where rr.ride_id::text = (storage.foldername(name))[1] and rr.proof_path = storage.objects.name
    )
  );

create policy ride_receipts_select_uploader on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ride-receipts' and exists (
      select 1 from public.rides r
      where r.id::text = (storage.foldername(name))[1] and r.organiser_id = (select auth.uid())
    )
  );
