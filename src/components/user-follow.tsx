"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { useApp } from "@/lib/store";

export function UserFollow({
  userId,
  mine,
  locked,
  returnPath,
  compact,
}: {
  userId: string;
  /** Own profile: count only, no follow button. */
  mine?: boolean;
  /** Blocked author: count stays, the button does not. */
  locked?: boolean;
  returnPath?: string;
  compact?: boolean;
}) {
  const { t, user, setPendingPath } = useApp();
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);
  const [following, setFollowing] = useState(false);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancel = false;
    void api<{ count: number; following: boolean }>(`/api/users/${encodeURIComponent(userId)}/follow`).then((res) => {
      if (cancel || !res.ok || !res.data) return;
      setCount(res.data.count);
      setFollowing(Boolean(res.data.following));
    });
    return () => {
      cancel = true;
    };
  }, [userId, user?.id]);

  const label = count == null ? "" : count <= 0 ? t.followersNone : t.followersCount(count);
  const showButton = !mine && !locked;

  const follow = () => {
    if (!user) {
      setPendingPath(returnPath || `/owner/${userId}`);
      router.push("/login");
      return;
    }
    setBusy(true);
    void api<{ count: number; following: boolean }>(`/api/users/${encodeURIComponent(userId)}/follow`, {
      method: "POST",
      json: {},
    }).then((res) => {
      setBusy(false);
      if (!res.ok || !res.data) return;
      setCount(res.data.count);
      setFollowing(Boolean(res.data.following));
    });
  };

  const unfollow = () => {
    setBusy(true);
    void api<{ count: number; following: boolean }>(`/api/users/${encodeURIComponent(userId)}/follow`, {
      method: "DELETE",
      json: {},
    }).then((res) => {
      setBusy(false);
      setAsk(false);
      if (!res.ok || !res.data) return;
      setCount(res.data.count);
      setFollowing(Boolean(res.data.following));
    });
  };

  return (
    <div className={compact ? "mt-0.5" : "mt-3"}>
      <div className="flex flex-wrap items-center gap-2">
        {showButton ? (
          following ? (
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
              onClick={follow}
              className="h-11 rounded-2xl bg-accent px-4 text-[14px] font-semibold text-accent-on disabled:opacity-60"
            >
              {t.subscribe}
            </button>
          )
        ) : null}
        {label ? <span className={compact ? "text-[12.5px] text-muted" : "text-[13px] font-semibold text-muted"}>{label}</span> : null}
      </div>
      {ask ? (
        <div className="mt-2 rounded-[16px] border border-line bg-white p-3">
          <div className="text-[15px] font-bold text-ink">{t.unsubscribeAsk}</div>
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={busy} onClick={unfollow} className="h-10 flex-1 rounded-xl bg-ink text-[13px] font-semibold text-screen">
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
