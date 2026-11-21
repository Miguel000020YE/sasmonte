```
sasmonte/
├── docs/
│   ├── ARBORESCENCE.md
│   ├── CHECKLIST_TESTS.md
│   └── DEPLOIEMENT.md
├── public/
│   └── favicon.svg
├── scripts/
│   └── generate-voice-previews.mjs
├── src/
│   ├── components/
│   │   ├── billing/
│   │   │   ├── PackCard.tsx
│   │   │   └── PaymentMethodPicker.tsx
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── AuthLayout.tsx
│   │   │   ├── CountryPrompt.tsx
│   │   │   ├── GoogleButton.tsx
│   │   │   ├── Guards.tsx
│   │   │   └── Logo.tsx
│   │   ├── studio/
│   │   │   ├── ProgressSteps.tsx
│   │   │   ├── ResultCard.tsx
│   │   │   └── VoicePicker.tsx
│   │   └── ui/
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── notice.tsx
│   │       └── spinner.tsx
│   ├── content/
│   │   └── landing.ts
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── ToastContext.tsx
│   ├── hooks/
│   │   └── usePacks.ts
│   ├── lib/
│   │   ├── api.ts
│   │   ├── authErrors.ts
│   │   ├── brand.ts
│   │   ├── countries.ts
│   │   ├── download.ts
│   │   ├── format.ts
│   │   ├── payments.ts
│   │   ├── supabase.ts
│   │   ├── utils.ts
│   │   └── voices.ts
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── AdminPacks.tsx
│   │   │   ├── AdminPayments.tsx
│   │   │   ├── AdminQuotas.tsx
│   │   │   └── AdminUsers.tsx
│   │   ├── Account.tsx
│   │   ├── BuyCredits.tsx
│   │   ├── ForgotPassword.tsx
│   │   ├── Landing.tsx
│   │   ├── Login.tsx
│   │   ├── MyVideos.tsx
│   │   ├── NotFound.tsx
│   │   ├── PaymentReturn.tsx
│   │   ├── ResetPassword.tsx
│   │   ├── Signup.tsx
│   │   └── Studio.tsx
│   ├── types/
│   │   └── database.ts
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── supabase/
│   ├── functions/
│   │   ├── _shared/
│   │   │   ├── providers/
│   │   │   │   ├── claude.ts
│   │   │   │   ├── elevenlabs.ts
│   │   │   │   ├── reversePrompt.ts
│   │   │   │   ├── scriptPrompt.ts
│   │   │   │   ├── serpapi.ts
│   │   │   │   ├── srt.ts
│   │   │   │   └── srt_test.ts
│   │   │   ├── auth.ts
│   │   │   ├── cors.ts
│   │   │   ├── errors.ts
│   │   │   ├── generations.ts
│   │   │   ├── http.ts
│   │   │   ├── narration.ts
│   │   │   ├── schemas.ts
│   │   │   ├── security.ts
│   │   │   ├── supabaseAdmin.ts
│   │   │   ├── usage.ts
│   │   │   └── voices.ts
│   │   ├── admin-adjust-credits/
│   │   │   └── index.ts
│   │   ├── admin-quotas/
│   │   │   └── index.ts
│   │   ├── admin-stats/
│   │   │   └── index.ts
│   │   ├── admin-validate-payment/
│   │   │   └── index.ts
│   │   ├── cron-cleanup/
│   │   │   └── index.ts
│   │   ├── generate-script/
│   │   │   └── index.ts
│   │   ├── generate-voice/
│   │   │   └── index.ts
│   │   ├── reverse-search/
│   │   │   └── index.ts
│   │   └── .env.example
│   ├── migrations/
│   │   ├── 20261116000001_types.sql
│   │   ├── 20261116000002_tables.sql
│   │   ├── 20261116000003_functions_triggers.sql
│   │   ├── 20261116000004_rls.sql
│   │   ├── 20261116000005_storage.sql
│   │   ├── 20261116000006_seed_packs.sql
│   │   └── 20261116000007_admin_cleanup.sql
│   ├── tests/
│   │   └── rls_tests.sql
│   └── config.toml
├── .env.example
├── .gitignore
├── components.json
├── index.html
├── netlify.toml
├── package.json
├── postcss.config.js
├── README.md
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```
