"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RestaurantMenuCapture } from "@/components/restaurant-menu-capture";
import { PhoneShell } from "@/components/shell";
import { IconBack } from "@/components/icons";
import { useApp } from "@/lib/store";

export default function RestaurantQuickPage() {
  const { t, user, setPendingPath, setSide } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      setPendingPath("/restaurants/quick");
      router.replace("/login");
      return;
    }
    setSide("sell");
    // setSide/setPendingPath are new each store render — do not depend on them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return null;

  return (
    <PhoneShell>
      <div className="px-5 pb-2 pt-1">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => router.push("/selling")} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface">
            <IconBack size={16} color="#17140F" />
          </button>
          <span className="max-w-[240px] truncate font-display text-[16px] font-bold">{t.restaurantQuickCta}</span>
          <span className="w-9" />
        </div>
      </div>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        <RestaurantMenuCapture />
      </div>
    </PhoneShell>
  );
}
