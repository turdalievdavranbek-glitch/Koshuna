"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { commissionAmount, type CartShop } from "@/lib/delivery";
import type { ShopProduct } from "@/lib/types";
import { displayPhotoForProduct } from "@/lib/shop-photos";
import { useApp } from "@/lib/store";
import { PhoneShell } from "@/components/shell";
import { ShopQty } from "@/components/delivery-shop-buy";
import { CommissionLine, FeeNote, PageHead, som, useSignedIn } from "@/components/delivery-ui";

export default function CartPage() {
  const { t } = useApp();
  const user = useSignedIn("/cart");
  const router = useRouter();
  const [shops, setShops] = useState<CartShop[] | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    void api<{ shops?: CartShop[] }>("/api/delivery/cart").then((res) => {
      setShops(res.ok && Array.isArray(res.data?.shops) ? res.data.shops : []);
    });
  };

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  const change = async (shopId: string, productId: string, qty: number) => {
    setShops((prev) =>
      (prev ?? []).map((shop) =>
        shop.shopId !== shopId
          ? shop
          : {
              ...shop,
              lines: shop.lines
                .map((line) => (line.productId === productId ? { ...line, qty } : line))
                .filter((line) => line.qty > 0),
              itemsTotalSom: shop.lines
                .map((line) => (line.productId === productId ? { ...line, qty } : line))
                .filter((line) => line.qty > 0 && !line.unavailable)
                .reduce((sum, line) => sum + line.priceSom * line.qty, 0),
              commissionSom: commissionAmount(
                shop.lines
                  .map((line) => (line.productId === productId ? { ...line, qty } : line))
                  .filter((line) => line.qty > 0 && !line.unavailable)
                  .reduce((sum, line) => sum + line.priceSom * line.qty, 0),
                shop.commissionPercent ?? 0,
              ),
            },
      ).filter((shop) => shop.lines.length),
    );
    const res = await api("/api/delivery/cart", { method: "PUT", json: { shopId, productId, qty } });
    if (!res.ok) {
      setError(t.deliveryFail);
      load();
    }
  };

  const count = (shops ?? []).reduce((sum, shop) => sum + shop.lines.reduce((n, line) => n + line.qty, 0), 0);

  return (
    <PhoneShell>
      <PageHead title={t.deliveryCart} fallback="/" aside={<span className="text-[13px] font-semibold text-muted">{count ? t.deliveryGoodsCount(count) : ""}</span>} />
      <div className="sc mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        {error ? <p className="mb-2 text-[13px] font-semibold text-accent">{error}</p> : null}
        {shops && shops.length === 0 ? <p className="mt-8 text-center text-[15px] text-muted">{t.deliveryEmpty}</p> : null}
        <div className="flex flex-col gap-4">
          {(shops ?? []).map((shop) => (
            <section key={shop.shopId} className="rounded-[22px] border border-line bg-white p-3.5 shadow-[0_8px_22px_rgba(17,17,17,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[16px] font-extrabold text-ink">{shop.name}</div>
                  {shop.place ? <div className="mt-0.5 text-[13px] text-muted">{shop.place}</div> : null}
                </div>
                <span className="shrink-0 rounded-xl bg-[#FFF3C4] px-2.5 py-1 text-center text-[12px] font-bold leading-tight text-[#8A6A00]">{t.deliveryShopOne}</span>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {shop.lines.map((line) => (
                  <div key={line.productId} className="flex items-center gap-3 rounded-[16px] bg-[#FAFAFB] p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={displayPhotoForProduct({ title: line.title, kind: line.kind as ShopProduct["kind"], photo: line.photo })} alt="" className="h-14 w-14 rounded-[12px] object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-bold text-ink">{line.title}</div>
                      <div className="text-[12px] text-muted">{t.shopUnits[line.unit] || line.unit}</div>
                      {line.unavailable ? <div className="text-[12px] font-semibold text-accent">{t.deliveryGone}</div> : null}
                      {line.changed && line.listedSom != null ? (
                        <div className="text-[12px] font-semibold text-accent">{t.deliveryWasNow(som(line.listedSom), som(line.priceSom))}</div>
                      ) : (
                        <div className="text-[14px] font-extrabold text-ink">{som(line.priceSom)} сом</div>
                      )}
                    </div>
                    <ShopQty qty={line.qty} onChange={(next) => void change(shop.shopId, line.productId, next)} />
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1 text-[14px]">
                <div className="flex justify-between text-muted">
                  <span>{t.deliveryGoodsSum}</span>
                  <span>{som(shop.itemsTotalSom)} сом</span>
                </div>
                <div className="flex justify-between text-muted">
                  <FeeNote km={shop.quote.km} flat={shop.quote.flat} t={t} />
                  <span>≈ {som(shop.quote.feeSom)} сом</span>
                </div>
                <CommissionLine percent={shop.commissionPercent ?? 0} amount={shop.commissionSom ?? 0} label={t.deliveryCommission} />
                <div className="flex justify-between text-[16px] font-extrabold text-ink">
                  <span>{t.deliveryTotal}</span>
                  <span>{som(shop.itemsTotalSom + shop.quote.feeSom + (shop.commissionSom ?? 0))} сом</span>
                </div>
              </div>
              {shop.closed ? <p className="mt-3 text-[13px] font-semibold text-accent">{t.deliveryClosedShop}</p> : null}
              <button
                type="button"
                disabled={shop.closed || shop.lines.some((line) => line.unavailable)}
                onClick={() => router.push(`/cart/checkout?shop=${encodeURIComponent(shop.shopId)}`)}
                className="shadow-btn mt-3 h-[52px] w-full rounded-2xl bg-accent text-[16px] font-bold text-accent-on disabled:opacity-40"
              >
                {t.deliveryCheckout} · {som(shop.itemsTotalSom + shop.quote.feeSom + (shop.commissionSom ?? 0))} сом
              </button>
            </section>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}
