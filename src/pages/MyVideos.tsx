import { ChevronDown, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResultCard } from '@/components/studio/ResultCard';
import { Badge } from '@/components/ui/badge';
import { Button, buttonStyles } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { useToast } from '@/context/ToastContext';
import { formatDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Generation, GenerationStatus } from '@/types/database';

const STATUS: Record<GenerationStatus, { label: string; tone: 'success' | 'warning' | 'danger' | 'muted' }> = {
  done: { label: 'Terminée', tone: 'success' },
  processing: { label: 'En cours', tone: 'warning' },
  pending: { label: 'En attente', tone: 'muted' },
  failed: { label: 'Échec · crédit rendu', tone: 'danger' },
};

const titleOf = (g: Generation) => g.script?.titre ?? g.input.topic ?? (g.mode === 'reverse' ? 'Recherche inversée' : 'Vidéo');

export function MyVideos() {
  const { toast } = useToast();
  const [items, setItems] = useState<Generation[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string | null>>({});

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('generations').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) return setLoadError(true);
    setItems((data as Generation[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(g: Generation) {
    if (openId === g.id) return setOpenId(null);
    setOpenId(g.id);
    if (g.audio_path && audioUrls[g.id] === undefined) {
      const { data } = await supabase.storage.from('audios').createSignedUrl(g.audio_path, 3600);
      setAudioUrls((u) => ({ ...u, [g.id]: data?.signedUrl ?? null }));
    }
  }

  async function remove(g: Generation) {
    if (!window.confirm('Supprimer cette vidéo ? Cette action est définitive.')) return;
    if (g.audio_path) await supabase.storage.from('audios').remove([g.audio_path]);
    const { error } = await supabase.from('generations').delete().eq('id', g.id);
    if (error) return toast('Suppression impossible. Réessaie.', 'error');
    setItems((list) => (list ?? []).filter((x) => x.id !== g.id));
    toast('Vidéo supprimée.', 'success');
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mes vidéos</h1>
        <p className="text-sm text-muted-foreground">Retrouve tes scripts, voix off et sous-titres.</p>
      </div>

      {loadError && <Notice kind="error">Impossible de charger tes vidéos. Réessaie dans un instant.</Notice>}

      {items === null && !loadError && <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-20" />)}</div>}

      {items?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-muted-foreground">Tu n'as pas encore généré de vidéo.</p>
            <Link to="/studio" className={buttonStyles('primary', 'md')}>Aller au Studio</Link>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {items?.map((g) => {
          const st = STATUS[g.status];
          const open = openId === g.id;
          return (
            <Card key={g.id}>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" onClick={() => toggle(g)} className="min-w-0 flex-1 text-left" aria-expanded={open}>
                    <p className="truncate font-semibold">{titleOf(g)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(g.created_at)} · {g.mode === 'reverse' ? 'Recherche inversée' : 'Sujet'}</p>
                  </button>
                  <div className="flex items-center gap-2">
                    <Badge tone={st.tone}>{st.label}</Badge>
                    <button type="button" onClick={() => toggle(g)} aria-label={open ? 'Fermer' : 'Ouvrir'}>
                      <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
                {open && (
                  <div className="space-y-3">
                    {g.script ? <ResultCard script={g.script} audioUrl={audioUrls[g.id] ?? null} srt={g.srt} /> : <p className="text-sm text-muted-foreground">Aucun script disponible pour cette génération.</p>}
                    {g.status !== 'processing' && (
                      <Button variant="ghost" size="sm" onClick={() => remove(g)} className="text-destructive hover:text-destructive">
                        <Trash2 className="mr-1.5 h-4 w-4" /> Supprimer
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
