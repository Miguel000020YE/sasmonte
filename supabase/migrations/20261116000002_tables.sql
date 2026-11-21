-- 0002 : tables (RLS activée dans la migration 0004)

-- profiles : 1 ligne par utilisateur auth. `credits` n'est JAMAIS modifiable par le client.
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,                       -- copie de auth.users.email (sert au rapprochement Chariow)
  full_name    text check (char_length(full_name) <= 100),
  phone        text check (char_length(phone) <= 30),
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  credits      integer not null default 0 check (credits >= 0),
  created_at   timestamptz not null default now()
);
create unique index profiles_email_key on public.profiles (lower(email)) where email is not null;

-- rôles dans une table séparée (jamais sur profiles)
create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role    public.app_role not null,
  primary key (user_id, role)
);

create table public.credit_packs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  credits     integer not null check (credits > 0),
  price_xof   integer not null check (price_xof > 0),
  price_eur   numeric(10,2) not null check (price_eur > 0),
  chariow_url text,
  active      boolean not null default true,
  sort_order  integer not null default 0
);

create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete restrict,
  pack_id      uuid not null references public.credit_packs(id) on delete restrict,
  credits      integer not null check (credits > 0),      -- instantané du pack au moment de l'achat
  provider     public.payment_provider not null,
  provider_ref text,                                      -- id/référence côté fournisseur
  amount       numeric(12,2) not null check (amount > 0),
  currency     text not null check (currency in ('XOF','EUR')),
  status       public.payment_status not null default 'pending',
  raw_payload  jsonb,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);
-- idempotence : une même référence fournisseur ne peut exister qu'une fois
create unique index payments_provider_ref_key on public.payments (provider, provider_ref) where provider_ref is not null;
create index payments_user_idx on public.payments (user_id, created_at desc);

-- journal de tous les mouvements de crédits
create table public.credit_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete restrict,
  delta      integer not null check (delta <> 0),
  reason     public.credit_reason not null,
  ref_id     uuid,                                         -- payment.id ou generation.id
  created_at timestamptz not null default now()
);
create index credit_tx_user_idx on public.credit_transactions (user_id, created_at desc);
-- idempotence : un achat / une consommation / un remboursement ne s'applique qu'une fois par ref_id
create unique index credit_tx_once_per_ref on public.credit_transactions (reason, ref_id)
  where ref_id is not null and reason in ('purchase','generation','refund');
-- un seul bonus de bienvenue par utilisateur
create unique index credit_tx_one_signup_bonus on public.credit_transactions (user_id) where reason = 'signup_bonus';

create table public.generations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  mode       public.generation_mode not null,
  input      jsonb not null default '{}'::jsonb,           -- {topic, tone} ou {image_path, results}
  script     jsonb,                                        -- {hook, script, cta, hashtags, titre}
  voice_id   text,
  audio_path text,
  srt        text,
  status     public.generation_status not null default 'pending',
  error      text,
  created_at timestamptz not null default now()
);
create index generations_user_idx on public.generations (user_id, created_at desc);

create table public.api_usage (
  date          date not null default (now() at time zone 'utc')::date,
  service       public.api_service not null,
  units         numeric not null default 0,
  cost_estimate numeric(12,4) not null default 0,
  primary key (date, service)
);
