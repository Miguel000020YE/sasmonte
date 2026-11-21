import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Kind = 'error' | 'success' | 'info';
const styles: Record<Kind, string> = {
  error: 'border-destructive/40 bg-destructive/10',
  success: 'border-success/40 bg-success/10',
  info: 'border-border bg-muted/40',
};

/** Message d'erreur / succès / info en langage simple. */
export function Notice({ kind = 'info', children, className }: { kind?: Kind; children: ReactNode; className?: string }) {
  const Icon = kind === 'error' ? AlertCircle : kind === 'success' ? CheckCircle2 : Info;
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-md border p-3.5 text-sm', styles[kind], className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
