import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { IconQuote, IconSparkle } from "@/components/ui/Icons";
import type { DailySummaryResponse } from "@/lib/types";

interface DailyResultCardProps {
  summary: DailySummaryResponse;
  onRate?: (satisfied: boolean) => void;
  rating?: boolean;
}

export function DailyResultCard({ summary, onRate, rating }: DailyResultCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card title="今日饮食评价" icon={<IconSparkle className="h-4 w-4" />}>
      <div className="highlight-quote relative overflow-hidden rounded-2xl px-4 py-4">
        <IconQuote className="absolute right-3 top-3 h-8 w-8 text-emerald-600/20" />
        <p className="relative text-[15px] font-medium leading-relaxed text-[var(--color-primary-dark)]">
          {summary.feedback.length > 30 ? summary.feedback.slice(0, 30) + "…" : summary.feedback}
        </p>
      </div>
      <div className="mt-5">
        <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted)]">
          <span className="h-1 w-1 rounded-full bg-[var(--color-primary)]" />
          具体分析
        </p>
        <p className={`whitespace-pre-line text-sm leading-[1.75] text-[var(--color-text)]/90 ${expanded ? "" : "line-clamp-4"}`}>
          {summary.analysis_text}
        </p>
        {summary.analysis_text.length > 120 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            {expanded ? "收起" : "展开"}
          </button>
        )}
      </div>

      {/* 满意度评价 */}
      {onRate && (
        <div className="mt-5 border-t border-[var(--color-border)] pt-4">
          {rating === undefined ? (
            <div className="text-center">
              <p className="mb-3 text-xs font-medium text-[var(--color-muted)]">这份总结对你有帮助吗？</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => onRate(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700 transition-all hover:bg-emerald-100 active:scale-[0.97]"
                >
                  😊 满意
                </button>
                <button
                  onClick={() => onRate(false)}
                  className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-4 py-2 text-xs font-medium text-[var(--color-muted)] transition-all hover:bg-gray-200 active:scale-[0.97]"
                >
                  😐 不满意
                </button>
              </div>
            </div>
          ) : (
            <p className="text-center text-xs text-[var(--color-muted)]">
              {rating ? "感谢反馈！😊" : "感谢反馈，我们会继续改进"}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
