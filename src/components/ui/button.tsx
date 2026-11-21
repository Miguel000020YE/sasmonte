import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger' | 'secondary';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:pointer-events-none disabled:opacity-50';
const variants: Record<Variant, string> = {
  primary: 'bg-gradient-to-r from-primary to-amber-400 font-semibold text-primary-foreground shadow-glow hover:brightness-110',
  outline: 'border border-border bg-transparent hover:bg-muted',
  ghost: 'hover:bg-muted',
  danger: 'bg-destructive text-white hover:opacity-90',
  secondary: 'bg-muted hover:bg-muted/70',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
};

/** Pour styliser un <Link> comme un bouton. */
export const buttonStyles = (variant: Variant = 'primary', size: Size = 'md', className?: string) =>
  cn(base, variants[variant], sizes[size], className);

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} disabled={disabled || loading} className={buttonStyles(variant, size, className)} {...props}>
      {loading && <Spinner className="mr-2 h-4 w-4" />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
