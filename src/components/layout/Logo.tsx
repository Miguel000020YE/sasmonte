import { Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BRAND_NAME } from '@/lib/brand';

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 font-bold tracking-tight">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-amber-400 text-primary-foreground">
        <Play className="h-4 w-4 fill-current" />
      </span>
      <span className="text-lg">{BRAND_NAME}</span>
    </Link>
  );
}
