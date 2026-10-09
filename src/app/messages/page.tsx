"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import type { ChatRole, ChatThread } from "@/lib/chat";
import { formatWhen } from "@/lib/dates";
import { goBack } from "@/lib/go-back";
import { useApp } from "@/lib/store";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { Photo, RoundBtn } from "@/components/ui";

export default function MessagesPage() {
  const { t, lang, user, ready, setPendingPath } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<"all" | ChatRole>("all");
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const res = await api<{ threads?: ChatThread[] }>("/api/me/threads");
    if (!res.ok) return;
    setThreads(res.data?.threads ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!ready || !user?.id) return;
    void load();
    const timer = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(timer);
  }, [ready, user?.id, load]);

  if (!ready) return null;

  if (!user) {
    return (
      <PhoneShell>
        <div className="px-5 pt-2">
          <RoundBtn label={t.backLeave} onClick={() => goBack(router, "/profile")}>
            <IconBack size={16} color="#17140F" />
          </RoundBtn>
          <h1 className="mt-4 font-display text-[28px] font-extrabold text-ink">{t.inbox}</h1>
          <p className="mt-3 text-[15px] text-muted">{t.emptyInboxHint}</p>
          <button
            type="button"
            onClick={() => {
              setPendingPath("/messages");
              router.push("/login");
            }}
            className="shadow-btn mt-6 h-[54px] w-full rounded-2xl bg-accent font-semibold text-accent-on"
          >
            {t.loginCta}
          </button>
        </div>
      </PhoneShell>
    );
  }

  const visible = threads.filter((row) => tab === "all" || row.role === tab);
  const buyN = threads.filter((row) => row.role === "buy").length;
  const sellN = threads.filter((row) => row.role === "sell").length;

  return (
    <PhoneShell>
      <div className="flex items-center gap-3 px-5 pt-1">
        <RoundBtn label={t.backLeave} onClick={() => goBack(router, "/profile")}>
          <IconBack size={16} color="#17140F" />
        </RoundBtn>
        <h1 className="font-display text-[22px] font-bold text-ink">{t.inbox}</h1>
      </div>
      <div className="mt-3.5 flex gap-1 px-5">
        <div className="flex flex-1 rounded-[14px] bg-chip p-1">
          {(
            [
              ["all", t.inboxAll, threads.length],
              ["buy", t.inboxBuy, buyN],
              ["sell", t.inboxSell, sellN],
            ] as const
          ).map(([id, label, n]) => {
            const on = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className="flex-1 rounded-[11px] py-2 text-center text-[13px] font-semibold"
                style={{
                  background: on ? "#FFFFFF" : "transparent",
                  color: on ? "#17140F" : "#6E6558",
                  boxShadow: on ? "0 1px 3px rgba(23,20,15,.08)" : "none",
                }}
              >
                {label}
                {n ? ` · ${n}` : ""}
              </button>
            );
          })}
        </div>
      </div>
      <div className="sc mt-4 min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        {!loaded ? null : visible.length === 0 ? (
          <p className="mt-8 text-center text-[15px] leading-[1.5] text-muted">
            {tab === "sell" ? t.emptyInboxSell : tab === "buy" ? t.emptyInboxBuy : t.emptyInbox}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {visible.map((row) => {
              const peer = row.peerName || (row.role === "sell" ? t.peerBuyer : t.holdNoName);
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => router.push(`/chat/${row.id}`)}
                  className="flex w-full items-center gap-3 rounded-[18px] border border-line bg-white p-3 text-left"
                >
                  <div className="h-12 w-12 overflow-hidden rounded-[10px] bg-chip">
                    {row.photo ? <Photo src={row.photo} alt="" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-ink">{row.title || t.chatListingGone}</span>
                      <span className="shrink-0 text-xs text-muted-2">
                        {row.lastMessageAt ? formatWhen(row.lastMessageAt, lang) : ""}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                        style={{
                          background: row.role === "sell" ? "#F3E0D9" : "#E4EFE9",
                          color: row.role === "sell" ? "#8E3423" : "#2A6B57",
                        }}
                      >
                        {row.role === "sell" ? t.threadAsSell : t.threadAsBuy}
                      </span>
                      {peer ? <span className="truncate text-[12px] text-muted">{peer}</span> : null}
                    </div>
                    <div className="truncate text-[13px] text-muted">{row.preview || row.title}</div>
                  </div>
                  {row.unread > 0 ? (
                    <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[12px] font-bold text-accent-on">
                      {row.unread}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </PhoneShell>
  );
}
