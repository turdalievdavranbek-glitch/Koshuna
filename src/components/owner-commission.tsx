"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { useApp } from "@/lib/store";
import { PhoneShell } from "./shell";
import { PageHead } from "./delivery-ui";

export function OwnerCommissionScreen() {
  const { t } = useApp();
  const [value, setValue] = useState("0");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void api<{ percent?: number }>("/api/owner/commission").then((res) => {
      if (res.ok && typeof res.data?.percent === "number") setValue(String(res.data.percent));
      setReady(true);
    });
  }, []);

  const save = () => {
    const percent = Number(value.trim().replace(",", "."));
    if (!Number.isFinite(percent) || percent < 0 || percent > 50) {
      setError(t.ownerCommissionHint);
      setSaved(false);
      return;
    }
    setBusy(true);
    setError("");
    setSaved(false);
    void api<{ percent?: number }>("/api/owner/commission", { method: "POST", json: { percent } }).then((res) => {
      setBusy(false);
      if (!res.ok || typeof res.data?.percent !== "number") {
        setError(t.deliveryFail);
        return;
      }
      setValue(String(res.data.percent));
      setSaved(true);
    });
  };

  return (
    <PhoneShell>
      <PageHead title={t.ownerCommissionTitle} fallback="/profile" />
      <div className="sc mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        <p className="text-[14px] leading-[1.45] text-muted">{t.ownerCommissionHint}</p>
        <label className="mt-4 block">
          <span className="text-[13px] font-semibold text-ink">{t.ownerCommissionTitle}</span>
          <input
            value={value}
            inputMode="decimal"
            disabled={!ready || busy}
            onChange={(event) => {
              setSaved(false);
              setValue(event.target.value);
            }}
            className="mt-2 h-[56px] w-full rounded-[16px] border border-line bg-white px-4 text-[20px] font-bold text-ink outline-none focus:border-accent"
          />
        </label>
        {error ? <p className="mt-2 text-[13px] font-semibold text-accent">{error}</p> : null}
        {saved ? <p className="mt-2 text-[13px] font-semibold text-ink">{t.ownerCommissionSaved}</p> : null}
        <button
          type="button"
          disabled={!ready || busy}
          onClick={save}
          className="shadow-btn mt-4 h-[52px] w-full rounded-2xl bg-accent text-[16px] font-bold text-accent-on disabled:opacity-60"
        >
          {t.ownerCommissionSave}
        </button>
      </div>
    </PhoneShell>
  );
}
