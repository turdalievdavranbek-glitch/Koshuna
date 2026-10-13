"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { useApp } from "@/lib/store";
import type { Shop } from "@/lib/types";
import { Input } from "./ui";

/** «Передать точку»: owner enters the receiver's phone or e-mail, sees who it is, confirms. */
export function PointTransfer({ shop }: { shop: Shop }) {
  const { t, resync } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const errorText = (code?: string) =>
    code === "no-user" ? t.transferErrNotFound : code === "self" ? t.transferErrSelf : t.transferErrFail;

  const send = async (confirm: boolean) => {
    if (busy || !target.trim()) return;
    setBusy(true);
    setError("");
    const res = await api<{ ok?: boolean; label?: string; error?: string }>(`/api/shops/${encodeURIComponent(shop.id)}/transfer`, {
      method: "POST",
      json: { target: target.trim(), confirm },
    });
    setBusy(false);
    if (!res.ok || !res.data?.ok) {
      setLabel("");
      setError(errorText(res.data?.error));
      return;
    }
    if (!confirm) {
      setLabel(res.data.label || target.trim());
      return;
    }
    resync();
    router.replace("/profile");
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 h-12 w-full rounded-2xl border border-line text-[15px] font-semibold">
        {t.transferPoint}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-2xl border border-line bg-white p-3.5">
      <div className="text-[15px] font-semibold text-ink">{t.transferPoint}</div>
      <p className="mt-1 text-[12px] leading-[1.4] text-muted">{t.transferHint}</p>
      <div className="mt-2">
        <Input
          value={target}
          onChange={(value) => {
            setTarget(value);
            setLabel("");
            setError("");
          }}
          placeholder={t.transferTarget}
        />
      </div>
      {error ? <div className="mt-2 text-[13px] font-semibold text-accent">{error}</div> : null}
      {label ? (
        <>
          <p className="mt-2 text-[13px] leading-[1.4] text-ink">{t.transferConfirm(label, shop.name)}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={busy} onClick={() => void send(true)} className="h-11 flex-1 rounded-xl bg-ink text-[14px] font-semibold text-screen disabled:opacity-40">
              {t.transferYes}
            </button>
            <button type="button" disabled={busy} onClick={() => setLabel("")} className="h-11 flex-1 rounded-xl border border-line text-[14px] font-semibold">
              {t.transferCancel}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={busy || !target.trim()}
            onClick={() => void send(false)}
            className="h-11 flex-1 rounded-xl bg-ink text-[14px] font-semibold text-screen disabled:opacity-40"
          >
            {t.transferFind}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="h-11 flex-1 rounded-xl border border-line text-[14px] font-semibold">
            {t.transferCancel}
          </button>
        </div>
      )}
    </div>
  );
}
