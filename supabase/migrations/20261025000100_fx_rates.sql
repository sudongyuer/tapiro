create table public.fx_rates (
  rate_date date primary key,
  session text not null check (session ~ '^[0-9]{4}$'),
  rm_per_cny numeric(12, 6) not null check (rm_per_cny > 0),
  fetched_at timestamptz not null default now()
);

alter table public.fx_rates enable row level security;

revoke all on public.fx_rates from anon, authenticated;
grant select on public.fx_rates to authenticated;

create policy fx_rates_select_authenticated on public.fx_rates
  for select to authenticated
  using (true);
