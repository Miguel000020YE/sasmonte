import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/admin', label: 'Statistiques', end: true },
  { to: '/admin/quotas', label: 'Quotas API' },
  { to: '/admin/utilisateurs', label: 'Utilisateurs' },
  { to: '/admin/packs', label: 'Packs' },
  { to: '/admin/paiements', label: 'Paiements' },
];

export function AdminLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
        <p className="text-sm text-muted-foreground">Accès réservé aux administrateurs (vérifié côté serveur).</p>
      </div>
      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => cn('whitespace-nowrap rounded-full border border-border px-4 py-1.5 text-sm font-medium text-muted-foreground', isActive && 'border-primary bg-primary/10 text-primary')}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
