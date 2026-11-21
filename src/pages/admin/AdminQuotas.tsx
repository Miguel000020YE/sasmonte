import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { callFn, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';

interface Quotas {
  elevenlabs: { ok: boolean; used?: number; limit?: number; tier?: string; resets_at?: string | null };
  serpapi: { ok: boolean; plan?: string; used?: number; limit?: number; left?: number };
  usage_month: { service: string; units: number; cost_estimate: number }[];
}

const nf = new Intl.NumberFormat('fr-FR');

function Bar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div className={pct >= 90 ? 'h-full bg-destructive' : pct >= 70 ? 'h-full bg-amber-400' : 'h-full bg-success'} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{nf.format(used)} / {nf.format(limit)} ({pct} %)</p>
    </div>
  );
}

export function AdminQuotas() {
  const [q, setQ] = useState<Quotas | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callFn<Quotas>('admin-quotas', {}).then(setQ).catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <Notice kind="error">{error}</Notice>;
  if (!q) return <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-24" />)}</div>;

  const usage = (s: string) => q.usage_month.find((u) => u.service === s);
  const claude = usage('claude');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>ElevenLabs · caractères</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {q.elevenlabs.ok && q.elevenlabs.limit !== undefined ? (
            <>
              <Bar used={q.elevenlabs.used ?? 0} limit={q.elevenlabs.limit} />
              <p className="text-xs text-muted-foreground">
                Offre : {q.elevenlabs.tier ?? 'inconnue'} · restant : {nf.format(q.elevenlabs.limit - (q.elevenlabs.used ?? 0))}
                {q.elevenlabs.resets_at ? ` · renouvellement le ${formatDate(q.elevenlabs.resets_at)}` : ''}
              </p>
            </>
          ) : (
            <Notice kind="error">Quota indisponible. Vérifie ELEVENLABS_API_KEY (permission « user_read » requise).</Notice>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>SerpApi · recherches</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {q.serpapi.ok && q.serpapi.limit !== undefined ? (
            <>
              <Bar used={q.serpapi.used ?? 0} limit={q.serpapi.limit} />
              <p className="text-xs text-muted-foreground">Offre : {q.serpapi.plan ?? 'inconnue'} · restantes : {nf.format(q.serpapi.left ?? 0)}</p>
            </>
          ) : (
            <Notice kind="error">Quota indisponible. Vérifie SERPAPI_KEY.</Notice>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Claude · consommation estimée du mois</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-2xl font-extrabold">{nf.format(claude?.units ?? 0)} <span className="text-sm font-normal text-muted-foreground">tokens</span></p>
          <p className="text-sm text-muted-foreground">Coût estimé : {(claude?.cost_estimate ?? 0).toFixed(2)} $ <Badge tone="muted">estimation</Badge></p>
          <p className="text-xs text-muted-foreground">Calculé à partir des tarifs configurés (CLAUDE_PRICE_*). Le solde réel se consulte dans la console Anthropic.</p>
        </CardContent>
      </Card>
    </div>
  );
}
