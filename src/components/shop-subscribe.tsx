"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { useApp } from "@/lib/store";

export function ShopSubscribe({ shopId, mine }: { shopId: string; mine: boolean }) {
  const { t, user, setPendingPath } = useApp();
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancel = false;
    void api<{ count: number; subscribed: boolean }>(`/api/shops/${encodeURIComponent(shopId)}/subscribe`).then((res) => {
      if (cancel || !res.ok || !res.data) return;
      setCount(res.data.count);
      setSubscribed(Boolean(res.data.subscribed));
    });
    return () => {
      cancel = true;
    };
  }, [shopId, user?.id]);

  const label = count == null ? "" : count <= 0 ? t.followersNone : t.followersCount(count);

  const subscribe = () => {
    if (!user) {
      setPendingPath(`/shops/${shopId}`);
      router.push("/login");
      return;
    }
    setBusy(true);
    void api<{ count: number; subscribed: boolean }>(`/api/shops/${encodeURIComponent(shopId)}/subscribe`, {
      method: "POST",
      json: {},
    }).then((res) => {
      setBusy(false);
      if (!res.ok || !res.data) return;
      setCount(res.data.count);
      setSubscribed(Boolean(res.data.subscribed));
    });
  };

  const unsubscribe = () => {
    setBusy(true);
    void api<{ count: number; subscribed: boolean }>(`/api/shops/${encodeURIComponent(shopId)}/subscribe`, {
      method: "DELETE",
      json: {},
    }).then((res) => {
      setBusy(false);
      setAsk(false);
      if (!res.ok || !res.data) return;
      setCount(res.data.count);
      setSubscribed(Boolean(res.data.subscribed));
    });
  };

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        {mine ? null : subscribed ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setAsk(true)}
            className="h-11 rounded-2xl border border-line bg-white px-4 text-[14px] font-semibold text-ink disabled:opacity-60"
          >
            {t.subscribed}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={subscribe}
            className="h-11 rounded-2xl bg-accent px-4 text-[14px] font-semibold text-accent-on disabled:opacity-60"
          >
            {t.subscribe}
          </button>
        )}
        <span className="text-[13px] font-semibold text-muted">{label}</span>
      </div>
      {ask ? (
        <div className="mt-2 rounded-[16px] border border-line bg-white p-3">
          <div className="text-[15px] font-bold text-ink">{t.unsubscribeAsk}</div>
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={busy} onClick={unsubscribe} className="h-10 flex-1 rounded-xl bg-ink text-[13px] font-semibold text-screen">
              {t.unsubscribeDo}
            </button>
            <button type="button" onClick={() => setAsk(false)} className="h-10 flex-1 rounded-xl border border-line text-[13px] font-semibold">
              {t.cardDeleteCancel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
