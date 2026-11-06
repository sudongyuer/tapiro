insert into private.event_kinds (kind, push) values ('bounty.reviewed', false), ('ride.reviewed', false);

create function private.review_signal_kind(kind public.payment_item_kind) returns text
language sql
immutable
set search_path = ''
as $$
  select case kind when 'bounty' then 'bounty.reviewed' else 'ride.reviewed' end;
$$;

revoke all on function private.review_signal_kind(public.payment_item_kind) from public, anon, authenticated;

-- A first submit tells only the reviewee; a reveal tells both sides (no actor), so the submitter's other devices
-- reload too. A pair revealed by its second submit updates both rows at once and signals from one of them, and that
-- submit's insert signals nothing because the reveal follows in the same call.
create function private.signal_review() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  answered boolean := exists (
    select 1 from public.reviews t
    where t.item_kind = new.item_kind and t.item_id = new.item_id
      and t.reviewer_id = new.reviewee_id and t.reviewee_id = new.reviewer_id
  );
begin
  if tg_op = 'INSERT' and new.revealed_at is null and not answered then
    perform private.emit_event(
      array[new.reviewee_id], private.review_signal_kind(new.item_kind), new.item_id, new.reviewer_id
    );
  elsif tg_op = 'UPDATE' and old.revealed_at is null and new.revealed_at is not null
    and (not answered or new.reviewer_id < new.reviewee_id)
  then
    perform private.emit_event(
      array[new.reviewer_id, new.reviewee_id], private.review_signal_kind(new.item_kind), new.item_id, null
    );
  end if;
  return null;
end;
$$;

revoke all on function private.signal_review() from public, anon, authenticated;

create trigger reviews_signal
  after insert or update of revealed_at on public.reviews
  for each row execute function private.signal_review();
