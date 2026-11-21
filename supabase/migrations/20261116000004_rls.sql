-- 0004 : RLS sur CHAQUE table + privilèges minimaux (défense en profondeur)

alter table public.profiles            enable row level security;
alter table public.user_roles          enable row level security;
alter table public.credit_packs        enable row level security;
alter table public.payments            enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.generations         enable row level security;
alter table public.api_usage           enable row level security;

-- Privilèges : le client (authenticated) ne peut ÉCRIRE que là où c'est prévu.
revoke insert, update, delete on public.profiles, public.user_roles, public.credit_packs,
  public.payments, public.credit_transactions, public.generations, public.api_usage from anon, authenticated;
revoke all on public.api_usage, public.user_roles from anon;

-- profiles : lecture de sa ligne ; modification limitée à 3 colonnes (jamais credits, email, id)
grant update (full_name, phone, country_code) on public.profiles to authenticated;
create policy profiles_select_own   on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_select_admin on public.profiles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy profiles_update_own   on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- user_roles : lecture de ses rôles uniquement (aucune écriture côté client)
create policy roles_select_own   on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy roles_select_admin on public.user_roles for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- credit_packs : packs actifs publics (landing) ; gestion complète pour les admins
grant insert, update, delete on public.credit_packs to authenticated;   -- encadré par les policies ci-dessous
create policy packs_select_active on public.credit_packs for select to anon, authenticated using (active = true);
create policy packs_admin_all     on public.credit_packs for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- payments : lecture des siens ; création/maj uniquement par Edge Functions (service_role)
create policy payments_select_own   on public.payments for select to authenticated using (user_id = auth.uid());
create policy payments_select_admin on public.payments for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- credit_transactions : lecture seule
create policy ctx_select_own   on public.credit_transactions for select to authenticated using (user_id = auth.uid());
create policy ctx_select_admin on public.credit_transactions for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- generations : lecture + suppression des siennes ; création/maj par Edge Functions uniquement
grant delete on public.generations to authenticated;
create policy gen_select_own   on public.generations for select to authenticated using (user_id = auth.uid());
create policy gen_delete_own   on public.generations for delete to authenticated using (user_id = auth.uid());
create policy gen_select_admin on public.generations for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- api_usage : admins en lecture seule
create policy usage_select_admin on public.api_usage for select to authenticated using (public.has_role(auth.uid(), 'admin'));
