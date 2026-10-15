"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api/client";
import { pushOverlay, removeOverlay } from "@/lib/native-back";
import { useApp } from "@/lib/store";

/**
 * «Удалить переписку» (for me only): an action sheet, then a centered confirm.
 * Portaled to <body> with position: fixed so no scrolled column can push it off-screen.
 */
export function ChatDeleteFlow({
  threadId,
  open,
  onClose,
  onDone,
}: {
  threadId: string;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useApp();
  const [step, setStep] = useState<"menu" | "confirm">("menu");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep("menu");
    setError(false);
    pushOverlay("chat-delete", onClose);
    return () => removeOverlay("chat-delete");
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const confirm = () => {
    setBusy(true);
    setError(false);
    void api(`/api/threads/${encodeURIComponent(threadId)}`, { method: "DELETE" }).then((res) => {
      setBusy(false);
      if (!res.ok) {
        setError(true);
        return;
      }
      onClose();
      onDone();
    });
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[80] flex justify-center bg-[rgba(24,24,27,.45)] p-4 ${step === "confirm" ? "items-center" : "items-end desk:items-center"}`}
      onClick={onClose}
      data-testid="chat-delete-overlay"
    >
      <div className="w-full max-w-[400px] rounded-[24px] bg-white p-4" onClick={(event) => event.stopPropagation()}>
        {step === "menu" ? (
          <>
            <button
              type="button"
              data-testid="chat-delete-open"
              onClick={() => setStep("confirm")}
              className="block h-[52px] w-full rounded-2xl px-4 text-left text-[16px] font-semibold text-accent active:bg-chip"
            >
              🗑 {t.chatDeleteThread}
            </button>
            <button type="button" onClick={onClose} className="block h-[48px] w-full rounded-2xl px-4 text-left text-[15px] font-semibold text-muted">
              {t.cardDeleteCancel}
            </button>
          </>
        ) : (
          <>
            <div className="font-display text-[19px] font-bold text-ink">{t.chatDeleteThread}?</div>
            <p className="mt-2 text-[14px] leading-[1.45] text-muted">{t.chatDeleteThreadText}</p>
            {error ? <p className="mt-2 text-[13px] font-semibold text-accent">{t.cardDeleteError}</p> : null}
            <button
              type="button"
              data-testid="chat-delete-confirm"
              disabled={busy}
              onClick={confirm}
              className="shadow-btn mt-4 h-[52px] w-full rounded-2xl bg-accent text-[16px] font-semibold text-accent-on disabled:opacity-60"
            >
              {t.chatDeleteThreadYes}
            </button>
            <button type="button" onClick={onClose} className="mt-2 h-[48px] w-full text-[15px] font-semibold text-muted">
              {t.cardDeleteCancel}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
