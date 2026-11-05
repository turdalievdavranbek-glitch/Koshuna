"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api/client";
import type { OrderView } from "@/lib/delivery";
import { useApp } from "@/lib/store";
import { PhoneShell } from "@/components/shell";
import { deliveryError, GhostBtn, orderStatusText, PageHead, RedBtn, som, useSignedIn, YellowBtn } from "@/components/delivery-ui";
import { OrderLiveMap } from "@/components/order-live";

export default function ShopOrdersPage() {
  const { id } = useParams<{ id: string }>();
  const { t, shops } = useApp();
  const user = useSignedIn(`/shops/${id}/orders`);
  const shop = shops.find((item) => item.id === id);
  const [rows, setRows] = useState<OrderView[] | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    const pull = () => {
      void api<{ orders?: OrderView[] }>(`/api/shops/${encodeURIComponent(id)}/orders`).then((res) => {
        if (!cancel) setRows(res.ok && Array.isArray(res.data?.orders) ? res.data.orders : []);
      });
    };
    pull();
    const timer = window.setInterval(pull, 8000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, [user, id]);

  const act = (orderId: string, action: string) => {
    setBusy(orderId + action);
    setError("");
    void api<{ error?: string }>(`/api/orders/${encodeURIComponent(orderId)}`, { method: "POST", json: { action } }).then((res) => {
      setBusy("");
      if (!res.ok) {
        setError(deliveryError(res.data?.error || res.error, t));
        return;
      }
      void api<{ orders?: OrderView[] }>(`/api/shops/${encodeURIComponent(id)}/orders`).then((next) => {
        setRows(next.ok && Array.isArray(next.data?.orders) ? next.data.orders : []);
      });
    });
  };

  const fresh = (rows ?? []).filter((order) => order.status === "new");
  const work = (rows ?? []).filter((order) => order.status !== "new" && order.status !== "delivered" && order.status !== "rejected" && order.status !== "cancelled" && order.status !== "returned");

  return (
    <PhoneShell>
      <PageHead title={t.deliveryShopOrders} fallback={`/shops/${id}`} aside={<span className="max-w-[40%] truncate text-[12px] font-semibold text-muted">{shop?.name}</span>} />
      <div className="sc mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        {error ? <p className="mb-2 text-[13px] font-semibold text-accent">{error}</p> : null}
        <div className="flex flex-col gap-3">
          {fresh.map((order) => (
            <article key={order.id} className="rounded-[22px] border border-line bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[16px] font-extrabold">№{order.no}</div>
                <span className="rounded-full bg-[#FDE8E8] px-2.5 py-1 text-[12px] font-bold text-accent">{orderStatusText(order, t)}</span>
              </div>
              <p className="mt-1 text-[13px] text-muted">
                {order.buyerName} · {order.address}
              </p>
              <ul className="mt-3 space-y-1 text-[14px]">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">{item.title} ×{item.qty}</span>
                    <span>{som(item.priceSom * item.qty)} сом</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex justify-between text-[16px] font-extrabold">
                <span>{t.deliveryTotal}</span>
                <span>{som(order.totalSom)} сом</span>
              </div>
              <p className="mt-1 text-[12px] text-muted">{t.deliveryPayCash}</p>
              <div className="mt-3 flex gap-2">
                <div className="flex-1">
                  <GhostBtn disabled={busy === order.id + "reject"} onClick={() => act(order.id, "reject")}>
                    {t.deliveryReject}
                  </GhostBtn>
                </div>
                <div className="flex-1">
                  <RedBtn disabled={busy === order.id + "accept"} onClick={() => act(order.id, "accept")}>
                    {t.deliveryAccept}
                  </RedBtn>
                </div>
              </div>
            </article>
          ))}
        </div>
        {work.length ? <h2 className="mb-2 mt-5 text-[18px] font-extrabold">{t.deliveryInWork}</h2> : null}
        <div className="flex flex-col gap-3">
          {work.map((order) => (
            <article key={order.id} className="rounded-[22px] border border-line bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[16px] font-extrabold">№{order.no}</div>
                <span className="rounded-full bg-[#FFF3C4] px-2.5 py-1 text-right text-[12px] font-bold text-[#8A6A00]">{orderStatusText(order, t)}</span>
              </div>
              <p className="mt-1 text-[13px] text-muted">
                {order.buyerName} · {order.address} · {som(order.totalSom)} сом
              </p>
              {order.status === "assigned" || order.status === "picked_up" ? <OrderLiveMap orderId={order.id} /> : null}
              {order.status === "accepted" || order.status === "assembled" || order.status === "assigned" ? (
                <div className="mt-3">
                  <GhostBtn disabled={busy === order.id + "cancel"} onClick={() => act(order.id, "cancel")}>
                    {t.deliveryShopCancel}
                  </GhostBtn>
                </div>
              ) : null}
              {order.status === "accepted" ? (
                <div className="mt-3">
                  <YellowBtn disabled={busy === order.id + "assemble"} onClick={() => act(order.id, "assemble")}>
                    {t.deliveryAssembled} ✓
                  </YellowBtn>
                </div>
              ) : null}
              {order.status === "assigned" && !order.shopPaid ? (
                <div className="mt-3">
                  <p className="mb-2 text-[14px] font-semibold text-ink">{t.deliveryPayShop(som(order.itemsTotalSom))}</p>
                  <RedBtn disabled={busy === order.id + "paid"} onClick={() => act(order.id, "paid")}>
                    {t.deliveryMoneyIn}
                  </RedBtn>
                </div>
              ) : null}
              {order.status === "refused" ? (
                <div className="mt-3">
                  <YellowBtn disabled={busy === order.id + "return"} onClick={() => act(order.id, "return")}>
                    {t.deliveryReturnOk}
                  </YellowBtn>
                </div>
              ) : null}
            </article>
          ))}
        </div>
        {rows && rows.length === 0 ? <p className="mt-8 text-center text-[15px] text-muted">{t.deliveryOrdersEmpty}</p> : null}
      </div>
    </PhoneShell>
  );
}
