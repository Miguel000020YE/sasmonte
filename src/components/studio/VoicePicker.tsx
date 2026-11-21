import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { previewUrl, VOICE_CATALOG, type VoiceKey } from '@/lib/voices';
import { cn } from '@/lib/utils';

interface Props {
  value: VoiceKey;
  onChange: (key: VoiceKey) => void;
  disabled?: boolean;
}

/** Choix de la voix (femme / homme) avec aperçu audio. */
export function VoicePicker({ value, onChange, disabled }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [missing, setMissing] = useState<Record<string, boolean>>({});

  useEffect(() => () => audioRef.current?.pause(), []);

  function toggle(key: string) {
    if (playing === key) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(previewUrl(key));
    audio.onended = () => setPlaying(null);
    audio.onerror = () => {
      setMissing((m) => ({ ...m, [key]: true }));
      setPlaying(null);
    };
    audioRef.current = audio;
    setPlaying(key);
    audio.play().catch(() => {
      setMissing((m) => ({ ...m, [key]: true }));
      setPlaying(null);
    });
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Voix off">
      {VOICE_CATALOG.map((v) => {
        const selected = v.key === value;
        return (
          <div
            key={v.key}
            role="radio"
            aria-checked={selected}
            tabIndex={disabled ? -1 : 0}
            onClick={() => !disabled && onChange(v.key)}
            onKeyDown={(e) => {
              if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onChange(v.key);
              }
            }}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-md border p-3 transition',
              selected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/60',
              disabled && 'pointer-events-none opacity-60',
            )}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggle(v.key);
              }}
              disabled={missing[v.key]}
              aria-label={playing === v.key ? `Arrêter l'aperçu de ${v.label}` : `Écouter ${v.label}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted transition hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
            >
              {playing === v.key ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{v.label}</p>
              <p className="truncate text-xs text-muted-foreground">{missing[v.key] ? 'Aperçu bientôt disponible' : v.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
