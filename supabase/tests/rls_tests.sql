-- Tests RLS / crédits. À lancer sur une base LOCALE (supabase start) :
--   psql "$LOCAL_DB_URL" -f supabase/tests/rls_tests.sql
-- Tout est annulé à la fin (ROLLBACK). Une erreur = un test échoué.
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.local', '{"full_name":"Alice","country_code":"ci"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.local', '{"full_name":"Bob","country_code":"BF"}');

do $$
declare n int; ok boolean;
begin
  -- 1. trigger d'inscription : profil + 2 crédits + 1 ligne signup_bonus
  select credits into n from public.profiles where id = '00000000-0000-0000-0000-0000000000a1';
  assert n = 2, 'bonus de bienvenue manquant';
  assert (select country_code from public.profiles where id = '00000000-0000-0000-0000-0000000000a1') = 'CI', 'pays non normalisé';
  assert (select count(*) from public.credit_transactions where reason = 'signup_bonus') = 2, 'journal bonus incorrect';

  -- 2. add_credits idempotent
  insert into public.credit_packs (id, name, credits, price_xof, price_eur) values
    ('00000000-0000-0000-0000-00000000f001', 'T', 5, 2500, 3.9);
  insert into public.payments (id, user_id, pack_id, credits, provider, amount, currency, status) values
    ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000a1',
     '00000000-0000-0000-0000-00000000f001', 5, 'saspay', 2500, 'XOF', 'paid');
  assert public.add_credits('00000000-0000-0000-0000-0000000000a1', 5, 'purchase', '00000000-0000-0000-0000-00000000e001') = true;
  assert public.add_credits('00000000-0000-0000-0000-0000000000a1', 5, 'purchase', '00000000-0000-0000-0000-00000000e001') = false, 'double crédit !';
  assert (select credits from public.profiles where id = '00000000-0000-0000-0000-0000000000a1') = 7;

  -- 3. consommation + remboursement (une seule fois)
  insert into public.generations (id, user_id, mode) values
    ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-0000000000a1', 'topic');
  assert public.consume_credit('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000c001') = true;
  assert public.consume_credit('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000c001') = false, 'double consommation';
  assert (select credits from public.profiles where id = '00000000-0000-0000-0000-0000000000a1') = 6;
  assert public.refund_generation('00000000-0000-0000-0000-00000000c001') = true;
  assert public.refund_generation('00000000-0000-0000-0000-00000000c001') = false, 'double remboursement';
  assert (select credits from public.profiles where id = '00000000-0000-0000-0000-0000000000a1') = 7;

  -- 4. solde à 0 : refus
  update public.profiles set credits = 0 where id = '00000000-0000-0000-0000-0000000000b2';
  insert into public.generations (id, user_id, mode) values
    ('00000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-0000000000b2', 'topic');
  begin
    perform public.consume_credit('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000c002');
    raise exception 'consume_credit aurait dû refuser';
  exception when others then
    assert sqlerrm like '%INSUFFICIENT_CREDITS%', 'mauvaise erreur: ' || sqlerrm;
  end;
end $$;

-- 5. côté client : Alice (authenticated)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  -- ne voit que sa ligne
  assert (select count(*) from public.profiles) = 1, 'fuite de profils';
  assert (select count(*) from public.generations) = 1, 'fuite de générations (Bob visible ?)';
  assert (select count(*) from public.credit_transactions where user_id <> auth.uid()) = 0, 'fuite du journal';
  -- ne peut pas se donner des crédits
  begin
    update public.profiles set credits = 999 where id = auth.uid();
    raise exception 'UPDATE credits aurait dû être refusé';
  exception when insufficient_privilege then null; end;
  -- ne peut pas appeler les fonctions de crédits
  begin
    perform public.add_credits(auth.uid(), 100, 'admin', null);
    raise exception 'add_credits aurait dû être refusé';
  exception when insufficient_privilege then null; end;
  -- ne peut pas s'attribuer le rôle admin ni insérer un paiement
  begin
    insert into public.user_roles (user_id, role) values (auth.uid(), 'admin');
    raise exception 'insert user_roles aurait dû être refusé';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.payments (user_id, pack_id, credits, provider, amount, currency, status)
    values (auth.uid(), '00000000-0000-0000-0000-00000000f001', 5, 'saspay', 1, 'XOF', 'paid');
    raise exception 'insert payments aurait dû être refusé';
  exception when insufficient_privilege then null; end;
  -- les fonctions admin / maintenance ne sont pas appelables par un utilisateur
  begin
    perform public.admin_stats();
    raise exception 'admin_stats aurait dû être refusé';
  exception when insufficient_privilege then null; end;
  begin
    perform public.list_orphan_reverse_inputs();
    raise exception 'list_orphan_reverse_inputs aurait dû être refusé';
  exception when insufficient_privilege then null; end;
  -- api_usage invisible pour un non-admin
  assert (select count(*) from public.api_usage) = 0;
  -- peut modifier son nom
  update public.profiles set full_name = 'Alice B.' where id = auth.uid();
end $$;

reset role;
rollback;
