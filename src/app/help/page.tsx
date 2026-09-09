"use client";

import { useRouter } from "next/navigation";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { RoundBtn } from "@/components/ui";
import { useApp } from "@/lib/store";

export default function HelpPage() {
  const { t } = useApp();
  const router = useRouter();
  return (
    <PhoneShell>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-1">
        <RoundBtn onClick={() => router.back()}>
          <IconBack size={16} color="#17140F" />
        </RoundBtn>
        <h1 className="mt-5 font-display text-[28px] font-extrabold tracking-[-0.02em] text-ink">{t.helpTitle}</h1>
        <p className="mt-4 text-[15px] leading-[1.6] text-ink-2">{t.helpBody}</p>
        <button
          type="button"
          onClick={() => router.push("/strategy")}
          className="mt-5 w-full rounded-[18px] border border-line bg-white p-4 text-left"
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.strategyKicker}</div>
          <div className="mt-1 font-display text-[17px] font-bold leading-[1.25] text-ink">{t.strategyTitle.replace("\n", " ")}</div>
          <p className="mt-1.5 text-[13px] leading-[1.45] text-muted">{t.strategyLead}</p>
        </button>
        <p className="mt-6 text-xs leading-[1.5] text-muted-2">{t.credit}</p>
      </div>
    </PhoneShell>
  );
}
