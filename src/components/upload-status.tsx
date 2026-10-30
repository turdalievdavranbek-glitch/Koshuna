"use client";

import { useEffect, useRef, useState } from "react";
import { discardOp, retryOp, subscribeOutbox, type OutboxSnapshot } from "@/lib/api/outbox";
import { shopErrorText } from "@/lib/shop-copy";
import { useApp } from "@/lib/store";

export function UploadStatus() {
  const { t } = useApp();
  const [snap, setSnap] = useState<OutboxSnapshot | null>(null);
  const [done, setDone] = useState(false);
  const prev = useRef(0);
  const seen = useRef(false);

  useEffect(() => {
    return subscribeOutbox((next) => {
      if (seen.current && prev.current > 0 && next.pending === 0 && next.failed.length === 0) setDone(true);
      seen.current = true;
      prev.current = next.pending;
      setSnap(next);
    });
  }, []);

  useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(() => setDone(false), 3000);
    return () => window.clearTimeout(id);
  }, [done]);

  if (!snap) return null;
  const failed = snap.failed[0];
  const active = snap.pending > 0 || snap.failed.length > 0;
  if (!active && !done) return null;

  const pct = snap.sending && snap.sending.total > 0 ? Math.min(100, Math.round((snap.sending.sent / snap.sending.total) * 100)) : 0;
  const text = failed
    ? `${t.uploadFailed}: ${shopErrorText(t, failed.error)}`
    : snap.waitingNetwork
      ? t.uploadWaiting
      : done && snap.pending === 0
        ? t.uploadDone
        : t.uploadProgress(pct);

  return (
    <div className="border-t border-line bg-surface px-3 py-1.5 text-[13px] text-ink">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate">{text}</span>
        {failed ? (
          <span className="flex shrink-0 gap-3">
            <button type="button" onClick={() => retryOp(failed.id)} className="font-semibold text-accent">
              {t.uploadRetry}
            </button>
            <button type="button" onClick={() => discardOp(failed.id)} className="font-semibold text-muted">
              {t.uploadDiscard}
            </button>
          </span>
        ) : null}
      </div>
      {snap.pending > 0 && !snap.waitingNetwork && !failed ? (
        <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-chip">
          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </div>
  );
}
