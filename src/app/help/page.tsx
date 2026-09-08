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
      <div className="px-5 pt-1">
        <RoundBtn onClick={() => router.back()}>
          <IconBack size={16} color="#17140F" />
        </RoundBtn>
        <h1 className="mt-5 font-display text-[28px] font-extrabold tracking-[-0.02em] text-ink">{t.helpTitle}</h1>
        <p className="mt-4 text-[15px] leading-[1.6] text-ink-2">{t.helpBody}</p>
        <p className="mt-6 text-xs leading-[1.5] text-muted-2">{t.credit}</p>
      </div>
    </PhoneShell>
  );
}
