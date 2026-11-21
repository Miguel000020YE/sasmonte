import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Notice } from '@/components/ui/notice';
import { useToast } from '@/context/ToastContext';
import { callFn, errorMessage } from '@/lib/api';
import { countryName } from '@/lib/countries';
import { formatDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

export function AdminUsers() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<Profile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (term: string) => {
    setError(null);
    let query = supabase.from('profiles').select('*');
    const s = term.trim().replace(/[^\p{L}\p{N}@._ -]/gu, ''); // pas de caractères spéciaux dans le filtre
    if (s) query = query.or(`email.ilike.%${s}%,full_name.ilike.%${s}%`);
    const { data, error: err } = await query.order('created_at', { ascending: false }).limit(50);
    if (err) return setError('Impossible de charger les utilisateurs.');
    setUsers((data as Profile[]) ?? []);
  }, []);

  useEffect(() => {
    load('');
  }, [load]);

  async function submitAdjust(e: FormEvent, userId: string) {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isInteger(n) || n === 0) return toast('Indique un nombre entier (positif pour ajouter, négatif pour retirer).', 'error');
    if (reason.trim().length < 3) return toast('Indique un motif.', 'error');
    setSaving(true);
    try {
      const r = await callFn<{ credits: number }>('admin-adjust-credits', { user_id: userId, amount: n, reason: reason.trim() });
      toast(`Solde mis à jour : ${r.credits} crédit(s).`, 'success');
      setEditingId(null);
      setAmount('');
      setReason('');
      await load(search);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); load(search); }} className="flex gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par email ou nom" aria-label="Rechercher un utilisateur" />
        <Button type="submit" variant="secondary">Chercher</Button>
      </form>

      {error && <Notice kind="error">{error}</Notice>}
      {users === null && !error && <div className="skeleton h-32" />}
      {users?.length === 0 && <p className="text-sm text-muted-foreground">Aucun utilisateur trouvé.</p>}

      <div className="space-y-3">
        {users?.map((u) => (
          <Card key={u.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{u.full_name || 'Sans nom'}</p>
                  <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                  <p className="text-xs text-muted-foreground">{countryName(u.country_code) || 'Pays inconnu'} · inscrit le {formatDate(u.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold">{u.credits}</p>
                  <p className="text-xs text-muted-foreground">crédits</p>
                </div>
              </div>
              {editingId === u.id ? (
                <form onSubmit={(e) => submitAdjust(e, u.id)} className="grid gap-2 sm:grid-cols-[120px_1fr_auto]">
                  <Input type="number" step={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="+5 ou -2" aria-label="Montant" />
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif (obligatoire)" maxLength={200} aria-label="Motif" />
                  <div className="flex gap-2">
                    <Button type="submit" loading={saving}>Valider</Button>
                    <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>Annuler</Button>
                  </div>
                </form>
              ) : (
                <Button variant="outline" size="sm" onClick={() => { setEditingId(u.id); setAmount(''); setReason(''); }}>Ajuster les crédits</Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
