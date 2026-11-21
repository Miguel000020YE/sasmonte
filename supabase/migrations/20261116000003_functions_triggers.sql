-- 0003 : fonctions métier et triggers

-- has_role : utilisée dans les policies RLS (SECURITY DEFINER pour éviter la récursion)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

-- add_credits : seul point d'entrée pour créditer/débiter hors génération. Idempotent via l'index unique.
-- Retourne false si le mouvement existait déjà (webhook rejoué).
create or replace function public.add_credits(
  _user_id uuid, _amount integer, _reason public.credit_reason, _ref uuid default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare _tx uuid;
begin
  if _amount = 0 then raise exception 'INVALID_AMOUNT'; end if;

  insert into public.credit_transactions (user_id, delta, reason, ref_id)
  values (_user_id, _amount, _reason, _ref)
  on conflict do nothing
  returning id into _tx;

  if _tx is null then return false; end if;   -- déjà appliqué

  update public.profiles set credits = credits + _amount where id = _user_id;
  if not found then raise exception 'USER_NOT_FOUND'; end if;
  -- si le solde devenait négatif, la contrainte CHECK annule toute la transaction
  return true;
end $$;

-- consume_credit : réservation atomique d'1 crédit pour une génération. Refuse si solde = 0.
create or replace function public.consume_credit(_user_id uuid, _generation_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare _tx uuid;
begin
  perform 1 from public.generations where id = _generation_id and user_id = _user_id;
  if not found then raise exception 'GENERATION_NOT_FOUND'; end if;

  insert into public.credit_transactions (user_id, delta, reason, ref_id)
  values (_user_id, -1, 'generation', _generation_id)
  on conflict do nothing
  returning id into _tx;

  if _tx is null then return false; end if;   -- crédit déjà consommé pour cette génération

  update public.profiles set credits = credits - 1 where id = _user_id and credits > 0;
  if not found then raise exception 'INSUFFICIENT_CREDITS'; end if;  -- annule aussi l'insert ci-dessus
  return true;
end $$;

-- refund_generation : rembourse 1 crédit si (et seulement si) il a été consommé, une seule fois.
create or replace function public.refund_generation(_generation_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare _uid uuid;
begin
  select user_id into _uid from public.generations where id = _generation_id;
  if _uid is null then raise exception 'GENERATION_NOT_FOUND'; end if;

  perform 1 from public.credit_transactions
   where reason = 'generation' and ref_id = _generation_id;
  if not found then return false; end if;      -- rien à rembourser

  return public.add_credits(_uid, 1, 'refund', _generation_id);
end $$;

-- limite : 10 générations / heure / utilisateur
create or replace function public.check_generation_rate_limit(_user_id uuid, _max integer default 10)
returns void
language plpgsql security definer set search_path = public as $$
declare _n integer;
begin
  select count(*) into _n from public.generations
   where user_id = _user_id and created_at > now() - interval '1 hour';
  if _n >= _max then raise exception 'RATE_LIMIT_EXCEEDED'; end if;
end $$;

-- suivi de consommation des API (agrégé par jour et par service)
create or replace function public.record_api_usage(
  _service public.api_service, _units numeric, _cost numeric default 0
) returns void
language sql security definer set search_path = public as $$
  insert into public.api_usage (date, service, units, cost_estimate)
  values ((now() at time zone 'utc')::date, _service, _units, _cost)
  on conflict (date, service) do update
    set units = public.api_usage.units + excluded.units,
        cost_estimate = public.api_usage.cost_estimate + excluded.cost_estimate;
$$;

-- création automatique du profil + rôle + bonus de bienvenue (2 crédits)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare _country text;
begin
  _country := upper(nullif(left(new.raw_user_meta_data->>'country_code', 2), ''));
  if _country is not null and _country !~ '^[A-Z]{2}$' then _country := null; end if;

  insert into public.profiles (id, email, full_name, phone, country_code)
  values (
    new.id, new.email,
    nullif(left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), 100), ''),
    nullif(left(coalesce(new.raw_user_meta_data->>'phone', ''), 30), ''),
    _country
  );
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  perform public.add_credits(new.id, 2, 'signup_bonus', null);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- garde l'email du profil synchronisé
create or replace function public.sync_profile_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.sync_profile_email();

-- Verrouillage des EXECUTE : par défaut Postgres donne EXECUTE à PUBLIC.
revoke execute on function public.add_credits(uuid, integer, public.credit_reason, uuid)     from public, anon, authenticated;
revoke execute on function public.consume_credit(uuid, uuid)                                 from public, anon, authenticated;
revoke execute on function public.refund_generation(uuid)                                    from public, anon, authenticated;
revoke execute on function public.check_generation_rate_limit(uuid, integer)                 from public, anon, authenticated;
revoke execute on function public.record_api_usage(public.api_service, numeric, numeric)     from public, anon, authenticated;
grant  execute on function public.add_credits(uuid, integer, public.credit_reason, uuid)     to service_role;
grant  execute on function public.consume_credit(uuid, uuid)                                 to service_role;
grant  execute on function public.refund_generation(uuid)                                    to service_role;
grant  execute on function public.check_generation_rate_limit(uuid, integer)                 to service_role;
grant  execute on function public.record_api_usage(public.api_service, numeric, numeric)     to service_role;
-- has_role reste appelable par les policies (authenticated) ; handle_new_user / sync_* ne sont que des triggers.
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant  execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
revoke execute on function public.handle_new_user()       from public, anon, authenticated;
revoke execute on function public.sync_profile_email()    from public, anon, authenticated;
