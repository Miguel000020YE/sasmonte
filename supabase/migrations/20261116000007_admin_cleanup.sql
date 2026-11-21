-- 0007 : motif des mouvements de crédits, statistiques admin, nettoyage, suppression de ses MP3

alter table public.credit_transactions add column note text check (char_length(note) <= 200);
alter table public.credit_transactions add column created_by uuid references auth.users(id) on delete set null;

-- add_credits : nouvelle signature avec motif (_note) et auteur (_created_by). Les appels à 4 arguments restent valides.
drop function public.add_credits(uuid, integer, public.credit_reason, uuid);
create or replace function public.add_credits(
  _user_id uuid, _amount integer, _reason public.credit_reason, _ref uuid default null,
  _note text default null, _created_by uuid default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare _tx uuid;
begin
  if _amount = 0 then raise exception 'INVALID_AMOUNT'; end if;

  insert into public.credit_transactions (user_id, delta, reason, ref_id, note, created_by)
  values (_user_id, _amount, _reason, _ref, left(_note, 200), _created_by)
  on conflict do nothing
  returning id into _tx;

  if _tx is null then return false; end if;

  update public.profiles set credits = credits + _amount where id = _user_id;
  if not found then raise exception 'USER_NOT_FOUND'; end if;
  return true;
end $$;

revoke execute on function public.add_credits(uuid, integer, public.credit_reason, uuid, text, uuid) from public, anon, authenticated;
grant  execute on function public.add_credits(uuid, integer, public.credit_reason, uuid, text, uuid) to service_role;

-- Statistiques du tableau de bord admin (appelée uniquement par l'Edge Function admin-stats)
create or replace function public.admin_stats()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'revenue', coalesce((
      select jsonb_agg(r) from (
        select provider, currency, count(*) as payments, sum(amount) as total
        from public.payments where status = 'paid' group by provider, currency
      ) r), '[]'::jsonb),
    'users_total', (select count(*) from public.profiles),
    'users_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'videos_total', (select count(*) from public.generations where status = 'done'),
    'videos_by_day', coalesce((
      select jsonb_agg(d order by d.day) from (
        select (created_at at time zone 'utc')::date as day, count(*) as videos
        from public.generations
        where status = 'done' and created_at > now() - interval '30 days'
        group by 1
      ) d), '[]'::jsonb),
    'failed_7d', (select count(*) from public.generations where status = 'failed' and created_at > now() - interval '7 days'),
    'pending_payments', (select count(*) from public.payments where status = 'pending')
  );
$$;
revoke execute on function public.admin_stats() from public, anon, authenticated;
grant  execute on function public.admin_stats() to service_role;

-- Captures de recherche inversée abandonnées (envoyées mais jamais traitées)
create or replace function public.list_orphan_reverse_inputs(_older_than interval default interval '1 hour')
returns table (name text)
language sql stable security definer set search_path = public as $$
  select o.name from storage.objects o
  where o.bucket_id = 'reverse-inputs' and o.created_at < now() - _older_than
  limit 200;
$$;
revoke execute on function public.list_orphan_reverse_inputs(interval) from public, anon, authenticated;
grant  execute on function public.list_orphan_reverse_inputs(interval) to service_role;

-- L'utilisateur peut supprimer ses propres MP3 (le front supprime le fichier avant la ligne de génération)
create policy audios_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'audios' and (storage.foldername(name))[1] = auth.uid()::text);

-- Le lien Chariow sert à une redirection du navigateur : on n'accepte que du https
alter table public.credit_packs
  add constraint credit_packs_chariow_url_https check (chariow_url is null or chariow_url ~* '^https://');
