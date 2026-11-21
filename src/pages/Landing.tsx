import { ChevronDown, Mic, PenLine, Rocket, Search, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout/Logo';
import { PackCard } from '@/components/billing/PackCard';
import { VoicePicker } from '@/components/studio/VoicePicker';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { usePacks } from '@/hooks/usePacks';
import { BRAND_NAME } from '@/lib/brand';
import { FAQ, TESTIMONIALS } from '@/content/landing';
import type { VoiceKey } from '@/lib/voices';

function DemoVideo() {
  const [failed, setFailed] = useState(false);
  return (
    <div className="mx-auto w-full max-w-[260px] overflow-hidden rounded-[2rem] border-4 border-border bg-card shadow-glow">
      <div className="aspect-[9/16] bg-gradient-to-b from-muted to-background">
        {failed ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
            <Wand2 className="h-8 w-8 text-primary" />
            Démo vidéo bientôt disponible
            {/* TODO : dépose ta vidéo de démo dans public/demo.mp4 */}
          </div>
        ) : (
          <video src="/demo.mp4" className="h-full w-full object-cover" controls playsInline muted loop preload="metadata" onError={() => setFailed(true)} />
        )}
      </div>
    </div>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-card">
      {FAQ.map((item, i) => (
        <div key={item.q}>
          <button type="button" className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
            {item.q}
            <ChevronDown className={`h-4 w-4 shrink-0 transition ${open === i ? 'rotate-180' : ''}`} />
          </button>
          {open === i && <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">{item.a}</p>}
        </div>
      ))}
    </div>
  );
}

const steps = [
  { icon: Search, title: 'Choisis ton sujet', text: "Écris une idée, ou envoie la capture d'écran d'une vidéo virale : on retrouve sa source." },
  { icon: Mic, title: "L'IA écrit et enregistre", text: 'Un script accrocheur (hook, développement, appel à l’action) lu par une voix réaliste, au choix.' },
  { icon: Rocket, title: 'Télécharge et publie', text: 'Récupère le script, la voix off en MP3 et les sous-titres SRT, puis monte ta vidéo.' },
];

export function Landing() {
  const { session } = useAuth();
  const { packs, loading } = usePacks();
  const [voice, setVoice] = useState<VoiceKey>('femme-chaleureuse');

  return (
    <div className="min-h-[100dvh] overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <a href="#comment" className="hover:text-foreground">Comment ça marche</a>
            <a href="#tarifs" className="hover:text-foreground">Tarifs</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            {session ? (
              <Link to="/studio" className={buttonStyles('primary', 'sm')}>Ouvrir le Studio</Link>
            ) : (
              <>
                <Link to="/connexion" className={buttonStyles('ghost', 'sm')}>Connexion</Link>
                <Link to="/inscription" className={buttonStyles('primary', 'sm', 'hidden sm:inline-flex')}>Commencer</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-5xl items-center gap-10 px-4 pb-16 pt-14 md:grid-cols-[1.2fr_1fr] md:pt-20">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
        <div className="relative animate-fade-up space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Wand2 className="h-3.5 w-3.5" /> Pour les créateurs d'Afrique francophone
          </span>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            Des vidéos <span className="text-gradient">faceless</span> prêtes à publier, en quelques minutes.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Choisis un sujet : l'IA écrit le script en français, enregistre la voix off et prépare les sous-titres. Pour TikTok, Reels et Shorts.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to={session ? '/studio' : '/inscription'} className={buttonStyles('primary', 'lg')}>
              Essayer gratuitement
            </Link>
            <a href="#comment" className={buttonStyles('outline', 'lg')}>Voir comment ça marche</a>
          </div>
          <p className="text-sm text-muted-foreground">2 crédits offerts à l'inscription, sans carte bancaire.</p>
        </div>
        <DemoVideo />
      </section>

      <section id="comment" className="mx-auto max-w-5xl scroll-mt-16 px-4 py-14">
        <h2 className="mb-8 text-center text-3xl font-bold tracking-tight">Comment ça marche</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <Card key={title}>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary"><Icon className="h-5 w-5" /></span>
                  <span className="text-sm font-semibold text-muted-foreground">Étape {i + 1}</span>
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Écoute les voix</h2>
          <p className="mt-2 text-muted-foreground">Plusieurs voix de femme et d'homme, naturelles et en français.</p>
        </div>
        <div className="mx-auto max-w-2xl"><VoicePicker value={voice} onChange={setVoice} /></div>
      </section>

      <section id="tarifs" className="mx-auto max-w-5xl scroll-mt-16 px-4 py-14">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Des tarifs simples</h2>
          <p className="mt-2 text-muted-foreground">1 crédit = 1 vidéo. Tu paies uniquement ce que tu utilises.</p>
        </div>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-52" />)}</div>
        ) : (
          <div className="grid gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            {packs.map((p, i) => (
              <PackCard key={p.id} pack={p} highlighted={i === 1}>
                <Link to={session ? '/acheter' : '/inscription'} className={buttonStyles(i === 1 ? 'primary' : 'outline', 'md', 'w-full')}>
                  {session ? 'Choisir' : 'Commencer'}
                </Link>
              </PackCard>
            ))}
          </div>
        )}
      </section>

      {TESTIMONIALS.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="mb-8 text-center text-3xl font-bold tracking-tight">Ils créent avec {BRAND_NAME}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name}>
                <CardContent className="space-y-3">
                  <PenLine className="h-5 w-5 text-primary" />
                  <p className="text-sm leading-relaxed">« {t.text} »</p>
                  <p className="text-sm font-semibold">{t.name} <span className="font-normal text-muted-foreground">· {t.role}</span></p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section id="faq" className="mx-auto max-w-3xl scroll-mt-16 px-4 py-14">
        <h2 className="mb-8 text-center text-3xl font-bold tracking-tight">Questions fréquentes</h2>
        <Faq />
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Prêt à lancer ta première vidéo ?</h2>
        <p className="mt-2 text-muted-foreground">Crée ton compte et profite de 2 crédits offerts.</p>
        <Link to={session ? '/studio' : '/inscription'} className={buttonStyles('primary', 'lg', 'mt-6')}>Commencer maintenant</Link>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {BRAND_NAME}. Tous droits réservés.
      </footer>
    </div>
  );
}
