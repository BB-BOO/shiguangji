interface RatingBadgeProps {
  label: string;
  className: string;
}

export function RatingBadge({ label, className }: RatingBadgeProps) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}
