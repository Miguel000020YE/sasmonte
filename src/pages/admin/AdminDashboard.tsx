import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { callFn, errorMessage } from '@/lib/api';
import { formatEur, formatFcfa } from '@/lib/format';

interface Stats {
  revenue: { provider: string; currency: string; payments: number; total: number }[];
  users_total: number;
  users_7d: number;
  videos_total: number;
  videos_by_day: { day: string; videos: number }[];
  failed_7d: number;
  pending_payments: number;
}

const PROVIDER_LABEL: Record<string, string> = { saspay: 'SasPay (Mobile Money)', chariow: 'Chariow (carte)' };

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-extrabold">{value.toLocaleString('fr-FR')}</p>
      </CardContent>
    </Card>
  );
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callFn<Stats>('admin-stats', {}).then(setStats).catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <Notice kind="error">{error}</Notice>;
  if (!stats) return <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-20" />)}</div>;

  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
  const byDay = new Map(stats.videos_by_day.map((v) => [v.day, v.videos]));
  const counts = days.map((d) => byDay.get(d) ?? 0);
  const max = Math.max(1, ...counts);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Utilisateurs" value={stats.users_total} />
        <Stat label="Nouveaux (7 j)" value={stats.users_7d} />
        <Stat label="Vidéos générées" value={stats.videos_total} />
        <Stat label="Échecs (7 j)" value={stats.failed_7d} />
        <Stat label="Paiements en attente" value={stats.pending_payments} />
      </div>

      <Card>
        <CardHeader><CardTitle>Chiffre d'affaires par moyen de paiement</CardTitle></CardHeader>
        <CardContent>
          {stats.revenue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun paiement confirmé pour le moment.</p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.revenue.map((r) => (
                <li key={`${r.provider}-${r.currency}`} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{PROVIDER_LABEL[r.provider] ?? r.provider}</p>
                    <p className="text-xs text-muted-foreground">{r.payments} paiement{r.payments > 1 ? 's' : ''}</p>
                  </div>
                  <p className="font-semibold">{r.currency === 'XOF' ? formatFcfa(r.total) : formatEur(r.total)}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Vidéos par jour (30 derniers jours)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex h-32 items-end gap-1" role="img" aria-label="Histogramme des vidéos générées par jour">
            {counts.map((c, i) => (
              <div key={days[i]} className="flex-1 rounded-t bg-gradient-to-t from-primary/60 to-primary" style={{ height: `${Math.max(3, (c / max) * 100)}%`, opacity: c === 0 ? 0.25 : 1 }} title={`${days[i]} : ${c}`} />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{days[0]}</span><span>{days[29]}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
