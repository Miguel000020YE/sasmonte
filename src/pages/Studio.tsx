import { ImagePlus, Link2, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProgressSteps, type Step } from '@/components/studio/ProgressSteps';
import { ResultCard } from '@/components/studio/ResultCard';
import { VoicePicker } from '@/components/studio/VoicePicker';
import { Button, buttonStyles } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label, Select, Textarea } from '@/components/ui/input';
import { Notice } from '@/components/ui/notice';
import { useAuth } from '@/context/AuthContext';
import { callFn, errorMessage } from '@/lib/api';
import { MAX_GENERATIONS_PER_HOUR } from '@/lib/brand';
import { supabase } from '@/lib/supabase';
import type { VoiceKey } from '@/lib/voices';
import { cn } from '@/lib/utils';
import type { LensResult, Script, Tone } from '@/types/database';

type Mode = 'topic' | 'reverse';

interface ScriptResp {
  generation_id: string;
  script: Script;
  results?: LensResult[];
}
interface VoiceResp {
  audio_url: string | null;
  srt: string | null;
  script: Script;
}
interface Draft {
  generationId: string;
  script: Script;
  results?: LensResult[];
}
interface Result extends Draft {
  audioUrl: string | null;
  srt: string | null;
}

const TONES: { value: Tone; label: string }[] = [
  { value: 'percutant', label: 'Percutant' },
  { value: 'humoristique', label: 'Humoristique' },
  { value: 'inspirant', label: 'Inspirant' },
  { value: 'dramatique', label: 'Dramatique' },
  { value: 'educatif', label: 'Éducatif' },
  { value: 'mysterieux', label: 'Mystérieux' },
];

