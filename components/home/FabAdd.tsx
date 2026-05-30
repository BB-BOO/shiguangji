import Link from "next/link";
import { IconPlus } from "@/components/ui/Icons";

export function FabAdd() {
  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-gradient-to-t from-[#e4efe8] via-[#e4efe8]/90 to-transparent pb-8 pt-10">
      <div className="pointer-events-auto mx-auto w-full max-w-md px-5">
        <Link
          href="/meal"
          className="fab-glow mx-auto flex h-[58px] w-[58px] items-center justify-center rounded-full text-white"
          aria-label="添加单餐分析"
        >
          <IconPlus className="h-7 w-7" />
        </Link>
        <p className="mt-2.5 text-center text-[11px] font-medium text-[var(--color-muted)]">
          记录一餐
        </p>
      </div>
    </div>
  );
}
