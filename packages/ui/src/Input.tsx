'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, id, className, ...rest },
  ref,
) {
  const inputId = id ?? rest.name ?? undefined;
  return (
    <div className="alv-field">
      {label ? (
        <label className="alv-field__label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        className={['alv-input', error ? 'alv-input--error' : '', className]
          .filter(Boolean)
          .join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error && inputId ? `${inputId}-error` : undefined}
        {...rest}
      />
      {error ? (
        <p className="alv-field__error" id={inputId ? `${inputId}-error` : undefined} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="alv-field__hint">{hint}</p>
      ) : null}
    </div>
  );
});