const STEPS: Record<Mode, Step[]> = {
  topic: [
    { key: 'script', label: 'Écriture du script' },
    { key: 'voice', label: 'Voix off et sous-titres' },
  ],
  reverse: [
    { key: 'search', label: 'Recherche de la source et réécriture' },
    { key: 'voice', label: 'Voix off et sous-titres' },
  ],
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function Studio() {
  const { user, profile, refreshProfile } = useAuth();
  const credits = profile?.credits ?? 0;

  const [mode, setMode] = useState<Mode>('topic');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<Tone>('percutant');
  const [voice, setVoice] = useState<VoiceKey>('femme-chaleureuse');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [failedAt, setFailedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [partial, setPartial] = useState<Draft | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const firstStep = STEPS[mode][0].key;
  const ready = mode === 'topic' ? topic.trim().length >= 3 : !!file;
  const showProgress = running || (current !== null && current !== 'done') || failedAt !== null;

  function pickFile(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (!IMAGE_TYPES.includes(f.type)) return setError('Envoie une image JPG, PNG ou WebP.');
    if (f.size > MAX_IMAGE_BYTES) return setError("Cette image est trop lourde (5 Mo maximum).");
    setFile(f);
  }

  function reset() {
    setResult(null);
    setPartial(null);
    setError(null);
    setCurrent(null);
    setFailedAt(null);
    setFile(null);
    setTopic('');
  }

  async function generate() {
    if (!user || running) return;
    setError(null);
    setResult(null);
    setPartial(null);
    setFailedAt(null);
    setRunning(true);

    let gen: ScriptResp;
    try {
      setCurrent(firstStep);
      if (mode === 'topic') {
        gen = await callFn<ScriptResp>('generate-script', { topic: topic.trim(), tone });
      } else {
        if (!file) throw new Error('Choisis une image.');
        const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upError } = await supabase.storage.from('reverse-inputs').upload(path, file, { contentType: file.type });
        if (upError) throw new Error("Impossible d'envoyer l'image. Réessaie avec une autre capture.");
        gen = await callFn<ScriptResp>('reverse-search', { image_path: path, tone });
      }
    } catch (e) {
      setFailedAt(firstStep);
      setCurrent(null);
      setError(errorMessage(e));
      setRunning(false);
      await refreshProfile();
      return;
    }

    const base: Draft = { generationId: gen.generation_id, script: gen.script, results: gen.results };
    setPartial(base);
    setCurrent('voice');
    try {
      const v = await callFn<VoiceResp>('generate-voice', { generation_id: gen.generation_id, voice_key: voice });
      setResult({ ...base, audioUrl: v.audio_url, srt: v.srt });
      setCurrent('done');
    } catch (e) {
      setFailedAt('voice');
      setCurrent(null);
      setError(errorMessage(e));
    } finally {
      setRunning(false);
      await refreshProfile();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Studio</h1>
        <p className="text-sm text-muted-foreground">Crée le script, la voix off et les sous-titres de ta prochaine vidéo.</p>
      </div>

      {credits === 0 && !running && !result && (
        <Notice kind="error">
          <p className="mb-2">Tu n'as plus de crédits.</p>
          <Link to="/acheter" className={buttonStyles('primary', 'sm')}>Acheter des crédits</Link>
        </Notice>
      )}

      {result ? (
        <div className="space-y-4">
          <ResultCard script={result.script} audioUrl={result.audioUrl} srt={result.srt} />
          {result.results && result.results.length > 0 && (
            <Card>
              <CardContent className="space-y-3">
                <p className="text-sm font-semibold">Sources retrouvées</p>
                <ul className="space-y-2">
                  {result.results.map((r) => (
                    <li key={r.link}>
                      <a href={r.link} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <Link2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0 break-words">{r.title}{r.source ? ` · ${r.source}` : ''}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          <Button variant="outline" onClick={reset} className="w-full sm:w-auto">
            <Sparkles className="mr-2 h-4 w-4" /> Nouvelle vidéo
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-card p-1" role="tablist">
            {([['topic', 'Sujet'], ['reverse', 'Recherche inversée']] as const).map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                disabled={running}
                onClick={() => { setMode(m); setError(null); setFailedAt(null); setCurrent(null); }}
                className={cn('rounded-md px-3 py-2.5 text-sm font-medium transition', mode === m ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                {label}
              </button>
            ))}
          </div>

          <Card>
            <CardContent className="space-y-5">
              {mode === 'topic' ? (
                <div>
                  <Label htmlFor="topic">De quoi parle ta vidéo ?</Label>
                  <Textarea id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={500} disabled={running}
                    placeholder="Ex. 3 erreurs qui t'empêchent de gagner de l'argent avec ton téléphone" />
                  <p className="mt-1 text-right text-xs text-muted-foreground">{topic.length}/500</p>
                </div>
              ) : (
                <div>
                  <Label>Capture d'écran d'une vidéo virale</Label>
                  {preview ? (
                    <div className="relative mx-auto w-40 overflow-hidden rounded-md border border-border">
                      <img src={preview} alt="Aperçu de la capture" className="aspect-[9/16] w-full object-cover" />
                      <button type="button" onClick={() => setFile(null)} disabled={running} aria-label="Retirer l'image"
                        className="absolute right-1.5 top-1.5 rounded-full bg-background/80 p-1.5"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground transition hover:bg-muted/50">
                      <ImagePlus className="h-8 w-8 text-primary" />
                      Touche pour choisir une image (JPG, PNG, WebP · 5 Mo max)
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
                    </label>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">Ta capture sert uniquement à la recherche puis elle est supprimée.</p>
                </div>
              )}

              <div>
                <Label htmlFor="tone">Ton</Label>
                <Select id="tone" value={tone} onChange={(e) => setTone(e.target.value as Tone)} disabled={running}>
                  {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </div>

              <div>
                <Label>Voix off</Label>
                <VoicePicker value={voice} onChange={setVoice} disabled={running} />
              </div>

              <Button size="lg" className="w-full" onClick={generate} loading={running} disabled={!ready || credits === 0}>
                Générer (1 crédit)
              </Button>
              <p className="text-center text-xs text-muted-foreground">Limite de {MAX_GENERATIONS_PER_HOUR} générations par heure. Crédit remboursé automatiquement en cas d'échec.</p>
            </CardContent>
          </Card>
        </>
      )}

      {showProgress && !result && (
        <Card>
          <CardContent><ProgressSteps steps={STEPS[mode]} current={current} failedAt={failedAt} /></CardContent>
        </Card>
      )}

      {error && <Notice kind="error">{error}</Notice>}

      {!result && partial && !running && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Voici quand même ton script :</p>
          <ResultCard script={partial.script} audioUrl={null} srt={null} />
        </div>
      )}
    </div>
  );
}
