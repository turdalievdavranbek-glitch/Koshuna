"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api/client";
import type { CartShop, FeeQuote } from "@/lib/delivery";
import { isShopId } from "@/lib/delivery";
import { useApp } from "@/lib/store";
import { PhoneShell } from "@/components/shell";
import { Input } from "@/components/ui";
import { askPoint, deliveryError, FeeNote, PageHead, RedBtn, som, useSignedIn } from "@/components/delivery-ui";

export function CheckoutScreen() {
  const { t } = useApp();
  const params = useSearchParams();
  const shopId = params.get("shop") ?? "";
  const user = useSignedIn(`/cart/checkout?shop=${shopId}`);
  const router = useRouter();
  const [shop, setShop] = useState<CartShop | null>(null);
  const [ready, setReady] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [quote, setQuote] = useState<FeeQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.phone) setPhone((prev) => prev || user.phone);
  }, [user]);

  useEffect(() => {
    if (!user || !isShopId(shopId)) return;
    const q = point ? `?lat=${point.lat}&lng=${point.lng}` : "";
    void api<{ shops?: CartShop[] }>(`/api/delivery/cart${q}`).then((res) => {
      const found = res.ok ? res.data?.shops?.find((row) => row.shopId === shopId) ?? null : null;
      setShop(found);
      setQuote(found?.quote ?? null);
      setReady(true);
    });
  }, [user, shopId, point]);

  const locate = () => {
    void askPoint().then((next) => {
      setPoint(next);
      if (!next) setError(t.deliveryNoGeo);
    });
  };

  const place = () => {
    if (!shop || busy) return;
    setBusy(true);
    setError("");
    void api<{ order?: { id: string }; error?: string }>("/api/orders", {
      method: "POST",
      json: { shopId, address, phone, comment, lat: point?.lat, lng: point?.lng },
    }).then((res) => {
      setBusy(false);
      if (res.ok && res.data?.order?.id) {
        router.replace(`/orders/${res.data.order.id}`);
        return;
      }
      setError(deliveryError(res.data?.error || res.error, t));
    });
  };

  const fee = quote?.feeSom ?? shop?.quote.feeSom ?? 0;
  const goods = shop?.itemsTotalSom ?? 0;
  const total = goods + fee;

  return (
    <PhoneShell>
      <PageHead title={t.deliveryCheckoutTitle} fallback="/cart" />
      <div className="sc mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        {ready && !shop ? <p className="mt-6 text-[15px] text-muted">{t.deliveryEmpty}</p> : null}
        {shop ? (
          <div className="flex flex-col gap-3">
            <section className="rounded-[22px] border border-line bg-white p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t.deliveryAddress}</div>
              <div className="mt-2">
                <Input value={address} onChange={setAddress} placeholder={t.deliveryAddressPh} />
              </div>
              <button type="button" onClick={locate} className="mt-2 text-[13px] font-semibold text-accent">
                {t.deliveryLocate}
              </button>
              <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t.deliveryPhone}</div>
              <div className="mt-2">
                <Input value={phone} onChange={setPhone} placeholder="+996" inputMode="tel" />
              </div>
              <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t.deliveryComment}</div>
              <div className="mt-2">
                <Input value={comment} onChange={setComment} placeholder={t.deliveryCommentPh} />
              </div>
            </section>

            <section className="flex items-center gap-3 rounded-[22px] border border-line bg-white p-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E7F6EC] text-[18px]">💵</span>
              <div className="min-w-0">
                <div className="text-[15px] font-extrabold text-ink">{t.deliveryPayCash}</div>
                <div className="text-[13px] text-muted">{t.deliveryPayReady(som(total))}</div>
              </div>
            </section>

            <section className="rounded-[22px] border border-line bg-white p-4 text-[15px]">
              <div className="flex justify-between">
                <span className="text-muted">{t.deliveryGoodsSum}</span>
                <span>{som(goods)} сом</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted">{quote ? <FeeNote km={quote.km} flat={quote.flat} t={t} /> : t.deliveryFeeFlat}</span>
                <span>≈ {som(fee)} сом</span>
              </div>
              <div className="mt-2 flex justify-between text-[18px] font-extrabold">
                <span>{t.deliveryToPay}</span>
                <span>{som(total)} сом</span>
              </div>
              {quote ? <p className="mt-2 text-[12px] text-muted">{quote.flat ? t.deliveryNoGeo : t.deliveryFeeHint(quote.baseSom, quote.perKmSom)}</p> : null}
            </section>

            {error ? <p className="text-[13px] font-semibold text-accent">{error}</p> : null}
            <RedBtn disabled={busy || address.trim().length < 4 || !phone.trim()} onClick={place}>
              {t.deliveryPlace}
            </RedBtn>
          </div>
        ) : null}
      </div>
    </PhoneShell>
  );
}
