-- No foreign keys to the reported thing: its report must stay out of reports_person_once when it is deleted. Deleting a
-- reviewee removes the review but not the target, and a message's sender may still be the target when the cascade nulls
-- message_id, so a nulled id would collide with the next report on that person and block the account deletion.
alter table public.reports drop constraint reports_message_id_fkey;

alter table public.reports
  add column review_id uuid,
  add column review_face public.review_face,
  add column review_chips text[],
  add column review_sentence text,
  add constraint reports_one_subject check (message_id is null or review_id is null);

drop index public.reports_person_once;
create unique index reports_person_once on public.reports (reporter_id, target_id)
where message_id is null and review_id is null;
create unique index reports_review_once on public.reports (reporter_id, review_id) where review_id is not null;

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
    'reviewer', case when shown.details then private.person_json(v.reviewer_id) end,
    'reviewerBlockedByMe', shown.details and exists (
      select 1 from public.blocks b where b.blocker_id = (select auth.uid()) and b.blocked_id = v.reviewer_id
    ),
    'reportable', v.reviewer_id is distinct from (select auth.uid())
  )
  from shown;
$$;

revoke all on function private.public_review_json(public.reviews) from public, anon, authenticated;

drop function public.report(uuid, uuid, text, text);

create function public.report(
  target_user uuid,
  message uuid default null,
  reason text default null,
  note text default null,
  review uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  cleaned text := nullif(btrim(note), '');
  m public.messages;
  v public.reviews;
  target uuid := target_user;
  stored uuid;
begin
  if reason is not null and reason not in ('harassment', 'off_platform_payment', 'inappropriate', 'other') then
    raise exception 'invalid_report' using errcode = '22023';
  end if;
  if char_length(cleaned) > 500 then
    raise exception 'invalid_report' using errcode = '22023';
  end if;
  if review is not null then
    -- A ride review's author can be hidden from the reporter (256 A): accepting a named target would answer who wrote it.
    if target is not null or message is not null then
      raise exception 'invalid_report' using errcode = '22023';
    end if;
    select * into v from public.reviews x where x.id = review and x.shown_at <= now();
    if not found then
      raise exception 'review_not_found' using errcode = 'P0002';
    end if;
    target := v.reviewer_id;
  elsif message is not null then
    select * into m from public.messages x where x.id = message;
    if not found or m.created_at > coalesce(private.thread_visible_until(m.thread_id), '-infinity'::timestamptz) then
      raise exception 'message_not_found' using errcode = 'P0002';
    end if;
    if target is not null and target <> m.sender_id then
      raise exception 'invalid_report' using errcode = '22023';
    end if;
    target := m.sender_id;
  elsif target is null or not exists (select 1 from public.profiles p where p.id = target) then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  if target = uid then
    raise exception 'cannot_report_self' using errcode = '22023';
  end if;
  insert into public.reports (
    reporter_id, target_id, message_id, thread_id, reason, note, message_body, message_sent_at, message_image_path,
    review_id, review_face, review_chips, review_sentence
  )
  values (
    uid, target, m.id, m.thread_id, reason, cleaned, nullif(m.body, ''), m.created_at, m.image_path,
    v.id, v.face, v.chips, v.sentence
  )
  on conflict do nothing
  returning id into stored;
  if stored is null then
    select r.id into stored from public.reports r
    where r.reporter_id = uid and r.target_id = target and r.message_id is not distinct from m.id
      and r.review_id is not distinct from v.id;
  end if;
  return jsonb_build_object('id', stored);
end;
$$;

revoke all on function public.report(uuid, uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.report(uuid, uuid, text, text, uuid) to authenticated;

create or replace view private.report_queue as
select
  r.id, r.created_at, r.reason, r.note,
  r.reporter_id, reporter.display_name as reporter_name,
  r.target_id, target.display_name as target_name,
  r.thread_id, t.bounty_id, t.ride_id,
  r.message_id, r.message_body, r.message_sent_at, r.message_image_path,
  r.review_id, r.review_face, r.review_chips, r.review_sentence,
  v.reviewee_id, reviewee.display_name as reviewee_name, v.item_kind as review_item_kind, v.item_id as review_item_id
from public.reports r
left join public.profiles reporter on reporter.id = r.reporter_id
left join public.profiles target on target.id = r.target_id
left join public.threads t on t.id = r.thread_id
left join public.reviews v on v.id = r.review_id
left join public.profiles reviewee on reviewee.id = v.reviewee_id
order by r.created_at desc;

revoke all on private.report_queue from public, anon, authenticated;
grant select on private.report_queue to service_role;

create or replace function public.expire_report_snapshots() returns integer
language sql
security definer
set search_path = ''
as $$
  with cleared as (
    update public.reports r
    set message_body = null, message_sent_at = null, message_image_path = null,
      review_face = null, review_chips = null, review_sentence = null
    where r.created_at < now() - interval '1 year'
      and (
        r.message_body is not null or r.message_sent_at is not null or r.message_image_path is not null
        or r.review_face is not null or r.review_chips is not null or r.review_sentence is not null
      )
    returning 1
  )
  select count(*)::integer from cleared;
$$;

revoke all on function public.expire_report_snapshots() from public, anon, authenticated;
