import { Link } from 'react-router-dom';
import { buttonStyles } from '@/components/ui/button';

export function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-extrabold text-gradient">404</p>
      <p className="text-muted-foreground">Cette page n'existe pas ou a été déplacée.</p>
      <Link to="/" className={buttonStyles('primary', 'md')}>
        Retour à l'accueil
      </Link>
    </div>
  );
}
