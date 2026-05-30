import { Card } from "@/components/ui/Card";
import { IconQuote, IconSparkle } from "@/components/ui/Icons";
import type { MealAnalysisResponse } from "@/lib/types";

interface MealResultCardProps {
  analysis: MealAnalysisResponse;
}

export function MealResultCard({ analysis }: MealResultCardProps) {
  return (
    <Card title="分析结果" icon={<IconSparkle className="h-4 w-4" />}>
      <div className="highlight-quote relative overflow-hidden rounded-2xl px-4 py-4">
        <IconQuote className="absolute right-3 top-3 h-8 w-8 text-emerald-600/20" />
        <p className="relative text-[15px] font-medium leading-relaxed text-[var(--color-primary-dark)]">
          {analysis.feedback.length > 20 ? analysis.feedback.slice(0, 20) + "…" : analysis.feedback}
        </p>
      </div>
      <div className="mt-5">
        <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted)]">
          <span className="h-1 w-1 rounded-full bg-[var(--color-primary)]" />
          具体分析
        </p>
        <p className="whitespace-pre-line text-sm leading-[1.75] text-[var(--color-text)]/90">
          {analysis.analysis_text}
        </p>
      </div>
    </Card>
  );
}
