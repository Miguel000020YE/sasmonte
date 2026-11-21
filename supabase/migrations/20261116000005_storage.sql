-- 0005 : buckets privés. Chemin imposé : {user_id}/fichier

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('audios',         'audios',         false, 20971520, array['audio/mpeg']),
  ('reverse-inputs', 'reverse-inputs', false,  5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- audios : lecture de son dossier ; écriture réservée aux Edge Functions (service_role)
create policy audios_select_own on storage.objects for select to authenticated
  using (bucket_id = 'audios' and (storage.foldername(name))[1] = auth.uid()::text);

-- reverse-inputs : l'utilisateur envoie sa capture dans son dossier et peut la relire/supprimer
create policy rev_select_own on storage.objects for select to authenticated
  using (bucket_id = 'reverse-inputs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy rev_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'reverse-inputs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy rev_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'reverse-inputs' and (storage.foldername(name))[1] = auth.uid()::text);
