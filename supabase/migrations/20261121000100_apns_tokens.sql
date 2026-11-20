-- Tokens are native APNs device tokens (hex) with the APNs environment the app was signed for. NOT VALID keeps any
-- earlier Expo-format row; APNs answers it BadDeviceToken and notify drops it like any unregistered token.
alter table public.push_tokens
  drop constraint push_tokens_token_check,
  add constraint push_tokens_token_check check (token ~ '^[0-9a-f]{64,200}$') not valid,
  add column environment text not null default 'production' check (environment in ('sandbox', 'production'));

drop function public.register_push_token(text, text);

create function public.register_push_token(token text, language text, environment text) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  device text := lower(register_push_token.token);
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if language is null or language not in ('zh-Hans', 'en', 'ms') then
    raise exception 'invalid_language' using errcode = '22023';
  end if;
  if environment is null or environment not in ('sandbox', 'production') then
    raise exception 'invalid_push_environment' using errcode = '22023';
  end if;
  if device is null or device !~ '^[0-9a-f]{64,200}$' then
    raise exception 'invalid_push_token' using errcode = '22023';
  end if;
  insert into public.push_tokens as t (token, user_id, language, environment)
  values (device, uid, register_push_token.language, register_push_token.environment)
  on conflict on constraint push_tokens_pkey do update
    set user_id = excluded.user_id, language = excluded.language, environment = excluded.environment,
      updated_at = now();
  delete from public.push_tokens t
  where t.user_id = uid and t.token in (
    select x.token from public.push_tokens x where x.user_id = uid order by x.updated_at desc offset 10
  );
end;
$$;

-- An update re-checks a NOT VALID constraint, so a language change skips any legacy row instead of failing on it.
create or replace function public.set_push_language(language text) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  changed integer;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if language is null or language not in ('zh-Hans', 'en', 'ms') then
    raise exception 'invalid_language' using errcode = '22023';
  end if;
  update public.push_tokens t set language = set_push_language.language, updated_at = now()
  where t.user_id = uid and t.token ~ '^[0-9a-f]{64,200}$';
  get diagnostics changed = row_count;
  return changed;
end;
$$;

create or replace function public.unregister_push_token(token text) returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_tokens t
  where t.token = lower(unregister_push_token.token) and t.user_id = (select auth.uid());
$$;

create or replace function public.claim_due_pushes(max_rows integer default 100) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  answer jsonb;
begin
  perform private.mark_stalled_pushes();

  with due as (
    select q.id from public.push_queue q
    where q.sent_at is null and q.failed_at is null and q.attempts < 2 and q.send_at <= now()
      and (q.claimed_at is null or q.claimed_at < now() - interval '5 minutes')
    order by q.send_at, q.id
    limit greatest(1, least(coalesce(max_rows, 100), 500))
    for update skip locked
  ),
  claimed as (
    update public.push_queue q set claimed_at = now(), attempts = q.attempts + 1
    from due where q.id = due.id
    returning q.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'queueId', c.id,
    'kind', c.kind,
    'subjectId', c.subject_id,
    'threadId', c.thread_id,
    'actorName', (select p.display_name from public.profiles p where p.id = e.actor_id),
    'subject', coalesce(private.push_subject(c.kind, c.subject_id), '{}'::jsonb),
    'tokens', coalesce((
      select jsonb_agg(
        jsonb_build_object('token', t.token, 'language', t.language, 'environment', t.environment)
        order by t.updated_at desc
      )
      from public.push_tokens t where t.user_id = c.recipient
    ), '[]'::jsonb)
  ) order by c.send_at, c.id), '[]'::jsonb)
  into answer
  from claimed c
  join public.events e on e.id = c.event_id;
  return answer;
end;
$$;

revoke all on function public.register_push_token(text, text, text) from public, anon, authenticated;
grant execute on function public.register_push_token(text, text, text) to authenticated;
