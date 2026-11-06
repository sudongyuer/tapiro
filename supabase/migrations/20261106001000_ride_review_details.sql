-- The one switch for ride reviews on someone else's profile: false hides the route (a short name can be a home) and
-- the reviewer (who rode with whom); true shows both to everyone. The reviewee always sees both.
create function private.ride_review_details_public() returns boolean
language sql
immutable
set search_path = ''
as $$
  select false;
$$;

revoke all on function private.ride_review_details_public() from public, anon, authenticated;

create or replace function private.public_review_json(v public.reviews) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with shown as (
    select v.item_kind = 'bounty'
      or v.reviewee_id = (select auth.uid())
      or private.ride_review_details_public() as details
  )
  select private.review_json(v) || jsonb_build_object(
    'kind', v.item_kind,
    'role', v.reviewee_role,
    'title', case when shown.details then private.item_title(v.item_kind, v.item_id) end,
    'reviewer', case when shown.details then private.person_json(v.reviewer_id) end
  )
  from shown;
$$;

revoke all on function private.public_review_json(public.reviews) from public, anon, authenticated;
