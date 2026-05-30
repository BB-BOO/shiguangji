import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  icon?: ReactNode;
}

export function Card({ children, className = "", title, icon }: CardProps) {
  return (
    <section className={`card-elevated rounded-[22px] p-5 ${className}`}>
      {title && (
        <div className="mb-4 flex items-center gap-2.5">
          {icon && (
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)]">
              {icon}
            </span>
          )}
          <h2 className="text-[16px] font-semibold tracking-tight text-[var(--color-text)]">
            {title}
          </h2>
        </div>
      )}
      {children}
    </section>
  );
}
