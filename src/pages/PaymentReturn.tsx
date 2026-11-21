import { CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { PaymentStatus } from '@/types/database';

type View = PaymentStatus | 'unknown' | 'timeout';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * /paiement/retour?ref=<payment_id> : suit l'état du paiement (lecture de SA ligne grâce à la RLS).
 * Le crédit est ajouté uniquement par le webhook serveur ; cette page ne fait qu'afficher le résultat.
 */
export function PaymentReturn() {
  const [params] = useSearchParams();
  const ref = params.get('ref');
  const { refreshProfile } = useAuth();
  const [view, setView] = useState<View>('pending');

  useEffect(() => {
    if (!ref || !UUID.test(ref)) return setView('unknown');
    const paymentId: string = ref;
    let stopped = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;

    async function check() {
      const { data } = await supabase.from('payments').select('status').eq('id', paymentId).maybeSingle();
      if (stopped) return;
      if (!data) return setView('unknown');
      const status = data.status as PaymentStatus;
      setView(status);
      if (status === 'paid') return void refreshProfile();
      if (status === 'failed') return;
      tries += 1;
      if (tries >= 20) return setView('timeout');
      timer = setTimeout(check, 3000);
    }
    check();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [ref, refreshProfile]);

  return (
    <div className="mx-auto max-w-md pt-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          {view === 'pending' && (
            <>
              <Spinner className="h-10 w-10 text-primary" />
              <h1 className="text-xl font-bold">Vérification du paiement…</h1>
              <p className="text-sm text-muted-foreground">Cela prend quelques secondes. Ne ferme pas cette page.</p>
            </>
          )}
          {view === 'paid' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-success" />
              <h1 className="text-xl font-bold">Paiement confirmé !</h1>
              <p className="text-sm text-muted-foreground">Tes crédits ont été ajoutés à ton compte.</p>
              <Link to="/studio" className={buttonStyles('primary', 'md')}>Créer une vidéo</Link>
            </>
          )}
          {view === 'failed' && (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <h1 className="text-xl font-bold">Le paiement a échoué</h1>
              <p className="text-sm text-muted-foreground">Aucun montant n'a été débité de ton crédit. Tu peux réessayer.</p>
              <Link to="/acheter" className={buttonStyles('primary', 'md')}>Réessayer</Link>
            </>
          )}
          {view === 'timeout' && (
            <>
              <h1 className="text-xl font-bold">Paiement en cours de confirmation</h1>
              <p className="text-sm text-muted-foreground">La confirmation prend plus de temps que prévu. Si tu as été débité, tes crédits arriveront automatiquement. Vérifie « Mon compte » dans quelques minutes.</p>
              <Link to="/compte" className={buttonStyles('outline', 'md')}>Voir mon compte</Link>
            </>
          )}
          {view === 'unknown' && (
            <>
              <h1 className="text-xl font-bold">Paiement introuvable</h1>
              <p className="text-sm text-muted-foreground">Nous ne retrouvons pas ce paiement. Consulte l'historique de ton compte.</p>
              <Link to="/compte" className={buttonStyles('outline', 'md')}>Voir mon compte</Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
