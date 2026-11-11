-- The 问小貘 sheet sends one task, `ask`, and the model picks the tool; metering records the task the app asked for.
alter table public.ai_metering drop constraint ai_metering_task_check;
alter table public.ai_metering
  add constraint ai_metering_task_check check (task in ('draft_bounty', 'answer', 'translate', 'ask'));
