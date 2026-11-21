import { Coins, Film, Shield, Sparkles, User } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { creditsLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { CountryPrompt } from './CountryPrompt';
import { Logo } from './Logo';

const links = [
  { to: '/studio', label: 'Studio', icon: Sparkles },
  { to: '/mes-videos', label: 'Mes vidéos', icon: Film },
  { to: '/acheter', label: 'Crédits', icon: Coins },
  { to: '/compte', label: 'Compte', icon: User },
];

/** Mise en page des pages connectées : en-tête avec solde toujours visible, navigation bas d'écran sur mobile. */
export function AppShell() {
  const { profile, isAdmin } = useAuth();
  const credits = profile?.credits ?? 0;

  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Logo to="/studio" />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn('rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground', isActive && 'bg-muted text-foreground')
                }
              >
                {label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin" className={({ isActive }) => cn('rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground', isActive && 'bg-muted text-foreground')}>
                Admin
              </NavLink>
            )}
          </nav>
          <Link
            to="/acheter"
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition hover:bg-muted',
              credits === 0 ? 'border-destructive/50 text-destructive' : 'border-primary/40 text-primary',
            )}
            aria-label={`Solde : ${creditsLabel(credits)}`}
          >
            <Coins className="h-4 w-4" />
            {credits}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 md:pb-12">
        <CountryPrompt />
        <Outlet />
      </main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <div className={cn('mx-auto grid max-w-md', isAdmin ? 'grid-cols-5' : 'grid-cols-4')}>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground', isActive && 'text-primary')}>
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground', isActive && 'text-primary')}>
              <Shield className="h-5 w-5" />
              Admin
            </NavLink>
          )}
        </div>
      </nav>
    </div>
  );
}
