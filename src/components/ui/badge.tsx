import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'muted' | 'success' | 'warning' | 'danger' | 'accent';
const tones: Record<Tone, string> = {
  muted: 'bg-muted text-muted-foreground',
  success: 'bg-success/15 text-success',
  warning: 'bg-amber-400/15 text-amber-300',
  danger: 'bg-destructive/15 text-destructive',
  accent: 'bg-primary/15 text-primary',
};

export function Badge({ tone = 'muted', className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone], className)} {...props} />;
}
