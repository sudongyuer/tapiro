-- 小貘 reads a ride receipt's total for the organiser's split; it is metered as its own task.
alter table public.ai_metering drop constraint ai_metering_task_check;
alter table public.ai_metering
  add constraint ai_metering_task_check
  check (task in ('draft_bounty', 'answer', 'translate', 'ask', 'transcribe', 'read_receipt'));
