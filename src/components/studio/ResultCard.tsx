import { Check, Copy, Download, FileText, Music } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/context/ToastContext';
import { copyText, safeFilename, saveFromUrl, saveText, scriptToText } from '@/lib/download';
import type { Script } from '@/types/database';

interface Props {
  script: Script;
  audioUrl: string | null;
  srt: string | null;
}

/** Résultat d'une génération : script, lecteur audio, copier / télécharger (script, MP3, SRT). */
export function ResultCard({ script, audioUrl, srt }: Props) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const base = safeFilename(script.titre);

  async function copy() {
    const ok = await copyText(scriptToText(script));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else toast("Copie impossible sur cet appareil. Sélectionne le texte à la main.", 'error');
  }

  return (
    <Card className="animate-fade-up">
      <CardContent className="space-y-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Titre</p>
          <h2 className="text-xl font-bold leading-snug">{script.titre}</h2>
        </div>

        {audioUrl ? (
          <audio controls preload="metadata" src={audioUrl} className="w-full" />
        ) : (
          <p className="text-sm text-muted-foreground">Voix off non disponible.</p>
        )}

        <div className="space-y-3 text-[15px] leading-relaxed">
          <p className="font-semibold text-primary">{script.hook}</p>
          <p className="whitespace-pre-line">{script.script}</p>
          <p className="font-medium">{script.cta}</p>
          <p className="text-sm text-muted-foreground">{script.hashtags.join(' ')}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={copy}>
            {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
            {copied ? 'Copié !' : 'Copier le script'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => saveText(scriptToText(script), `${base}.txt`)}>
            <FileText className="mr-1.5 h-4 w-4" /> Script (.txt)
          </Button>
          {audioUrl && (
            <Button variant="outline" size="sm" onClick={() => saveFromUrl(audioUrl, `${base}.mp3`)}>
              <Music className="mr-1.5 h-4 w-4" /> Voix off (.mp3)
            </Button>
          )}
          {srt && (
            <Button variant="outline" size="sm" onClick={() => saveText(srt, `${base}.srt`, 'application/x-subrip;charset=utf-8')}>
              <Download className="mr-1.5 h-4 w-4" /> Sous-titres (.srt)
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
