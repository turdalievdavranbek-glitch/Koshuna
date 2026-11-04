"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import type { OrderView } from "@/lib/delivery";
import { useApp } from "@/lib/store";
import { PhoneShell } from "@/components/shell";
import { orderStatusText, PageHead, som, useSignedIn } from "@/components/delivery-ui";

export default function OrdersPage() {
  const { t } = useApp();
  const user = useSignedIn("/orders");
  const router = useRouter();
  const [rows, setRows] = useState<OrderView[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    const pull = () => {
      void api<{ orders?: OrderView[] }>("/api/orders").then((res) => {
        if (!cancel) setRows(res.ok && Array.isArray(res.data?.orders) ? res.data.orders : []);
      });
    };
    pull();
    const timer = window.setInterval(pull, 8000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, [user]);

  return (
    <PhoneShell>
      <PageHead title={t.deliveryOrders} fallback="/profile" />
      <div className="sc mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        {rows && rows.length === 0 ? <p className="mt-8 text-center text-[15px] text-muted">{t.deliveryOrdersEmpty}</p> : null}
        <div className="flex flex-col gap-2">
          {(rows ?? []).map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => router.push(`/orders/${order.id}`)}
              className="rounded-[18px] border border-line bg-white px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[16px] font-extrabold text-ink">№{order.no}</span>
                <span className="text-[13px] font-semibold text-muted">{orderStatusText(order, t)}</span>
              </div>
              <div className="mt-0.5 truncate text-[13px] text-muted">{order.shopName}</div>
              <div className="mt-1 text-[14px] font-bold">{som(order.totalSom)} сом</div>
            </button>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}
