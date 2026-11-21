import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { useToast } from '@/context/ToastContext';
import { callFn, errorMessage } from '@/lib/api';
import { creditsLabel, formatDate, formatEur, formatFcfa } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Payment, PaymentStatus } from '@/types/database';

const STATUS: Record<PaymentStatus, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  paid: { label: 'Payé', tone: 'success' },
  pending: { label: 'En attente', tone: 'warning' },
  failed: { label: 'Échoué', tone: 'danger' },
};

export function AdminPayments() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(100);
    if (err) return setError('Impossible de charger les paiements.');
    const list = (data as Payment[]) ?? [];
    setPayments(list);
    const ids = [...new Set(list.map((p) => p.user_id))];
    if (ids.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, email').in('id', ids);
      setEmails(Object.fromEntries(((profiles as { id: string; email: string | null }[] | null) ?? []).map((p) => [p.id, p.email ?? ''])));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function validate(p: Payment) {
    if (!window.confirm(`Valider manuellement ce paiement et créditer ${creditsLabel(p.credits)} ?`)) return;
    setBusyId(p.id);
    try {
      await callFn('admin-validate-payment', { payment_id: p.id });
      toast('Paiement validé, crédits ajoutés.', 'success');
      await load();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <Notice kind="error">{error}</Notice>;
  if (!payments) return <div className="skeleton h-40" />;
  if (payments.length === 0) return <p className="text-sm text-muted-foreground">Aucun paiement pour le moment.</p>;

  return (
    <div className="space-y-3">
      {payments.map((p) => (
        <Card key={p.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{emails[p.user_id] || p.user_id}</p>
              <p className="text-sm">{creditsLabel(p.credits)} · {p.currency === 'XOF' ? formatFcfa(p.amount) : formatEur(p.amount)}</p>
              <p className="text-xs text-muted-foreground">{formatDate(p.created_at)} · {p.provider === 'saspay' ? 'SasPay' : 'Chariow'}{p.provider_ref ? ` · réf. ${p.provider_ref}` : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
              {p.status !== 'paid' && <Button size="sm" variant="outline" loading={busyId === p.id} onClick={() => validate(p)}>Valider manuellement</Button>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
