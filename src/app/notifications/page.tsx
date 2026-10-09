"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { RoundBtn } from "@/components/ui";
import { formatWhen } from "@/lib/dates";
import { goBack } from "@/lib/go-back";
import { noticeText } from "@/lib/notice-text";
import { markNoticesRead, refreshNotices, useNotices } from "@/lib/notices";
import { useApp } from "@/lib/store";

export default function NotificationsPage() {
  const { t, lang, user, setPendingPath } = useApp();
  const userId = user?.id ?? null;
  const { notices, ready } = useNotices(userId);
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;
    let cancel = false;
    void refreshNotices(userId).then(() => {
      if (!cancel) void markNoticesRead(userId);
    });
    return () => {
      cancel = true;
    };
  }, [userId]);

  return (
    <PhoneShell>
      <div className="flex items-center gap-3 px-5 pt-1">
        <RoundBtn label={t.backLeave} onClick={() => goBack(router, "/")}>
          <IconBack size={16} color="#17140F" />
        </RoundBtn>
        <h1 className="font-display text-[22px] font-bold text-ink">{t.notifTitle}</h1>
      </div>
      <div className="mt-5 flex flex-col gap-2 px-5">
        {!userId ? (
          <div className="rounded-[18px] border border-line bg-white px-4 py-5">
            <p className="text-[15px] leading-[1.45] text-muted">{t.notifSignIn}</p>
            <button
              type="button"
              onClick={() => {
                setPendingPath("/notifications");
                router.push("/login");
              }}
              className="shadow-btn mt-4 h-12 w-full rounded-2xl bg-accent text-[15px] font-semibold text-accent-on"
            >
              {t.loginCta}
            </button>
          </div>
        ) : !ready ? null : notices.length === 0 ? (
          <p className="mt-4 text-center text-[13px] text-muted-2">{t.notifEmpty}</p>
        ) : (
          notices.map((row) => {
            const body = (
              <>
                <div className="text-[15px] leading-[1.4] text-ink">{noticeText(row, t)}</div>
                <div className="mt-1 text-xs text-muted-2">{formatWhen(row.createdAt, lang)}</div>
              </>
            );
            const className = "rounded-[18px] border border-line bg-white px-4 py-3.5";
            const href = row.params.threadId
              ? `/chat/${row.params.threadId}`
              : row.params.requestId
                ? "/requests"
                : row.listingId
                  ? `/listing/${row.listingId}`
                  : "";
            return href ? (
              <Link key={row.id} href={href} className={className}>
                {body}
              </Link>
            ) : (
              <div key={row.id} className={className}>
                {body}
              </div>
            );
          })
        )}
      </div>
    </PhoneShell>
  );
}
