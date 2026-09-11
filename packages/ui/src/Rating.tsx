export interface RatingProps {
  value: number;
  count?: number;
  size?: number;
}

const Star = ({ filled, size }: { filled: boolean; size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : '#E7DCE4'}
    aria-hidden="true"
  >
    <path d="M12 3.6l2.5 5.1 5.6.8-4.1 4 1 5.6-5-2.6-5 2.6 1-5.6-4.1-4 5.6-.8L12 3.6z" />
  </svg>
);

export function Rating({ value, count, size = 14 }: RatingProps) {
  const rounded = Math.round(value);
  return (
    <span className="alv-rating" role="img" aria-label={`Reyting: ${value.toFixed(1)} / 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} filled={i < rounded} size={size} />
      ))}
      {count !== undefined ? <span className="alv-rating__count">{count}</span> : null}
    </span>
  );
}
