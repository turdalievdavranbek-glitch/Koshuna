"use client";

import { useEffect } from "react";
import { pushOverlay, removeOverlay } from "@/lib/native-back";
import { useApp } from "@/lib/store";

export function LeaveDialog({
  open,
  onSave,
  onDelete,
  onStay,
}: {
  open: boolean;
  onSave: () => void;
  onDelete: () => void;
  onStay: () => void;
}) {
  const { t } = useApp();
  useEffect(() => {
    if (!open) return;
    pushOverlay("leave-dialog", onStay);
    return () => removeOverlay("leave-dialog");
  }, [open, onStay]);
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex items-end bg-[rgba(23,20,15,.45)] desk:items-center desk:justify-center desk:p-4" onClick={onStay} data-testid="leave-dialog">
      <div className="w-full rounded-t-[24px] bg-white px-5 pb-8 pt-5 desk:max-w-[430px] desk:rounded-[24px]" onClick={(e) => e.stopPropagation()}>
        <div className="font-display text-[20px] font-bold text-ink">{t.leaveTitle}</div>
        <p className="mt-2 text-[14px] leading-[1.45] text-muted">{t.leaveText}</p>
        <button type="button" data-testid="leave-save" onClick={onSave} className="shadow-btn mt-4 h-[52px] w-full rounded-2xl bg-accent text-[16px] font-semibold text-accent-on">
          {t.leaveSave}
        </button>
        <button type="button" data-testid="leave-delete" onClick={onDelete} className="mt-2 h-[52px] w-full rounded-2xl border border-line text-[16px] font-semibold text-ink">
          {t.leaveDelete}
        </button>
        <button type="button" data-testid="leave-stay" onClick={onStay} className="mt-2 h-[48px] w-full text-[15px] font-semibold text-muted">
          {t.leaveStay}
        </button>
      </div>
    </div>
  );
}
