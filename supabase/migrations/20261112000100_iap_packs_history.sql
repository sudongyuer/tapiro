create function public.iap_packs() returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('productId', p.product_id, 'coins', p.coins) order by p.coins, p.product_id),
    '[]'::jsonb
  )
  from public.iap_products p
  where (select auth.uid()) is not null;
$$;

revoke all on function public.iap_packs() from public, anon;
grant execute on function public.iap_packs() to authenticated;

create or replace function public.coin_history(before bigint default null, max_count integer default 50) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with page as (
    select l.*, row_number() over (order by l.id desc) as n
    from public.coin_ledger l
    where l.user_id = (select auth.uid()) and (before is null or l.id < before)
    order by l.id desc
    limit least(greatest(coalesce(max_count, 50), 1), 100) + 1
  ),
  size as (select least(greatest(coalesce(max_count, 50), 1), 100) as n)
  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'reason', p.reason,
          'delta', p.delta,
          'at', p.created_at,
          'month', to_char(public.malaysia_month(p.created_at), 'YYYY-MM'),
          'item', case when p.item_id is not null then jsonb_build_object(
            'kind', p.item_kind, 'id', p.item_id, 'title', private.item_title(p.item_kind, p.item_id)
          ) end
        ) || case when p.iap_transaction_id is not null then jsonb_build_object(
          'sandbox', (
            select t.environment <> 'Production' from public.iap_transactions t
            where t.transaction_id = p.iap_transaction_id
          )
        ) else '{}'::jsonb end
        order by p.id desc
      )
      from page p where p.n <= (select n from size)
    ), '[]'::jsonb),
    'hasMore', (select count(*) from page) > (select n from size),
    'nextCursor', case when (select count(*) from page) > (select n from size) then
      (select p.id from page p where p.n = (select n from size))
    end
  )
  where (select auth.uid()) is not null;
$$;
