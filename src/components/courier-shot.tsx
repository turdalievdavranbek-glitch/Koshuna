"use client";

import { useState } from "react";

/** List thumbnail. The full photo is requested only after a tap. */
export function CourierShot({ id, kind, label }: { id: string; kind: "passport" | "selfie"; label: string }) {
  const [open, setOpen] = useState(false);
  const thumb = `/api/admin/couriers/${id}/photo?kind=${kind}&size=thumb`;
  const full = `/api/admin/couriers/${id}/photo?kind=${kind}&size=full`;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full text-left">
        <span className="flex h-32 w-full items-center justify-center overflow-hidden rounded-xl bg-[#F4F4F5]">
          <img src={thumb} alt={label} loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" />
        </span>
        <span className="mt-1 block text-[12px] font-semibold text-accent">{label}</span>
      </button>
      {open ? (
        <button type="button" aria-label={label} onClick={() => setOpen(false)} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/92 p-3">
          <img src={full} alt="" className="max-h-full max-w-full object-contain" />
        </button>
      ) : null}
    </>
  );
}
