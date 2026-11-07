"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { shopPointSubtitle } from "@/lib/shops";
import { useApp } from "@/lib/store";
import type { Shop } from "@/lib/types";
import { PointAvatar } from "./point-rows";

export function SubscriptionList() {
  const { t, lang } = useApp();
  const router = useRouter();
  const [shops, setShops] = useState<Shop[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let dead = false;
    void api<{ shops: Shop[] }>("/api/me/subscriptions").then((res) => {
      if (dead) return;
      if (!res.ok || !res.data?.shops) {
        setFailed(true);
        setShops([]);
        return;
      }
      setFailed(false);
      setShops(res.data.shops);
    });
    return () => {
      dead = true;
    };
  }, []);

  if (shops == null) return null;
  if (failed) return <p className="text-[14px] leading-[1.45] text-muted">{t.subsFailed}</p>;
  if (!shops.length) return <p className="text-[14px] leading-[1.45] text-muted">{t.subsEmpty}</p>;

  return (
    <div data-testid="subscription-list" className="flex min-w-0 flex-col gap-2">
      {shops.map((shop) => {
        const subtitle = shopPointSubtitle(shop, t.sellCardShop, t.sellCardStall, t.cities[shop.city] || shop.city, lang);
        return (
          <button
            key={shop.id}
            type="button"
            data-testid="subscription-row"
            onClick={() => router.push(`/shops/${shop.id}`)}
            className="flex min-w-0 items-center gap-3 rounded-[16px] border border-line bg-white px-3 py-3 text-left"
          >
            <PointAvatar shop={shop} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-ink">{shop.name}</span>
              {subtitle ? <span className="mt-0.5 block truncate text-[12px] text-muted">{subtitle}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
