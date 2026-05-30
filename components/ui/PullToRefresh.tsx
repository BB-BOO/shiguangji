"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const THRESHOLD = 60;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (refreshing) return;
    const scrollTop = window.scrollY;
    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      // Dampen the pull
      setPullDistance(Math.min(dy * 0.4, 100));
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd);
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div ref={containerRef}>
      {/* Pull indicator — GreetingBanner style */}
      <div
        className="overflow-hidden transition-all duration-200"
        style={{ height: pullDistance }}
      >
        <div className="mx-5 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-lime-50 px-4 py-3">
          <span className="text-xl">
            {refreshing ? (
              <svg className="h-5 w-5 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
                <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            ) : (
              <span>☀️</span>
            )}
          </span>
          <p className="text-[14px] leading-relaxed text-[var(--color-text)]">
            {refreshing
              ? "正在刷新…"
              : pullDistance >= THRESHOLD
                ? "松开刷新"
                : "下拉刷新"}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}
