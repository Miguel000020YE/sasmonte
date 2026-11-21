import { CreditCard, Smartphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { providerOrder, type Provider } from '@/lib/countries';
import { cn } from '@/lib/utils';

const META: Record<Provider, { label: string; hint: string; icon: typeof CreditCard }> = {
  saspay: { label: 'Mobile Money', hint: 'Paiement depuis ton téléphone', icon: Smartphone },
  chariow: { label: 'Carte bancaire', hint: 'Visa, Mastercard…', icon: CreditCard },
};

interface Props {
  country: string;
  value: Provider;
  onChange: (p: Provider) => void;
}

/** Les deux moyens de paiement, le plus adapté au pays en premier. L'utilisateur peut toujours changer. */
export function PaymentMethodPicker({ country, value, onChange }: Props) {
  const order = providerOrder(country);
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Moyen de paiement">
      {order.map((p, i) => {
        const { label, hint, icon: Icon } = META[p];
        const selected = value === p;
        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(p)}
            className={cn('flex items-center gap-3 rounded-md border p-3.5 text-left transition', selected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/60')}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"><Icon className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{label}</span>
              <span className="block text-xs text-muted-foreground">{hint}</span>
            </span>
            {i === 0 && <Badge tone="accent">Recommandé</Badge>}
          </button>
        );
      })}
    </div>
  );
}
