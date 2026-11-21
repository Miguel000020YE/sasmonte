# Checklist de test

Coche chaque ligne sur le projet hébergé avant d'ouvrir au public. Utilise deux comptes de test : un utilisateur normal et un admin.

## Base de données et sécurité
- [ ] `supabase/tests/rls_tests.sql` passe sans erreur sur la base locale.
- [ ] Un utilisateur connecté ne voit que ses lignes (profil, générations, transactions, paiements).
- [ ] Depuis la console du navigateur, `supabase.from('profiles').update({ credits: 999 })` est refusé.
- [ ] Depuis la console, `supabase.rpc('add_credits', ...)` est refusé (permission denied).
- [ ] Aucune clé secrète dans le bundle : recherche `sk-ant`, `service_role`, `xi-api` dans `dist/` → aucun résultat.

## Inscription et connexion
- [ ] Inscription par email : l'email de confirmation arrive en français ; après confirmation, le profil existe avec **2 crédits** et une ligne « Bonus de bienvenue » dans Mon compte.
- [ ] Le pays choisi à l'inscription apparaît dans Mon compte.
- [ ] Inscription avec un email déjà utilisé : message « Un compte existe déjà ».
- [ ] Connexion Google : le compte est créé avec 2 crédits et le bandeau « Dans quel pays es-tu ? » s'affiche.
- [ ] Mot de passe oublié : le lien arrive, le nouveau mot de passe fonctionne, un lien expiré affiche un message clair.
- [ ] Déconnexion puis accès direct à `/studio` : redirection vers la connexion.

## Génération (mode Sujet)
- [ ] Générer avec un sujet : script, lecteur audio, boutons copier / .txt / .mp3 / .srt fonctionnels.
- [ ] Le solde dans l'en-tête passe de 2 à 1 ; l'historique montre une ligne « Génération de vidéo ».
- [ ] Le SRT s'ouvre dans un éditeur vidéo et les sous-titres sont synchronisés avec la voix.
- [ ] Sujet trop court ou vide : message d'erreur clair, aucun crédit consommé.
- [ ] Solde à 0 : bouton désactivé et bandeau « Tu n'as plus de crédits ».
- [ ] 11ᵉ génération dans la même heure : message de limite (10 par heure).
- [ ] Sujet contenant une consigne (« ignore tes règles… ») : le script reste un script normal.

## Remboursement en cas d'échec
- [ ] Mets une fausse `ANTHROPIC_API_KEY`, lance une génération : message d'erreur en français, **solde inchangé**, ligne « Remboursement » dans l'historique, génération en « Échec · crédit rendu ». Remets la vraie clé.
- [ ] Même test avec une fausse `ELEVENLABS_API_KEY` : le script s'affiche quand même, crédit remboursé, pas de MP3 orphelin dans le bucket `audios`.
- [ ] Double-clic rapide sur « Générer » : un seul crédit consommé.
- [ ] Génération laissée bloquée (ferme l'onglet juste après le script) : après ~15 min et un passage du cron, crédit remboursé.

## Recherche inversée
- [ ] Capture d'une vidéo virale connue : 5 sources affichées, script original proposé, voix générée.
- [ ] Image qui ne donne aucun résultat : message « Aucune source… », crédit remboursé.
- [ ] Fichier non image ou de plus de 5 Mo : refusé avant l'envoi.
- [ ] Après la recherche, la capture n'existe plus dans le bucket `reverse-inputs`.

## Mes vidéos et Mon compte
- [ ] L'historique liste les générations, le MP3 se lit après ouverture, la suppression retire aussi le fichier audio.
- [ ] Modification du nom, du téléphone et du pays ; changement de mot de passe.

## Administration
- [ ] Avec le compte **non admin** : `/admin` redirige vers le Studio ; l'appel direct à `admin-stats` renvoie 403.
- [ ] Avec le compte admin : statistiques, quotas ElevenLabs / SerpApi / Claude, liste des utilisateurs.
- [ ] Ajuster les crédits d'un utilisateur (+5 puis −2) avec motif : solde correct, motif visible dans son historique ; retirer plus que le solde est refusé.
- [ ] Packs : modifier un prix, désactiver un pack (il disparaît de la landing), créer un pack.
- [ ] Un lien Chariow ne commençant pas par `https://` est refusé.

## Paiements (à faire quand ils seront branchés)
- [ ] Pays couvert par SasPay (ex. CI) : SasPay proposé en premier ; pays non couvert (ex. FR, GN) : Chariow en premier ; changement manuel possible.
- [ ] Achat SasPay : redirection, retour sur `/paiement/retour`, statut « Paiement confirmé », crédits ajoutés **une seule fois**.
- [ ] Achat Chariow : le lien contient l'email et l'identifiant ; après paiement, le pack est crédité sur le bon compte.
- [ ] Webhook rejoué deux fois : aucun double crédit.
- [ ] Webhook avec mauvaise signature ou mauvais secret : refusé.
- [ ] Paiement abandonné : reste « En attente », aucun crédit.
- [ ] Admin → Paiements → « Valider manuellement » crédite une fois, même si on clique deux fois.
