"use client";

import { useEffect, useState } from "react";
import { pushOverlay, removeOverlay } from "@/lib/native-back";
import { useApp } from "@/lib/store";

export function DeleteCardDialog({
  open,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useApp();
  useEffect(() => {
    if (!open) return;
    pushOverlay("card-delete", onCancel);
    return () => removeOverlay("card-delete");
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex items-end bg-[rgba(23,20,15,.45)] desk:items-center desk:justify-center desk:p-4" onClick={onCancel} data-testid="card-delete-dialog">
      <div className="w-full rounded-t-[24px] bg-white px-5 pb-8 pt-5 desk:max-w-[430px] desk:rounded-[24px]" onClick={(event) => event.stopPropagation()}>
        <div className="font-display text-[20px] font-bold text-ink">{t.cardDeleteTitle}</div>
        <p className="mt-2 text-[14px] leading-[1.45] text-muted">{t.cardDeleteText}</p>
        <button
          type="button"
          data-testid="card-delete-confirm"
          disabled={busy}
          onClick={onConfirm}
          className="shadow-btn mt-4 h-[52px] w-full rounded-2xl bg-accent text-[16px] font-semibold text-accent-on disabled:opacity-60"
        >
          {t.cardDelete}
        </button>
        <button type="button" data-testid="card-delete-cancel" onClick={onCancel} className="mt-2 h-[48px] w-full text-[15px] font-semibold text-muted">
          {t.cardDeleteCancel}
        </button>
      </div>
    </div>
  );
}

export function CardMenu({ onDelete, testId = "card-menu" }: { onDelete: () => void; testId?: string }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        data-testid={testId}
        aria-label={t.cardMenu}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-[18px] font-bold leading-none text-ink"
      >
        …
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 min-w-[140px] overflow-hidden rounded-2xl border border-line bg-white shadow-btn">
          <button
            type="button"
            data-testid="card-menu-delete"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="block w-full px-4 py-3 text-left text-[14px] font-semibold text-accent"
          >
            {t.cardDelete}
          </button>
        </div>
      ) : null}
    </div>
  );
}
