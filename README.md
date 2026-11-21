# SaSMonte (nom provisoire)

SaaS de vidéos courtes « faceless » pour les créateurs d'Afrique francophone : script en français (Claude), voix off (ElevenLabs), sous-titres SRT, recherche inversée (Google Lens via SerpApi). 1 crédit = 1 vidéo.

**Stack** : React + TypeScript + Vite + Tailwind (composants dans le style shadcn/ui) · Supabase (Auth, Postgres + RLS, Storage, Edge Functions) · Netlify.

## État du projet
| Partie | État |
|---|---|
| Migrations SQL (7), RLS, fonctions de crédits idempotentes | Livré |
| Edge Functions : `generate-script`, `generate-voice`, `reverse-search` | Livré |
| Edge Functions admin : stats, quotas, ajustement de crédits, validation manuelle | Livré |
| Tâche de nettoyage `cron-cleanup` (remboursement des blocages, captures orphelines) | Livré |
| Front : landing, auth, Studio, Mes vidéos, Acheter, Compte, Admin | Livré |
| Guide de déploiement, checklist de test, `.env.example` | Livré |
| **Paiements SasPay** (create-payment, webhook, provider) | **Livré** |
| **Webhook Chariow** (stub prêt, à finaliser quand le compte sera créé) | En attente |

Rien n'a encore été exécuté sur un vrai projet : commence par `npm install && npm run build`, puis suis `docs/DEPLOIEMENT.md`.

## Démarrage express (publication manuelle)
1. Mets le dossier dans un dépôt Git (GitHub) : Netlify compile le site tout seul (`npm run build`), rien à compiler chez toi.
2. Supabase : `supabase link --project-ref <REF>` puis `supabase db push`.
3. Secrets : `cp supabase/functions/.env.example supabase/functions/.env`, remplis-le, puis `supabase secrets set --env-file supabase/functions/.env`.
4. Fonctions : `supabase functions deploy`.
5. Netlify : importe le dépôt, ajoute `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` et `VITE_PAYMENTS_ENABLED=false`.
6. Auth (Google, URLs) et premier admin : voir `docs/DEPLOIEMENT.md`, sections 2 et 6.

Détails complets : `docs/DEPLOIEMENT.md`.

## Sécurité en bref
- Aucune clé secrète dans le front : seules `VITE_SUPABASE_URL` et la clé `anon` y sont présentes.
- RLS sur toutes les tables ; `credits` n'est modifiable que par des fonctions `SECURITY DEFINER` réservées à `service_role`.
- Chaque Edge Function vérifie le JWT, valide les entrées avec Zod et, pour l'admin, le rôle côté serveur.
- Crédit réservé avant l'appel aux API payantes, remboursé automatiquement en cas d'échec (une seule fois, grâce aux index d'unicité du journal).

## Documentation
- `docs/ARBORESCENCE.md` : arborescence réelle du projet
- `docs/DEPLOIEMENT.md` : déploiement pas à pas
- `docs/CHECKLIST_TESTS.md` : tests à dérouler
