create extension if not exists postgis with schema extensions;

create type public.bounty_status as enum (
  'open', 'assigned', 'en_route', 'done', 'disputed', 'confirmed', 'closed', 'cancelled'
);
create type public.bounty_payment_timing as enum ('after', 'before');
create type public.bounty_gate as enum ('anyone', 'reliable', 'very_reliable');
create type public.bounty_application_status as enum ('pending', 'withdrawn', 'selected', 'not_selected');
create type public.bounty_event_kind as enum (
  'published', 'applied', 'withdrawn', 'selected', 'started', 'eta_changed', 'start_reminder', 'completed',
  'problem_reported', 'confirmed', 'auto_confirmed', 'closed', 'expired', 'cancelled'
);
create type public.bounty_seen_card as enum ('not_selected', 'expired');

create table public.bounties (
  id uuid primary key,
  poster_id uuid references auth.users (id) on delete set null,
  helper_id uuid references auth.users (id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 60),
  description text check (char_length(description) between 1 and 500),
  category public.bounty_category not null,
  reward_sen integer not null check (reward_sen between 100 and 50000 and reward_sen % 100 = 0),
  place extensions.geography(Point, 4326),
  place_label text check (char_length(btrim(place_label)) between 1 and 80),
  starts_at timestamptz,
  ends_at timestamptz,
  deadline_at timestamptz,
  published_at timestamptz not null default now(),
  expires_at timestamptz not null,
  sticker_path text check (char_length(sticker_path) between 1 and 200),
  status public.bounty_status not null default 'open',
  payment_timing public.bounty_payment_timing not null default 'after' check (payment_timing = 'after'),
  gate public.bounty_gate not null default 'anyone' check (gate = 'anyone'),
  eta_at timestamptz,
  previous_eta_at timestamptz,
  done_at timestamptz,
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bounties_place_labelled check ((place is null) = (place_label is null)),
  constraint bounties_time_window check (ends_at is null or (starts_at is not null and ends_at > starts_at)),
  constraint bounties_helper check (
    case status
      when 'open' then helper_id is null
      when 'closed' then helper_id is null
      when 'cancelled' then true
      else helper_id is not null
    end
  ),
  constraint bounties_done_at check (
    case status
      when 'done' then done_at is not null
      when 'disputed' then done_at is not null
      else true
    end
  )
);

create index bounties_place on public.bounties using gist (place) where status = 'open';
create index bounties_open_expiry on public.bounties (expires_at) where status = 'open';
create index bounties_done on public.bounties (done_at) where status = 'done';
create index bounties_poster on public.bounties (poster_id, status);
create index bounties_helper on public.bounties (helper_id, status);

create trigger bounties_set_updated_at
  before update on public.bounties
  for each row execute function public.set_updated_at();

create table public.bounty_addresses (
  bounty_id uuid primary key references public.bounties (id) on delete cascade,
  address text not null check (char_length(btrim(address)) between 1 and 120)
);

create table public.bounty_applications (
  bounty_id uuid not null references public.bounties (id) on delete cascade,
  applicant_id uuid not null references auth.users (id) on delete cascade,
  note text check (char_length(note) between 1 and 140),
  status public.bounty_application_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (bounty_id, applicant_id)
);

create unique index bounty_applications_one_selected on public.bounty_applications (bounty_id)
where status = 'selected';
create index bounty_applications_applicant on public.bounty_applications (applicant_id, status);

create trigger bounty_applications_set_updated_at
  before update on public.bounty_applications
  for each row execute function public.set_updated_at();

create table public.bounty_events (
  id bigint generated always as identity primary key,
  bounty_id uuid not null references public.bounties (id) on delete cascade,
  kind public.bounty_event_kind not null,
  actor_id uuid references auth.users (id) on delete set null,
  from_status public.bounty_status,
  to_status public.bounty_status,
  eta_at timestamptz,
  previous_eta_at timestamptz,
  reason text check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

create unique index bounty_events_one_reminder on public.bounty_events (bounty_id) where kind = 'start_reminder';
create index bounty_events_bounty on public.bounty_events (bounty_id, created_at);

create table public.bounty_seen (
  user_id uuid not null references auth.users (id) on delete cascade,
  bounty_id uuid not null references public.bounties (id) on delete cascade,
  card public.bounty_seen_card not null,
  seen_at timestamptz not null default now(),
  primary key (user_id, bounty_id, card)
);

create index bounty_seen_bounty on public.bounty_seen (bounty_id);

-- Security definer so the bounties policy can read applications without recursing into their policy.
create function private.has_applied(bounty uuid, uid uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.bounty_applications where bounty_id = bounty and applicant_id = uid);
$$;

revoke all on function private.has_applied(uuid, uuid) from public, anon, authenticated;
grant execute on function private.has_applied(uuid, uuid) to authenticated, service_role;

alter table public.bounties enable row level security;
alter table public.bounty_addresses enable row level security;
alter table public.bounty_applications enable row level security;
alter table public.bounty_events enable row level security;
alter table public.bounty_seen enable row level security;

revoke all on public.bounties, public.bounty_addresses, public.bounty_applications, public.bounty_events,
  public.bounty_seen from anon, authenticated;
grant select on public.bounties, public.bounty_addresses, public.bounty_applications, public.bounty_events,
  public.bounty_seen to authenticated;

create policy bounties_select on public.bounties
  for select to authenticated
  using (
    poster_id = (select auth.uid())
    or helper_id = (select auth.uid())
    or (
      not private.is_blocked_between((select auth.uid()), poster_id)
      and (status = 'open' or private.has_applied(id, (select auth.uid())))
    )
  );

create policy bounty_addresses_select on public.bounty_addresses
  for select to authenticated
  using (
    exists (
      select 1 from public.bounties b
      where b.id = bounty_id
        and (
          b.poster_id = (select auth.uid())
          or (
            b.helper_id = (select auth.uid())
            and b.status in ('assigned', 'en_route', 'done', 'disputed', 'confirmed')
          )
        )
    )
  );

create policy bounty_applications_select on public.bounty_applications
  for select to authenticated
  using (
    applicant_id = (select auth.uid())
    or (
      exists (select 1 from public.bounties b where b.id = bounty_id and b.poster_id = (select auth.uid()))
      and not private.is_blocked_between((select auth.uid()), applicant_id)
    )
  );

create policy bounty_events_select on public.bounty_events
  for select to authenticated
  using (
    exists (
      select 1 from public.bounties b
      where b.id = bounty_id and (b.poster_id = (select auth.uid()) or b.helper_id = (select auth.uid()))
    )
  );

create policy bounty_seen_select on public.bounty_seen
  for select to authenticated
  using (user_id = (select auth.uid()));
