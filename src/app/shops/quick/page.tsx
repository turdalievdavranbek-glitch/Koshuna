"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShopItemCapture } from "@/components/shop-item-capture";
import { PhoneShell } from "@/components/shell";
import { IconBack } from "@/components/icons";
import { useApp } from "@/lib/store";

export default function ShopQuickPage() {
  const { t, user, setPendingPath, setSide } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      setPendingPath("/shops/quick");
      router.replace("/login");
      return;
    }
    setSide("sell");
  }, [user, router, setPendingPath, setSide]);

  if (!user) return null;

  return (
    <PhoneShell>
      <div className="px-5 pb-2 pt-1">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => router.push("/selling")} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface">
            <IconBack size={16} color="#17140F" />
          </button>
          <span className="font-display text-[16px] font-bold">{t.shopQuickCta}</span>
          <span className="w-9" />
        </div>
      </div>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        <ShopItemCapture />
      </div>
    </PhoneShell>
  );
}
