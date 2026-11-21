import { Check, X } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export interface Step {
  key: string;
  label: string;
}

/** Progression étape par étape. `current` = clé de l'étape en cours, "done" = tout est terminé, null = rien (ou échec si `failedAt`). */
export function ProgressSteps({ steps, current, failedAt }: { steps: Step[]; current: string | null; failedAt?: string | null }) {
  const currentIndex = current === 'done' ? steps.length : steps.findIndex((s) => s.key === current);
  const failedIndex = failedAt ? steps.findIndex((s) => s.key === failedAt) : -1;

  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const failed = i === failedIndex;
        const done = !failed && i < currentIndex;
        const active = !failed && i === currentIndex;
        return (
          <li key={s.key} className="flex items-center gap-3">
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full border text-xs',
                done && 'border-success bg-success/20 text-success',
                active && 'border-primary bg-primary/15 text-primary',
                failed && 'border-destructive bg-destructive/15 text-destructive',
                !done && !active && !failed && 'border-border text-muted-foreground',
              )}
            >
              {done ? <Check className="h-4 w-4" /> : active ? <Spinner className="h-4 w-4" /> : failed ? <X className="h-4 w-4" /> : i + 1}
            </span>
            <span className={cn('text-sm', active ? 'font-medium text-foreground' : 'text-muted-foreground')}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
