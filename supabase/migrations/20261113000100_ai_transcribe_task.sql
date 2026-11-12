-- Voice in 问小貘 falls back to cloud speech recognition when no on-device engine can transcribe; it is metered as its
-- own task so Task 9 can price it by audio length.
alter table public.ai_metering drop constraint ai_metering_task_check;
alter table public.ai_metering
  add constraint ai_metering_task_check
  check (task in ('draft_bounty', 'answer', 'translate', 'ask', 'transcribe'));
