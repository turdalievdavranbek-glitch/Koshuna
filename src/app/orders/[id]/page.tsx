"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api/client";
import type { OrderView } from "@/lib/delivery";
import { useApp } from "@/lib/store";
import { PhoneShell } from "@/components/shell";
import { IconPhone } from "@/components/icons";
import { deliveryError, FeeNote, GhostBtn, orderStatusText, OrderTracker, PageHead, RedBtn, som, useSignedIn } from "@/components/delivery-ui";

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useApp();
  const user = useSignedIn(`/orders/${id}`);
  const [order, setOrder] = useState<OrderView | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    const pull = () => {
      void api<{ order?: OrderView; error?: string }>(`/api/orders/${encodeURIComponent(id)}`).then((res) => {
        if (cancel) return;
        if (res.ok && res.data?.order) {
          setOrder(res.data.order);
          setMissing(false);
          return;
        }
        if (res.status === 404) setMissing(true);
      });
    };
    pull();
    const timer = window.setInterval(pull, 8000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, [user, id]);

  const act = (action: string) => {
    if (!order || busy) return;
    setBusy(true);
    setError("");
    void api<{ order?: OrderView; error?: string }>(`/api/orders/${encodeURIComponent(order.id)}`, { method: "POST", json: { action } }).then((res) => {
      setBusy(false);
      if (res.ok && res.data?.order) {
        setOrder(res.data.order);
        return;
      }
      setError(deliveryError(res.data?.error || res.error, t));
    });
  };

  return (
    <PhoneShell>
      <PageHead title={order ? `№${order.no}` : t.deliveryOrders} fallback="/orders" />
      <div className="sc mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        {missing ? <p className="mt-8 text-center text-[15px] text-muted">{t.deliveryOrdersEmpty}</p> : null}
        {order && order.role !== "buyer" ? <p className="text-[15px] text-muted">{orderStatusText(order, t)}</p> : null}
        {order && order.role === "buyer" ? (
          <div className="rounded-[22px] border border-line bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[16px] font-extrabold">{order.shopName}</div>
              <span className="rounded-full bg-[#FFF3C4] px-2.5 py-1 text-[12px] font-bold text-[#8A6A00]">{orderStatusText(order, t)}</span>
            </div>
            <OrderTracker status={order.status} t={t} />
            <div className="mt-4 space-y-1 text-[14px]">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">{item.title} ×{item.qty}</span>
                  <span className="shrink-0">{som(item.priceSom * item.qty)} сом</span>
                </div>
              ))}
              <div className="flex justify-between text-muted">
                <span>{t.deliveryGoodsSum}</span>
                <span>{som(order.itemsTotalSom)} сом</span>
              </div>
              <div className="flex justify-between text-muted">
                <FeeNote km={order.km} flat={order.flatFee} t={t} />
                <span>≈ {som(order.deliveryFeeSom)} сом</span>
              </div>
              <div className="flex justify-between text-[16px] font-extrabold">
                <span>{t.deliveryToPay}</span>
                <span>{som(order.totalSom)} сом</span>
              </div>
            </div>
            <p className="mt-3 text-[13px] text-muted">{order.address}</p>
            {order.deliveryCode ? (
              <div className="mt-4 rounded-2xl bg-[#FAFAFB] px-4 py-3 text-center">
                <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted">{t.deliveryCode}</div>
                <div className="mt-1 font-display text-[32px] font-extrabold tracking-[0.2em] text-ink">{order.deliveryCode}</div>
                <p className="mt-1 text-[12px] text-muted">{t.deliveryCodeHint}</p>
              </div>
            ) : null}
            {order.shopPhone ? (
              <a href={`tel:${order.shopPhone}`} className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-line px-3 text-[14px] font-semibold text-ink">
                <IconPhone size={16} />
                {t.deliveryCallShop}
              </a>
            ) : null}
            {order.status === "assembled" && !order.buyerConfirmed ? (
              <div className="mt-4">
                <p className="mb-2 text-[13px] text-muted">{t.deliveryConfirmHint}</p>
                <RedBtn disabled={busy} onClick={() => act("confirm")}>
                  {t.deliveryConfirm}
                </RedBtn>
              </div>
            ) : null}
            {order.status === "new" || order.status === "accepted" ? (
              <div className="mt-3">
                <GhostBtn disabled={busy} onClick={() => act("cancel")}>
                  {t.deliveryCancel}
                </GhostBtn>
              </div>
            ) : null}
            {error ? <p className="mt-2 text-[13px] font-semibold text-accent">{error}</p> : null}
          </div>
        ) : null}
      </div>
    </PhoneShell>
  );
}
