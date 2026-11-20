-- Projects created after 2026-10-30 give the Data API roles nothing on new public tables, so the Edge Functions'
-- service-role clients get exactly what they read and write. RPCs keep their own grants.

grant select, insert, update on public.fx_rates to service_role;

grant select (id, title, amount_minor, currency, payer_id, payee_id, state, created_at)
  on public.payments to service_role;
grant select (id, display_name) on public.profiles to service_role;
