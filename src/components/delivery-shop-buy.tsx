"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import type { CartShop } from "@/lib/delivery";
import { useApp } from "@/lib/store";

export function useShopCart(shopId: string, enabled: boolean) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const reload = useCallback(() => {
    if (!shopId) return;
    void api<{ shops?: CartShop[] }>("/api/delivery/cart").then((res) => {
      const group = res.ok ? res.data?.shops?.find((row) => row.shopId === shopId) : undefined;
      const next: Record<string, number> = {};
      for (const line of group?.lines ?? []) next[line.productId] = line.qty;
      setQty(next);
    });
  }, [shopId]);

  useEffect(() => {
    if (!enabled) {
      setQty({});
      return;
    }
    reload();
  }, [enabled, reload]);

  const change = async (productId: string, next: number) => {
    const qtyNext = Math.max(0, Math.min(99, next));
    setQty((prev) => {
      const copy = { ...prev };
      if (qtyNext === 0) delete copy[productId];
      else copy[productId] = qtyNext;
      return copy;
    });
    const res = await api("/api/delivery/cart", { method: "PUT", json: { shopId, productId, qty: qtyNext } });
    if (!res.ok) reload();
  };

  const count = Object.values(qty).reduce((sum, n) => sum + n, 0);
  return { qty, change, count };
}

export function ShopQty({
  qty,
  onChange,
  disabled,
}: {
  qty: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  const { t } = useApp();
  if (!qty) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(1)}
        className="mt-2 h-9 rounded-xl bg-accent px-3 text-[13px] font-bold text-accent-on disabled:opacity-40"
      >
        {t.deliveryAdd}
      </button>
    );
  }
  return (
    <div className="mt-2 flex items-center gap-2">
      <button type="button" aria-label="−" onClick={() => onChange(qty - 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-[18px] font-bold text-ink">
        −
      </button>
      <span className="min-w-4 text-center text-[15px] font-bold tabular-nums">{qty}</span>
      <button type="button" aria-label="+" onClick={() => onChange(qty + 1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-[18px] font-bold text-white">
        +
      </button>
    </div>
  );
}

export function ShopCartBar({ count }: { count: number }) {
  const { t } = useApp();
  const router = useRouter();
  if (!count) return null;
  return (
    <div className="sticky bottom-3 z-20 mt-4">
      <button type="button" onClick={() => router.push("/cart")} className="shadow-btn flex h-[52px] w-full items-center justify-center rounded-2xl bg-accent text-[16px] font-bold text-accent-on">
        {t.deliveryCart} · {count}
      </button>
    </div>
  );
}
