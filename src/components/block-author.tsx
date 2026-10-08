"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { pushOverlay, removeOverlay } from "@/lib/native-back";
import { useApp } from "@/lib/store";

export function BlockedAuthorNotice({ userId }: { userId: string }) {
  const { t, unblockUser } = useApp();
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-4 rounded-[18px] border border-line bg-white p-4">
      <p className="text-[15px] font-semibold leading-[1.45] text-ink">{t.blockedNotice}</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void unblockUser(userId).finally(() => setBusy(false));
        }}
        className="mt-3 h-12 w-full rounded-2xl border border-line text-[15px] font-semibold text-ink disabled:opacity-60"
      >
        {t.unblock}
      </button>
    </div>
  );
}

export function BlockAuthorButton({ userId, returnPath }: { userId: string; returnPath: string }) {
  const { t, user, setPendingPath, isBlocked, blockUser, unblockUser } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const blocked = isBlocked(userId);

  useEffect(() => {
    if (!open) return;
    pushOverlay("block-author", () => setOpen(false));
    return () => removeOverlay("block-author");
  }, [open]);

  if (blocked) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (!user) {
            setPendingPath(returnPath);
            router.push("/login");
            return;
          }
          setBusy(true);
          void unblockUser(userId).finally(() => setBusy(false));
        }}
        className="mt-3 w-full text-center text-[13px] font-semibold text-muted"
      >
        {t.unblock}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!user) {
            setPendingPath(returnPath);
            router.push("/login");
            return;
          }
          setOpen(true);
        }}
        className="mt-3 w-full text-center text-[13px] font-semibold text-muted"
      >
        {t.blockAuthor}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(23,20,15,.45)]" onClick={() => setOpen(false)}>
          <div className="w-full max-w-[430px] rounded-t-[24px] bg-white px-5 pb-8 pt-5" onClick={(event) => event.stopPropagation()}>
            <div className="font-display text-[20px] font-bold text-ink">{t.blockAuthorTitle}</div>
            <p className="mt-2 text-[14px] leading-[1.45] text-muted">{t.blockAuthorText}</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void blockUser(userId).then(() => {
                  setBusy(false);
                  setOpen(false);
                });
              }}
              className="shadow-btn mt-4 h-[52px] w-full rounded-2xl bg-accent text-[16px] font-semibold text-accent-on disabled:opacity-60"
            >
              {t.blockDo}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="mt-2 h-[48px] w-full text-[15px] font-semibold text-muted">
              {t.cardDeleteCancel}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function ReportAuthorButton({ userId, returnPath }: { userId: string; returnPath: string }) {
  const { t, user, setPendingPath } = useApp();
  const router = useRouter();
  const [thanks, setThanks] = useState(false);
  if (thanks) return <p className="mt-3 text-center text-[13px] font-semibold text-muted">{t.reportThanks}</p>;
  return (
    <button
      type="button"
      onClick={() => {
        if (!user) {
          setPendingPath(returnPath);
          router.push("/login");
          return;
        }
        void api("/api/reports", { method: "POST", json: { targetUserId: userId, reason: "other" } }).then((res) => {
          if (res.ok) setThanks(true);
        });
      }}
      className="mt-2 w-full text-center text-[13px] font-semibold text-muted"
    >
      {t.reportAuthor}
    </button>
  );
}
