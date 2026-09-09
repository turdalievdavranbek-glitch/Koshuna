"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";

export default function FromInstagramPage() {
  const { t, user, setPendingPath } = useApp();
  const router = useRouter();

  const post = () => {
    if (!user) {
      setPendingPath("/post");
      router.push("/login");
      return;
    }
    router.push("/post");
  };

  return (
    <PhoneShell>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface"
        >
          <IconBack size={16} color="#17140F" />
        </button>
        <div className="mt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.bridgeIg}</div>
        <h1 className="mt-2 font-display text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-ink">
          {t.igTitle}
        </h1>
        <p className="mt-3 text-[15px] leading-[1.55] text-muted">{t.igLead}</p>

        <ol className="mt-5 flex flex-col gap-3">
          {[t.igStep1, t.igStep2, t.igStep3].map((step, i) => (
            <li key={step} className="flex gap-3 rounded-[16px] border border-line bg-white p-3.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink font-display text-sm font-bold text-screen">
                {i + 1}
              </span>
              <span className="text-[14px] leading-[1.45] text-ink">{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-5 rounded-[18px] bg-accent-tint p-4">
          <div className="font-display text-[16px] font-bold text-accent-dark">{t.igWhyTitle}</div>
          <p className="mt-1.5 text-[13px] leading-[1.5] text-safe">{t.igWhy}</p>
        </div>

        <button
          type="button"
          onClick={post}
          className="shadow-btn mt-6 flex h-[54px] w-full items-center justify-center rounded-2xl bg-accent text-base font-semibold text-accent-on"
        >
          {t.igCta}
        </button>
        <button
          type="button"
          onClick={() => router.push("/story/apt-sunny")}
          className="mt-2.5 flex h-[54px] w-full items-center justify-center rounded-2xl border border-line bg-white text-[15px] font-semibold text-ink"
        >
          {t.igExample}
        </button>
      </div>
    </PhoneShell>
  );
}
