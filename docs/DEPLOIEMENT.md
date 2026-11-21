# Guide de déploiement pas à pas

Ordre conseillé : **Supabase → secrets → fonctions → Netlify → réglages finaux**. Compte environ 1 h la première fois.

> Les **paiements** (SasPay, Chariow) ne sont pas branchés : la section 9 explique quoi faire quand tes comptes seront créés. En attendant, `VITE_PAYMENTS_ENABLED=false` et le site fonctionne avec les 2 crédits offerts + les ajustements manuels de l'admin.

## 0. Prérequis
- Node.js 20 ou plus, et la CLI Supabase (`npm i -g supabase`, ou `npx supabase`).
- Comptes et clés : **Anthropic** (API Claude), **ElevenLabs** (avec la permission `user_read` sur la clé, pour la page Quotas), **SerpApi**.
- Un compte **Supabase**, un compte **Netlify**, et un dépôt Git du projet.

## 1. Créer le projet Supabase
1. Crée un projet sur supabase.com (choisis la région la plus proche de tes utilisateurs).
2. Note la **Project ref** (dans l'URL du dashboard), l'**URL du projet** et la clé **anon** (Settings → API). Ne copie **jamais** la clé `service_role` dans le front.
3. Dans le dossier du projet :
   ```bash
   supabase login
   supabase link --project-ref <PROJECT_REF>
   supabase db push        # applique les 7 migrations (tables, RLS, fonctions, storage, packs)
   ```
4. Vérifie dans le dashboard (Table Editor) que les tables ont l'icône « RLS enabled » et que les 4 packs existent.

## 2. Authentification (Dashboard → Authentication)
- **URL Configuration** : *Site URL* = l'URL Netlify (ex. `https://ton-site.netlify.app`). *Redirect URLs* : ajoute `https://ton-site.netlify.app/**` et `http://localhost:5173/**`.
- **Providers → Email** : garde « Confirm email » activé. Longueur minimale du mot de passe : 8.
- **Providers → Google** : crée des identifiants OAuth dans Google Cloud Console (type « Application Web »). Dans « URI de redirection autorisés », colle l'URL de callback affichée par Supabase (`https://<ref>.supabase.co/auth/v1/callback`). Copie l'ID client et le secret dans Supabase.
- **Emails** : le service d'envoi par défaut de Supabase est très limité. Pour la production, configure un SMTP personnalisé (Authentication → SMTP Settings) et traduis les modèles d'email en français (Authentication → Email Templates).

## 3. Secrets des Edge Functions
```bash
cp supabase/functions/.env.example supabase/functions/.env
# remplis : ANTHROPIC_API_KEY, ELEVENLABS_API_KEY, SERPAPI_KEY, CRON_SECRET (valeur aléatoire : openssl rand -hex 32),
# ALLOWED_ORIGINS=https://ton-site.netlify.app,http://localhost:5173
supabase secrets set --env-file supabase/functions/.env
```
`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis automatiquement aux fonctions. Le fichier `.env` est ignoré par Git.

## 4. Voix ElevenLabs
1. Dans la bibliothèque ElevenLabs, filtre sur le français, ajoute les voix voulues à « My Voices » et copie leurs **Voice ID**.
2. Le fichier `supabase/functions/_shared/voices.ts` contient déjà 4 voix par défaut (2 femmes, 2 hommes : voix prédéfinies ElevenLabs). Écoute-les, et remplace-les par des voix françaises de la bibliothèque si le rendu ne te convient pas. Un ID laissé en `TODO` est refusé sans consommer de crédit.
3. Génère les aperçus audio du Studio et de la landing :
   ```bash
   ELEVENLABS_API_KEY=xxx node scripts/generate-voice-previews.mjs   # Node 22.18+
   ```
   Les fichiers arrivent dans `public/voices/`. Si tu changes une clé de voix, mets à jour `src/lib/voices.ts`.

## 5. Déployer les Edge Functions
```bash
supabase functions deploy
```
`supabase/config.toml` règle `verify_jwt` : activé pour toutes les fonctions appelées par le site, désactivé pour `cron-cleanup` (protégée par `x-cron-secret`).

## 6. Premier compte admin
1. Inscris-toi normalement sur le site avec ton email.
2. Dans le SQL Editor de Supabase :
   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'ton-email@exemple.com'
   on conflict do nothing;
   ```
3. Reconnecte-toi : l'onglet **Admin** apparaît. L'accès est vérifié côté serveur (RLS + fonctions), pas seulement dans l'interface.

## 7. Tâche planifiée de nettoyage
Dashboard → Integrations → **Cron** → nouveau job (le libellé exact varie selon la version) :
- Type : *Supabase Edge Function* → `cron-cleanup`, méthode `POST`.
- Fréquence : toutes les 10 minutes.
- En-tête HTTP : `x-cron-secret: <la valeur de CRON_SECRET>`.

Cette tâche rembourse les générations restées bloquées plus de 15 minutes et supprime les captures de recherche inversée abandonnées.

## 8. Netlify (le front)
1. *Add new site → Import from Git*. Build : `npm run build`, dossier de publication : `dist` (déjà dans `netlify.toml`).
2. Variables d'environnement : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PAYMENTS_ENABLED=false`.
3. Après le premier déploiement, mets à jour `ALLOWED_ORIGINS` (secret Supabase) et les URLs d'authentification (étape 2) avec l'URL définitive.
4. Domaine personnalisé : si tu utilises un domaine Supabase personnalisé, ajoute-le dans `connect-src` et `media-src` du `Content-Security-Policy` de `netlify.toml`.
5. Dépose ta vidéo de démo dans `public/demo.mp4` et de vrais témoignages dans `src/content/landing.ts` (la section reste masquée tant qu'elle est vide).

## 9. Paiements (à faire quand tes comptes seront créés)
1. **Créer les comptes** SasPay et Chariow, puis récupérer `SASPAY_API_KEY`, `SASPAY_SECRET` et `CHARIOW_WEBHOOK_SECRET`.
2. **Écrire les fonctions manquantes** : `providers/saspay.ts`, `saspay-create-payment`, `saspay-webhook`, `chariow-webhook` (signature vérifiée, statut revérifié auprès du fournisseur, `add_credits` idempotent). Les briques sont prêtes : table `payments` avec index d'unicité, `add_credits`, `safeEqual`, `admin-validate-payment`, page `/paiement/retour`.
3. Mettre `verify_jwt = false` pour les deux webhooks dans `supabase/config.toml`, puis `supabase secrets set` et `supabase functions deploy`.
4. **Configurer les webhooks** chez les fournisseurs :
   - SasPay : `https://<ref>.supabase.co/functions/v1/saspay-webhook`
   - Chariow : `https://<ref>.supabase.co/functions/v1/chariow-webhook`
5. Renseigner le **lien produit Chariow** de chaque pack (Admin → Packs) et confirmer la liste des pays SasPay dans `src/lib/countries.ts`.
6. Passer `VITE_PAYMENTS_ENABLED=true` sur Netlify et redéployer.

## 10. Vérifications après mise en ligne
Déroule `docs/CHECKLIST_TESTS.md`. À faire dès le premier jour : le test de remboursement en cas d'échec et le test d'accès admin avec un compte non admin.

## Développement en local
```bash
supabase start && supabase db reset          # base locale + migrations
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/tests/rls_tests.sql
supabase functions serve --env-file supabase/functions/.env
cp .env.example .env.local                   # URL locale + clé anon affichées par `supabase start`
npm install && npm run dev
```
La recherche inversée ne peut pas être testée en local (SerpApi doit pouvoir joindre l'image) : teste-la sur le projet hébergé.
