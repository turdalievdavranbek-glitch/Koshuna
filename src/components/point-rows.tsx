"use client";

import { useRouter } from "next/navigation";
import { shopDeliveryLine, shopPointSubtitle } from "@/lib/shops";
import { useApp } from "@/lib/store";
import type { Shop } from "@/lib/types";
import { sectionIcon } from "./icons";

export const POINT_GROUP_ICON: Record<string, string> = {
  food: "restaurants",
  farm: "animals",
  construction: "construction",
  furniture: "home",
  electronics: "bag",
  apparel: "secondhand",
  home: "home",
  books: "services",
  pets: "animals",
  health: "services",
  beauty: "services",
  repair: "construction",
  travel: "car-rental",
  other: "bag",
};

export function PointAvatar({ shop, size = 44 }: { shop: Pick<Shop, "coverUrl" | "category">; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F6E3D4]"
      style={{ width: size, height: size }}
    >
      {shop.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shop.coverUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        sectionIcon(POINT_GROUP_ICON[shop.category] || "bag", "#B8452F", 18)
      )}
    </div>
  );
}

export function PointList({
  shops,
  actions,
  testId = "point-list",
}: {
  shops: Shop[];
  /** «Изменить» and «Выложить товар» on profile and selling lists. */
  actions?: boolean;
  testId?: string;
}) {
  const { t, lang } = useApp();
  const router = useRouter();
  if (!shops.length) return null;
  return (
    <div data-testid={testId} className="flex min-w-0 flex-col gap-2">
      {shops.map((shop) => {
        const subtitle = shopPointSubtitle(shop, t.sellCardShop, t.sellCardStall, t.cities[shop.city] || shop.city, lang);
        const delivery = shopDeliveryLine(shop, t.pointDeliveryFreeLine, t.pointDeliveryPaidLine);
        return (
          <div key={shop.id} data-testid="point-row" className="min-w-0 rounded-[16px] border border-line bg-white px-3 py-3">
            <button
              type="button"
              onClick={() => router.push(`/shops/quick?shop=${shop.id}`)}
              className="flex w-full min-w-0 items-center gap-3 text-left"
            >
              <PointAvatar shop={shop} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-ink">{shop.name}</span>
                <span className="mt-0.5 block truncate text-[12px] text-muted">{subtitle}</span>
                {delivery ? <span className="mt-0.5 block truncate text-[12px] text-muted">{delivery}</span> : null}
              </span>
            </button>
            {actions ? (
              <div className="mt-2 flex gap-2 pl-14">
                <button
                  type="button"
                  data-testid="point-edit"
                  onClick={() => router.push(`/shops/${shop.id}/edit`)}
                  className="h-9 rounded-xl border border-line px-3 text-[13px] font-semibold text-ink"
                >
                  {t.pointEdit}
                </button>
                <button
                  type="button"
                  data-testid="point-add-goods"
                  onClick={() => router.push(`/shops/quick?shop=${shop.id}`)}
                  className="h-9 rounded-xl border border-line px-3 text-[13px] font-semibold text-accent"
                >
                  {t.pointAddGoods}
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
