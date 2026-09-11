import { discountPercent, formatTiyin } from './format';

export interface PriceProps {
  /** Tiyinda, satr sifatida (server shunday yuboradi). */
  value: string | bigint;
  oldValue?: string | bigint | null;
  size?: 'sm' | 'md' | 'lg';
  locale?: 'UZ' | 'RU';
}

export function Price({ value, oldValue, size = 'md', locale = 'UZ' }: PriceProps) {
  const pct = oldValue ? discountPercent(oldValue, value) : 0;
  const unit = locale === 'RU' ? 'сум' : 'so‘m';
  return (
    <span className={`alv-price alv-price--${size}`}>
      <span className="alv-price__value">{formatTiyin(value)}</span>
      <span className="alv-price__unit">{unit}</span>
      {oldValue ? <s className="alv-price__old">{formatTiyin(oldValue)}</s> : null}
      {pct > 0 ? <span className="alv-price__pct">-{pct}%</span> : null}
    </span>
  );
}
