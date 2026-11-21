import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from './Logo';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10">
      <div className="mb-6">
        <Logo />
      </div>
      <Card className="w-full max-w-md animate-fade-up">
        <CardContent className="space-y-5 p-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
