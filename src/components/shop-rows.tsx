"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import type { Shop } from "@/lib/types";
import { ShopThumb } from "./shop-thumb";

export function ShopRows({ shops }: { shops: Shop[] }) {
  const { t } = useApp();
  const router = useRouter();
  return (
    <div className="flex flex-col gap-2.5">
      {shops.map((shop) => (
        <button
          key={shop.id}
          type="button"
          onClick={() => router.push(`/shops/${shop.id}`)}
          className="flex items-center gap-3 rounded-[18px] border border-line bg-white p-3 text-left"
        >
          <ShopThumb cover={shop.coverUrl} video={shop.videoUrl} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-display text-[16px] font-bold text-ink">{shop.name || t.shopCard}</span>
              {shop.status !== "active" ? (
                <span className="rounded-md bg-chip px-1.5 py-0.5 text-[10px] font-bold text-muted">{t.status[shop.status]}</span>
              ) : null}
            </div>
            <div className="mt-0.5 text-[12px] text-muted">
              {t.shopCats[shop.category]}
              {(shop.kinds ?? []).length ? ` · ${shop.kinds.slice(0, 2).map((id) => t.shopKinds[id]).join(", ")}` : ""}
              {" · "}
              {t.cities[shop.city]}
            </div>
            <div className="mt-0.5 truncate text-[12px] text-muted-2">{shop.address}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
