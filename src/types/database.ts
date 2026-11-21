export type PaymentProvider = 'saspay' | 'chariow';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type CreditReason = 'purchase' | 'generation' | 'refund' | 'admin' | 'signup_bonus';
export type GenerationStatus = 'pending' | 'processing' | 'done' | 'failed';
export type Tone = 'percutant' | 'humoristique' | 'inspirant' | 'dramatique' | 'educatif' | 'mysterieux';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  country_code: string | null;
  credits: number;
  created_at: string;
}

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price_xof: number;
  price_eur: number;
  chariow_url: string | null;
  active: boolean;
  sort_order: number;
}

export interface Payment {
  id: string;
  user_id: string;
  pack_id: string;
  credits: number;
  provider: PaymentProvider;
  provider_ref: string | null;
  amount: number;
  currency: 'XOF' | 'EUR';
  status: PaymentStatus;
  created_at: string;
  paid_at: string | null;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  delta: number;
  reason: CreditReason;
  ref_id: string | null;
  note: string | null;
  created_at: string;
}

export interface Script {
  titre: string;
  hook: string;
  script: string;
  cta: string;
  hashtags: string[];
}

export interface LensResult {
  title: string;
  link: string;
  source: string | null;
  thumbnail: string | null;
}

export interface Generation {
  id: string;
  user_id: string;
  mode: 'topic' | 'reverse';
  input: { topic?: string; tone?: string; results?: LensResult[] };
  script: Script | null;
  voice_id: string | null;
  audio_path: string | null;
  srt: string | null;
  status: GenerationStatus;
  error: string | null;
  created_at: string;
}
