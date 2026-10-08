"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { IconPlus, IconSearch } from "./icons";

type Variant = "first" | "nothing" | "offline";

export function EmptyState({
  variant,
  onReset,
  onRetry,
  title,
  quiet,
}: {
  variant: Variant;
  onReset?: () => void;
  onRetry?: () => void;
  title?: string;
  quiet?: boolean;
}) {
  const { t } = useApp();
  const router = useRouter();
  const Icon = variant === "first" ? IconPlus : IconSearch;
  const heading = title ?? (variant === "first" ? t.feedEmptyTitle : variant === "offline" ? t.offlineTitle : t.empty);
  const hint = variant === "first" ? t.feedEmptyHint : variant === "offline" ? t.offlineHint : t.emptyHint;

  return (
    <div className="mt-8 rounded-[18px] border border-line bg-surface p-6 text-center">
      <div className="mb-3 flex justify-center">
        <Icon size={40} color="#A79C8C" />
      </div>
      <div className="text-[15px] font-semibold text-ink">{heading}</div>
      {quiet ? null : <p className="mt-2 text-[13px] text-muted">{hint}</p>}
      {quiet ? null : variant === "first" ? (
        <button
          type="button"
          onClick={() => router.push("/post")}
          className="mt-4 h-11 rounded-[12px] bg-accent px-4 text-[13px] font-semibold text-accent-on"
        >
          {t.feedEmptyCta}
        </button>
      ) : variant === "offline" ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 h-11 rounded-[12px] bg-accent px-4 text-[13px] font-semibold text-accent-on"
        >
          {t.uploadRetry}
        </button>
      ) : (
        <button type="button" onClick={onReset} className="mt-4 text-[13px] font-semibold text-accent">
          {t.resetFilters}
        </button>
      )}
    </div>
  );
}
