"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";
import { TAXONOMY_KEYS } from "@/lib/section-move";
import { useApp } from "@/lib/store";
import type { DraftListing, Listing, SectionId } from "@/lib/types";
import { PostTaxonomy, pickSection } from "@/components/post-taxonomy";
import { PostTypePicker } from "@/components/post-type-picker";

/** Admin «Сменить раздел»: the post form's section tiles + drill-down, saved by an admin-only endpoint. */
export function AdminSectionSheet({ listing, onClose, onSaved }: { listing: Listing; onClose: () => void; onSaved?: () => void }) {
  const { t, resync } = useApp();
  const [draft, setDraft] = useState<DraftListing>(() => ({ ...(listing as unknown as DraftListing) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const patch = (next: Partial<DraftListing>) => setDraft((prev) => ({ ...prev, ...next }));
  const pick = (id: SectionId) =>
    setDraft((prev) => {
      const cleared = { ...prev } as Record<string, unknown>;
      for (const key of TAXONOMY_KEYS) delete cleared[key];
      return { ...(cleared as DraftListing), ...pickSection(prev, id) };
    });

  const save = () => {
    if (busy) return;
    setBusy(true);
    setError("");
    const body: Record<string, unknown> = { section: draft.section };
    const source = draft as unknown as Record<string, unknown>;
    for (const key of TAXONOMY_KEYS) {
      const value = source[key];
      if (typeof value === "string" || typeof value === "number") body[key] = value;
    }
    void api(`/api/admin/listings/${encodeURIComponent(listing.id)}/section`, { method: "POST", json: body }).then((res) => {
      setBusy(false);
      if (!res.ok) {
        setError(t.adminMoveFail);
        return;
      }
      resync();
      onSaved?.();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[88dvh] w-full max-w-[520px] overflow-y-auto rounded-t-[22px] bg-screen p-4 pb-[calc(16px+env(safe-area-inset-bottom))]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-[17px] font-bold text-ink">{t.adminMoveSection}</div>
          <button type="button" onClick={onClose} aria-label={t.adminMoveSection} className="h-9 w-9 rounded-full border border-line bg-surface text-[18px] leading-none">
            ×
          </button>
        </div>
        <div className="mb-3 line-clamp-2 text-[13px] text-muted">{listing.title}</div>
        <PostTypePicker value={draft.section} onPick={pick} startOpen />
        <div className="mt-3">
          <PostTaxonomy draft={draft} onPatch={patch} />
        </div>
        {error ? <div className="mt-3 text-[13px] font-semibold text-accent">{error}</div> : null}
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="mt-4 h-12 w-full rounded-xl bg-ink text-[15px] font-semibold text-screen disabled:opacity-40"
        >
          {t.adminMoveSave}
        </button>
      </div>
    </div>
  );
}

/** Admin-only button that opens the sheet. Renders nothing for everyone else. */
export function AdminSectionButton({ listing, className, onSaved }: { listing: Listing; className?: string; onSaved?: () => void }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? "mt-3 h-11 w-full rounded-xl border border-line bg-white text-[14px] font-semibold text-ink"}
      >
        {t.adminMoveSection}
      </button>
      {done ? <div className="mt-1 text-[12px] text-muted">{t.adminMoveDone}</div> : null}
      {open ? (
        <AdminSectionSheet
          listing={listing}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setDone(true);
            onSaved?.();
          }}
        />
      ) : null}
    </>
  );
}
