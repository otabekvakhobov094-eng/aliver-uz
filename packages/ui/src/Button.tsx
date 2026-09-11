import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'dark' | 'outline' | 'soft' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const VARIANT: Record<Variant, string> = {
  primary: 'alv-btn--primary',
  dark: 'alv-btn--dark',
  outline: 'alv-btn--outline',
  soft: 'alv-btn--soft',
  ghost: 'alv-btn--ghost',
};

const SIZE: Record<Size, string> = {
  sm: 'alv-btn--sm',
  md: 'alv-btn--md',
  lg: 'alv-btn--lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  iconLeft,
  iconRight,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [
    'alv-btn',
    VARIANT[variant],
    SIZE[size],
    fullWidth ? 'alv-btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={classes} {...rest}>
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
