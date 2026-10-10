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

export type CardMenuItem = { label: string; onClick: () => void; testId?: string };

/** «…» menu. A bottom sheet on phones (centered on desktop), so a card with overflow-hidden never clips it. */
export function CardMenu({
  onDelete,
  items = [],
  testId = "card-menu",
}: {
  onDelete: () => void;
  items?: CardMenuItem[];
  testId?: string;
}) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    pushOverlay("card-menu", close);
    return () => removeOverlay("card-menu");
  }, [open]);
  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };
  return (
    <div className="shrink-0">
      <button
        type="button"
        data-testid={testId}
        aria-label={t.cardMenu}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-[18px] font-bold leading-none text-ink"
      >
        …
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(23,20,15,.45)] desk:items-center desk:p-4"
          onClick={() => setOpen(false)}
          data-testid="card-menu-sheet"
        >
          <div
            className="w-full max-w-[430px] rounded-t-[24px] bg-white px-3 pb-6 pt-3 desk:rounded-[24px]"
            style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom, 0px))" }}
            onClick={(event) => event.stopPropagation()}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                data-testid={item.testId}
                onClick={() => run(item.onClick)}
                className="block h-[52px] w-full rounded-2xl px-4 text-left text-[16px] font-semibold text-ink active:bg-chip"
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              data-testid="card-menu-delete"
              onClick={() => run(onDelete)}
              className="block h-[52px] w-full rounded-2xl px-4 text-left text-[16px] font-semibold text-accent active:bg-chip"
            >
              {t.cardDelete}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-1 block h-[48px] w-full text-center text-[15px] font-semibold text-muted"
            >
              {t.cardDeleteCancel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
