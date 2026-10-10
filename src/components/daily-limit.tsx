"use client";

import Link from "next/link";
import { useApp } from "@/lib/store";

/** Shown when a user without a point has already published 3 personal listings in 24 hours. */
export function DailyLimitNotice() {
  const { t } = useApp();
  return (
    <p data-testid="daily-limit" className="text-[13px] leading-[1.45] text-accent">
      {t.dailyLimitLead}{" "}
      <Link href="/shops/new" className="font-semibold underline">
        {t.dailyLimitLink}
      </Link>
    </p>
  );
}
