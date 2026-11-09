"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";

/** Mobile sheet: the owner must type a clear reason before a refusal is saved. */
export function CourierReasonForm({
  busy,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}) {
  const { t } = useApp();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      className="mt-2 flex flex-col gap-2"
      data-testid="courier-reject-form"
      onSubmit={(event) => {
        event.preventDefault();
        const text = reason.replace(/\s+/g, " ").trim();
        if (text.length < 8) {
          setError(t.courierRejectNeed);
          return;
        }
        setError("");
        onSubmit(text);
      }}
    >
      <label className="text-[13px] font-semibold text-ink" htmlFor="courier-reject-reason">
        {t.courierRejectTitle}
      </label>
      <textarea
        id="courier-reject-reason"
        value={reason}
        maxLength={400}
        rows={4}
        required
        placeholder={t.courierRejectPh}
        onChange={(event) => setReason(event.target.value)}
        className="min-h-[96px] w-full resize-none rounded-2xl border border-line bg-screen px-3 py-2.5 text-[15px] outline-none"
      />
      {error ? <p className="text-[12px] font-semibold text-accent">{error}</p> : null}
      <button type="submit" disabled={busy} className="h-12 w-full rounded-2xl bg-accent text-[15px] font-bold text-accent-on disabled:opacity-40">
        {t.courierRejectSend}
      </button>
      <button type="button" onClick={onCancel} className="h-12 w-full rounded-2xl border border-line text-[15px] font-semibold">
        {t.postCancel}
      </button>
    </form>
  );
}
