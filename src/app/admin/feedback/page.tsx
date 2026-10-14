"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { isAdminUser } from "@/lib/partners";
import { useApp } from "@/lib/store";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";

type Item = {
  id: string;
  userId: string | null;
  userName: string | null;
  text: string;
  topic: string | null;
  contact: string | null;
  userEmail: string | null;
  pageUrl: string | null;
  platform: string | null;
  appVersion: string | null;
  hasPhoto: boolean;
  hasVoice: boolean;
  status: string;
  createdAt: string;
};

export default function AdminFeedbackPage() {
  const { t, user, lang, setPendingPath } = useApp();
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [tab, setTab] = useState<"new" | "handled">("new");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!user || !isAdminUser(user)) return;
    let cancelled = false;
    void api<{ items: Item[] }>("/api/admin/feedback").then((res) => {
      if (!cancelled) setItems(res.ok ? res.data?.items ?? [] : []);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    setPendingPath("/admin/feedback");
    router.push("/login");
    return null;
  }
  if (!isAdminUser(user)) {
    router.replace("/profile");
    return null;
  }

  const toggle = (item: Item) => {
    const status = item.status === "handled" ? "new" : "handled";
    setBusy(item.id);
    void api("/api/admin/feedback", { method: "POST", json: { id: item.id, status } }).then((res) => {
      setBusy("");
      if (res.ok) setItems((rows) => (rows ?? []).map((row) => (row.id === item.id ? { ...row, status } : row)));
    });
  };

  const all = items ?? [];
  const fresh = all.filter((row) => row.status !== "handled");
  const shown = tab === "new" ? fresh : all.filter((row) => row.status === "handled");
  const when = (iso: string) =>
    new Date(iso).toLocaleString(lang === "ky" ? "ky-KG" : "ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <PhoneShell>
      <div className="px-5 pb-2 pt-1">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => router.push("/admin")} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface">
            <IconBack size={16} color="#2A2550" />
          </button>
          <h1 className="font-display text-[17px] font-bold text-ink">{t.feedbackAdminTitle}</h1>
          <span className="w-9" />
        </div>
        <div className="mt-3 flex gap-2">
          {(["new", "handled"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`h-9 flex-1 rounded-full border text-[13px] font-semibold ${tab === key ? "border-ink bg-ink text-screen" : "border-line bg-white text-ink"}`}
            >
              {key === "new" ? `${t.feedbackNew} · ${fresh.length}` : t.feedbackHandled}
            </button>
          ))}
        </div>
      </div>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        {items === null ? null : shown.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted">{t.empty}</p>
        ) : (
          <div className="flex flex-col gap-2.5 desk:grid desk:grid-cols-2">
            {shown.map((item) => (
              <div key={item.id} className="rounded-[16px] border border-line bg-white p-3.5">
                <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase text-accent-dark">
                  <span>{item.topic ? t.feedbackTopics[item.topic] ?? item.topic : t.feedbackAdminTitle}</span>
                  <span className="font-semibold normal-case text-muted-2">{when(item.createdAt)}</span>
                </div>
                {item.text ? <div className="mt-1 whitespace-pre-wrap break-words text-[15px] text-ink">{item.text}</div> : null}
                {item.hasPhoto ? (
                  <a href={`/api/admin/feedback/${item.id}/file?kind=photo`} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/admin/feedback/${item.id}/file?kind=photo`} alt="" className="mt-2 max-h-48 rounded-xl border border-line object-contain" />
                  </a>
                ) : null}
                {item.hasVoice ? <audio src={`/api/admin/feedback/${item.id}/file?kind=voice`} controls className="mt-2 w-full" /> : null}
                <div className="mt-2 space-y-0.5 text-[12px] text-muted">
                  <div>
                    {item.userId ? (
                      <a href={`/admin/users/${item.userId}`} className="font-semibold text-accent">{item.userName || item.userId}</a>
                    ) : (
                      t.feedbackGuest
                    )}
                    {item.contact ? ` · ${item.contact}` : ""}
                    {item.userEmail && item.userEmail !== item.contact ? ` · ${item.userEmail}` : ""}
                  </div>
                  <div className="break-all">
                    {item.platform || "web"}
                    {item.appVersion ? ` ${item.appVersion}` : ""}
                    {item.pageUrl ? ` · ${item.pageUrl}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy === item.id}
                  onClick={() => toggle(item)}
                  className={`mt-2 h-10 w-full rounded-xl text-[13px] font-semibold disabled:opacity-40 ${item.status === "handled" ? "border border-line text-ink" : "bg-ink text-screen"}`}
                >
                  {item.status === "handled" ? t.feedbackMarkNew : t.feedbackMarkHandled}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </PhoneShell>
  );
}
