import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Notice } from '@/components/ui/notice';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';
import type { CreditPack } from '@/types/database';

interface Draft {
  id: string;
  isNew: boolean;
  name: string;
  credits: number;
  price_xof: number;
  price_eur: number;
  chariow_url: string;
  active: boolean;
  sort_order: number;
}

const toDraft = (p: CreditPack): Draft => ({ ...p, isNew: false, chariow_url: p.chariow_url ?? '' });

export function AdminPacks() {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Les admins voient aussi les packs inactifs (policy "packs_admin_all")
    const { data, error: err } = await supabase.from('credit_packs').select('*').order('sort_order');
    if (err) return setError('Impossible de charger les packs.');
    setDrafts(((data as CreditPack[]) ?? []).map(toDraft));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patch = (id: string, change: Partial<Draft>) => setDrafts((list) => (list ?? []).map((d) => (d.id === id ? { ...d, ...change } : d)));

  function addNew() {
    setDrafts((list) => [
      ...(list ?? []),
      { id: `new-${Date.now()}`, isNew: true, name: '', credits: 10, price_xof: 5000, price_eur: 7.6, chariow_url: '', active: false, sort_order: (list?.length ?? 0) + 1 },
    ]);
  }

  async function save(d: Draft) {
    if (!d.name.trim()) return toast('Donne un nom au pack.', 'error');
    if (!Number.isInteger(d.credits) || d.credits <= 0) return toast('Le nombre de crédits doit être un entier positif.', 'error');
    if (!Number.isInteger(d.price_xof) || d.price_xof <= 0) return toast('Le prix en FCFA doit être un entier positif.', 'error');
    if (!(d.price_eur > 0)) return toast('Le prix en euros doit être positif.', 'error');
    const url = d.chariow_url.trim();
    if (url && !/^https:\/\//i.test(url)) return toast('Le lien Chariow doit commencer par https://', 'error');

    const row = { name: d.name.trim(), credits: d.credits, price_xof: d.price_xof, price_eur: d.price_eur, chariow_url: url || null, active: d.active, sort_order: d.sort_order };
    setSavingId(d.id);
    const { error: err } = d.isNew ? await supabase.from('credit_packs').insert(row) : await supabase.from('credit_packs').update(row).eq('id', d.id);
    setSavingId(null);
    if (err) return toast("Enregistrement impossible. Vérifie les valeurs et tes droits d'administrateur.", 'error');
    toast('Pack enregistré.', 'success');
    await load();
  }

  if (error) return <Notice kind="error">{error}</Notice>;
  if (!drafts) return <div className="skeleton h-40" />;

  return (
    <div className="space-y-4">
      <Notice kind="info">Pour retirer un pack de la vente, désactive-le plutôt que de le supprimer (l'historique des paiements y reste lié).</Notice>
      {drafts.map((d) => (
        <Card key={d.id}>
          <CardContent className="space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Nom</Label><Input value={d.name} onChange={(e) => patch(d.id, { name: e.target.value })} maxLength={60} /></div>
              <div><Label>Crédits (vidéos)</Label><Input type="number" min={1} value={d.credits} onChange={(e) => patch(d.id, { credits: Number(e.target.value) })} /></div>
              <div><Label>Prix (FCFA)</Label><Input type="number" min={1} value={d.price_xof} onChange={(e) => patch(d.id, { price_xof: Number(e.target.value) })} /></div>
              <div><Label>Prix (€)</Label><Input type="number" min={0.01} step={0.01} value={d.price_eur} onChange={(e) => patch(d.id, { price_eur: Number(e.target.value) })} /></div>
              <div className="sm:col-span-2"><Label>Lien produit Chariow</Label><Input type="url" value={d.chariow_url} onChange={(e) => patch(d.id, { chariow_url: e.target.value })} placeholder="https://…" /></div>
              <div><Label>Ordre d'affichage</Label><Input type="number" value={d.sort_order} onChange={(e) => patch(d.id, { sort_order: Number(e.target.value) })} /></div>
              <label className="flex items-center gap-2 pt-6 text-sm">
                <input type="checkbox" checked={d.active} onChange={(e) => patch(d.id, { active: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                Pack actif (visible à la vente)
              </label>
            </div>
            <Button onClick={() => save(d)} loading={savingId === d.id}>{d.isNew ? 'Créer le pack' : 'Enregistrer'}</Button>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" onClick={addNew}><Plus className="mr-1.5 h-4 w-4" /> Nouveau pack</Button>
    </div>
  );
}
