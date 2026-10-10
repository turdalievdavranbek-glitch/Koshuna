"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PointForm } from "@/components/point-form";
import { pointKindOf, PointWizard } from "@/components/point-quick-form";
import { ShopItemCapture } from "@/components/shop-item-capture";
import { PhoneShell } from "@/components/shell";
import { IconBack } from "@/components/icons";
import { goBack } from "@/lib/go-back";
import { useApp } from "@/lib/store";

export default function ShopQuickPage() {
  const { t, user, setPendingPath, setSide, askLeave } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("card");
  const card = pointKindOf(raw);
  const shopId = params.get("shop") || undefined;
  const created = params.get("created") || undefined;
  const pointCreate = Boolean(card) && !shopId;

  useEffect(() => {
    if (!user) {
      setPendingPath("/shops/quick");
      router.replace("/login");
      return;
    }
    setSide("sell");
    // setSide/setPendingPath are new each store render — do not depend on them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return null;

  return (
    <PhoneShell focus={pointCreate}>
      <div className="px-5 pb-2 pt-1">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              const run = () => goBack(router, "/selling");
              if (askLeave(run)) return;
              run();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface"
            aria-label={t.backLeave}
          >
            <IconBack size={16} color="#17140F" />
          </button>
          <span className="font-display text-[16px] font-bold">
            {pointCreate
              ? card === "service"
                ? t.sellCardService
                : card === "cafe"
                  ? t.sellCardCafe
                  : t.pointFormTitle
              : card === "stall"
                ? t.sellCardStall
                : card === "shop"
                  ? t.sellCardShop
                  : t.shopQuickCta}
          </span>
          <span className="w-9" />
        </div>
      </div>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        {pointCreate ? (
          created ? (
            <PointForm mode="create" venue={card === "stall" ? "stall" : "shop"} createdId={created} />
          ) : (
            <PointWizard kind={card ?? "shop"} />
          )
        ) : (
          <ShopItemCapture shopId={shopId} />
        )}
      </div>
    </PhoneShell>
  );
}
