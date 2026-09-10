"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShopForm } from "@/components/shop-form";
import { PhoneShell } from "@/components/shell";
import { IconBack } from "@/components/icons";
import { isOwnShop } from "@/lib/shops";
import { useApp } from "@/lib/store";

export default function EditShopPage() {
  const { id } = useParams<{ id: string }>();
  const { t, user, shops, startShopDraft, setPendingPath } = useApp();
  const router = useRouter();
  const shop = shops.find((item) => item.id === id);

  useEffect(() => {
    if (!user) {
      setPendingPath(`/shops/${id}/edit`);
      router.replace("/login");
      return;
    }
    if (shop && isOwnShop(shop, user)) startShopDraft(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id, shop?.id]);

  if (!user) return null;
  if (!shop || !isOwnShop(shop, user)) {
    return (
      <PhoneShell>
        <div className="p-6 text-[15px] text-muted">{t.shopForbidden}</div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell>
      <div className="px-5 pb-2 pt-1">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => router.push(`/shops/${id}`)} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface">
            <IconBack size={16} color="#17140F" />
          </button>
          <span className="font-display text-[16px] font-bold">{t.shopEdit}</span>
          <span className="w-9" />
        </div>
      </div>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        <ShopForm />
      </div>
    </PhoneShell>
  );
}
