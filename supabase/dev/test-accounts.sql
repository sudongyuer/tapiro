-- Local development only: applied by `bun run db:test-accounts`, never by seed.sql, CI or pgTAP.
-- Emails, names and the password must match src/features/account/testAccounts.ts.
-- One DO block because `supabase db query` runs a single prepared statement.
do $$
declare
  a record;
begin
  for a in
    select * from (values
      ('7e570000-0000-4000-8000-00000000a001'::uuid, 'xiaolin@tapiro.test', '小林', '+60123450001'),
      ('7e570000-0000-4000-8000-00000000a002'::uuid, 'aming@tapiro.test', '阿明', '+60123450002')
    ) as t (id, email, name, phone)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    )
    values (
      '00000000-0000-0000-0000-000000000000', a.id, 'authenticated', 'authenticated', a.email,
      extensions.crypt('tapiro-dev-only', extensions.gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb, jsonb_build_object('full_name', a.name), now(), now(),
      '', '', '', '', '', '', '', ''
    )
    on conflict (id) do update set
      email = excluded.email,
      encrypted_password = excluded.encrypted_password,
      email_confirmed_at = coalesce(auth.users.email_confirmed_at, excluded.email_confirmed_at),
      raw_user_meta_data = auth.users.raw_user_meta_data || excluded.raw_user_meta_data,
      banned_until = null,
      deleted_at = null,
      updated_at = now();

    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      a.id::text, a.id,
      jsonb_build_object('sub', a.id::text, 'email', a.email, 'email_verified', true, 'phone_verified', false),
      'email', now(), now(), now()
    )
    on conflict (provider_id, provider) do update set identity_data = excluded.identity_data, updated_at = now();

    insert into public.profiles (id, display_name) values (a.id, a.name)
    on conflict (id) do update set display_name = excluded.display_name;

    if not exists (select 1 from public.payee_methods m where m.user_id = a.id and m.type <> 'cash') then
      insert into public.payee_methods (user_id, type, phone, display_name)
      values (a.id, 'duitnow_id', a.phone, a.name);
    end if;
    if not exists (select 1 from public.payee_methods m where m.user_id = a.id and m.type = 'cash') then
      insert into public.payee_methods (user_id, type) values (a.id, 'cash');
    end if;
  end loop;
end;
$$;
