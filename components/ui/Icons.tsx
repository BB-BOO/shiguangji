import type { ReactElement } from "react";

type IconProps = { className?: string };

const base = "shrink-0";

export function IconProtein({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.12" />
      <path
        d="M8 14c0-2.2 1.8-4 4-4s4 1.8 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M12 6v3M9 8.5l1.5 1M15 8.5l-1.5 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconVegetable({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20c-3-2-5-5-5-9a5 5 0 0110 0c0 4-2 7-5 9z"
        fill="currentColor"
        opacity="0.15"
      />
      <path
        d="M12 4v16M8 10c2-3 4-3 4 0M16 10c-2-3-4-3-4 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconCarbs({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <ellipse cx="12" cy="14" rx="7" ry="4" fill="currentColor" opacity="0.12" />
      <path
        d="M6 14c0-3.3 2.7-6 6-6s6 2.7 6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M9 8h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconFat({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 14c0-3.3 2.7-6 6-6 2.2 0 4.1 1.2 5.1 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16" r="3" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

export function IconCalorie({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 3L8 13h4l-1 8 7-12h-4l-1-6z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

export function IconSparkle({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.4 4.2L18 8l-4.6 1.8L12 14l-1.4-4.2L6 8l4.6-1.8L12 2zm0 10l.8 2.4L15 15l-2.2.9L12 18l-.8-2.1L9 15l2.2-.6L12 12z" />
    </svg>
  );
}

export function IconChart({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="12" width="4" height="8" rx="1.5" fill="currentColor" opacity="0.35" />
      <rect x="10" y="8" width="4" height="12" rx="1.5" fill="currentColor" opacity="0.55" />
      <rect x="16" y="5" width="4" height="15" rx="1.5" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

export function IconMeal({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10h16v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M4 10c0-2 2-4 4-4h8c2 0 4 2 4 4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="14" r="2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

export function IconLeaf({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3C8 8 5 12 5 17a7 7 0 0014 0c0-5-3-9-7-14z"
        fill="currentColor"
        opacity="0.2"
      />
      <path
        d="M12 3v18M12 8c-2 3-3 6-3 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconPlus({ className = "h-7 w-7" }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconRefresh({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M21 12a9 9 0 11-2.5-6.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconTarget({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" opacity="0.25" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.6" opacity="0.45" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function IconHistory({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" opacity="0.2" />
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconTrash({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 7h14M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M19 7l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconEdit({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15.5 5.5l3 3L8 19H5v-3L15.5 5.5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconBack({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconQuote({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 12c0-2.8 1.5-5 4-6.5C9 8 7 10 7 12zm10 0c0-2.8 1.5-5 4-6.5 2 2.5 0 4.5 0 6.5z" opacity="0.35" />
    </svg>
  );
}

export type NutrientIconKey = "protein" | "vegetables" | "carbs" | "fat" | "calories";

const NUTRIENT_ICONS: Record<NutrientIconKey, (props: IconProps) => ReactElement> = {
  protein: IconProtein,
  vegetables: IconVegetable,
  carbs: IconCarbs,
  fat: IconFat,
  calories: IconCalorie,
};

const NUTRIENT_COLORS: Record<NutrientIconKey, string> = {
  protein: "text-emerald-600 bg-emerald-50",
  vegetables: "text-lime-600 bg-lime-50",
  carbs: "text-amber-600 bg-amber-50",
  fat: "text-orange-500 bg-orange-50",
  calories: "text-rose-500 bg-rose-50",
};

export function NutrientIconBadge({ type, className }: { type: NutrientIconKey; className?: string }) {
  const Icon = NUTRIENT_ICONS[type];
  return (
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-xl ${NUTRIENT_COLORS[type]} ${className ?? ""}`}
    >
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}
