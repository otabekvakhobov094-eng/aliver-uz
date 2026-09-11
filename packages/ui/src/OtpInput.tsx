'use client';

import { useEffect, useRef } from 'react';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * OTP maydoni. Prototipdagi "Kirish / OTP" ekraniga mos.
 * Har bir katak alohida input — mobil klaviaturada raqamli rejim ochiladi.
 */
export function OtpInput({ length = 5, value, onChange, disabled, autoFocus }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const setAt = (index: number, ch: string) => {
    const next = value.split('');
    next[index] = ch;
    onChange(next.join('').slice(0, length));
  };

  return (
    <div className="alv-otp" role="group" aria-label="Tasdiqlash kodi">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="alv-otp__cell"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          aria-label={`${i + 1}-raqam`}
          value={value[i] ?? ''}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, '').slice(-1);
            if (!ch) return;
            setAt(i, ch);
            refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !value[i]) {
              refs.current[i - 1]?.focus();
              setAt(i - 1, '');
            }
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
            if (!text) return;
            e.preventDefault();
            onChange(text);
            refs.current[Math.min(text.length, length - 1)]?.focus();
          }}
        />
      ))}
    </div>
  );
}
