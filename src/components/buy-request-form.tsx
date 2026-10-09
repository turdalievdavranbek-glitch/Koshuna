"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminAreaById, adminAreaLabel, areasOfOblast } from "@/lib/admin-areas";
import { api } from "@/lib/api/client";
import { BUY_CATEGORIES, BUY_UNIT_DEFAULT, BUY_UNITS, parseBuyQuantity, readBuyQuantityInput, todayBishkek, type BuyUnit } from "@/lib/buy-request";
import { OBLASTS } from "@/lib/places";
import { useApp } from "@/lib/store";
import { ScreenBack } from "@/components/back-button";
import { PhoneShell } from "@/components/shell";
import { Chip, Field, Input } from "@/components/ui";

export function BuyRequestForm() {
  const { t, lang } = useApp();
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [text, setText] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<BuyUnit>(BUY_UNIT_DEFAULT);
  const [oblast, setOblast] = useState("");
  const [district, setDistrict] = useState("");
  const [deadline, setDeadline] = useState("");
  const [delivery, setDelivery] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const areas = oblast ? areasOfOblast(oblast) : { districts: [], cities: [] };
  const places = [...areas.districts, ...areas.cities];

  const send = () => {
    if (busy) return;
    if (!category) {
      setError(t.buyRequestCatErr);
      return;
    }
    if (!text.trim()) {
      setError(t.buyRequestNeedErr);
      return;
    }
    const parsed = parseBuyQuantity(quantity);
    if (!parsed) {
      setError(t.buyRequestQtyErr);
      return;
    }
    if (!adminAreaById(district)) {
      setError(t.buyRequestPlaceErr);
      return;
    }
    if (!deadline || deadline < todayBishkek()) {
      setError(t.buyRequestDateErr);
      return;
    }
    setBusy(true);
    setError("");
    void api("/api/purchase-requests", {
      method: "POST",
      json: { category, text: text.trim(), quantity: parsed.quantity, unit, district, deadline, needsDelivery: delivery },
    }).then((res) => {
      setBusy(false);
      if (!res.ok) {
        setError(t.buyRequestFail);
        return;
      }
      setSent(true);
    });
  };

  return (
    <PhoneShell>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-2">
        <ScreenBack fallback="/post" />
        <h1 className="mt-3 font-display text-[26px] font-extrabold text-ink">{t.buyRequestTitle}</h1>
        <p className="mt-1 text-[13px] leading-[1.4] text-muted">{t.buyRequestPhone}</p>
        {sent ? (
          <div className="mt-6">
            <p className="text-[15px] leading-[1.45] text-ink">{t.buyRequestSent}</p>
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="shadow-btn mt-4 h-12 w-full rounded-2xl bg-accent text-[15px] font-semibold text-accent-on"
            >
              {t.buyRequestMine}
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <div className="text-[13px] font-semibold text-ink">{t.category}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {BUY_CATEGORIES.map((id) => (
                  <Chip key={id} active={category === id} onClick={() => setCategory(id)}>
                    {t.shopCats[id] ?? id}
                  </Chip>
                ))}
              </div>
            </div>
            <Field label={t.buyRequestNeed}>
              <Input value={text} onChange={setText} placeholder={t.buyRequestNeedPh} />
            </Field>
            <div>
              <div className="text-[13px] font-semibold text-ink">{t.buyRequestQty}</div>
              <div className="mt-[7px]">
                <Input
                  value={quantity}
                  inputMode="numeric"
                  placeholder="10"
                  onChange={(raw) => {
                    const read = readBuyQuantityInput(raw);
                    setQuantity(read.quantity);
                    if (read.unit) setUnit(read.unit);
                  }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {BUY_UNITS.map((id) => (
                  <Chip key={id} size="sm" active={unit === id} onClick={() => setUnit(id)}>
                    {t.buyUnits[id] ?? id}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-ink">{t.buyRequestDistrict}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {OBLASTS.map((id) => (
                  <Chip
                    key={id}
                    active={oblast === id}
                    onClick={() => {
                      setOblast(id);
                      setDistrict("");
                    }}
                  >
                    {t.oblasts[id]}
                  </Chip>
                ))}
              </div>
              {places.length ? (
                <div className="mt-2 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
                  {places.map((area) => (
                    <Chip key={area.id} active={district === area.id} onClick={() => setDistrict(area.id)}>
                      {adminAreaLabel(area, lang)}
                    </Chip>
                  ))}
                </div>
              ) : null}
            </div>
            <Field label={t.buyRequestDeadline}>
              <input
                type="date"
                min={todayBishkek()}
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
                className="h-[50px] w-full rounded-[14px] border border-line bg-white px-[15px] text-[15px]"
              />
            </Field>
            <div>
              <div className="text-[13px] font-semibold text-ink">{t.buyRequestDelivery}</div>
              <div className="mt-2 flex gap-2">
                <Chip active={!delivery} onClick={() => setDelivery(false)}>
                  {t.buyRequestDeliveryNo}
                </Chip>
                <Chip active={delivery} onClick={() => setDelivery(true)}>
                  {t.buyRequestDeliveryYes}
                </Chip>
              </div>
            </div>
            {error ? <p className="text-[13px] font-semibold text-accent">{error}</p> : null}
            <p className="text-[13px] leading-[1.45] text-muted">{t.buyRequestNotice}</p>
            <button
              type="button"
              disabled={busy}
              onClick={send}
              className="shadow-btn h-[52px] rounded-2xl bg-accent text-[16px] font-semibold text-accent-on disabled:opacity-60"
            >
              {t.buyRequestSend}
            </button>
          </div>
        )}
      </div>
    </PhoneShell>
  );
}
