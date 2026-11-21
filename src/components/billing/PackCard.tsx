import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatEur, formatFcfa, videosLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CreditPack } from '@/types/database';

interface Props {
  pack: CreditPack;
  highlighted?: boolean;
  showEur?: boolean;
  children?: ReactNode;
}

export function PackCard({ pack, highlighted, showEur, children }: Props) {
  const perVideo = Math.round(pack.price_xof / pack.credits);
  return (
    <Card className={cn('relative flex flex-col transition hover:-translate-y-0.5', highlighted && 'border-primary shadow-glow')}>
      {highlighted && (
        <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-r from-primary to-amber-400 px-3 py-0.5 text-xs font-bold text-primary-foreground">
          <Sparkles className="h-3 w-3" /> Populaire
        </span>
      )}
      <CardContent className="flex flex-1 flex-col gap-3">
        <h3 className="text-lg font-semibold">{pack.name}</h3>
        <div>
          <p className="text-3xl font-extrabold tracking-tight">{formatFcfa(pack.price_xof)}</p>
          {showEur && <p className="text-xs text-muted-foreground">≈ {formatEur(pack.price_eur)} par carte</p>}
        </div>
        <p className="text-sm font-medium text-primary">{videosLabel(pack.credits)}</p>
        <p className="text-xs text-muted-foreground">Soit {formatFcfa(perVideo)} la vidéo</p>
        <div className="mt-auto pt-2">{children}</div>
      </CardContent>
    </Card>
  );
}
