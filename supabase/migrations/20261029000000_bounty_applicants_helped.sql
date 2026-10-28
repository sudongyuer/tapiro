create or replace function public.bounty_applicants(bounty uuid) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b public.bounties;
begin
  select * into b from public.bounties where id = bounty;
  if not found then
    raise exception 'bounty_not_found' using errcode = 'P0002';
  end if;
  if b.poster_id is distinct from uid then
    raise exception 'not_poster' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'applicantId', a.applicant_id,
      'name', private.bounty_person_name(a.applicant_id),
      'tier', public.reputation_tier(a.applicant_id),
      'note', a.note,
      'status', a.status,
      'appliedAt', a.created_at,
      'helpedCount', (
        select count(*)::integer
        from public.payments p
        where p.item_kind = 'bounty'
          and p.payee_id = a.applicant_id
          and p.state = 'settled'
          and p.reverses is null
          and not exists (
            select 1 from public.payments r where r.reverses = p.id and r.state = 'settled'
          )
      )
    ) order by a.created_at, a.applicant_id), '[]'::jsonb)
    from public.bounty_applications a
    where a.bounty_id = b.id
      and a.status in ('pending', 'selected')
      and not private.is_blocked_between(uid, a.applicant_id)
  );
end;
$$;

revoke all on function public.bounty_applicants(uuid) from public, anon, authenticated;
grant execute on function public.bounty_applicants(uuid) to authenticated;
