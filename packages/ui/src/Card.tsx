import type { HTMLAttributes } from 'react';

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['alv-card', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}
