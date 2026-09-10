"use client";

import { useParams, useRouter } from "next/navigation";
import { isShopCategory, shopKindsOf } from "@/lib/shops";
import { useApp } from "@/lib/store";
import { PhoneShell } from "@/components/shell";
import { ShopKindPicker } from "@/components/shop-kind-picker";

export default function ShopCategoryPage() {
  const { category } = useParams<{ category: string }>();
  const router = useRouter();
  const { t } = useApp();

  if (!isShopCategory(category) || !shopKindsOf(category).length) {
    return (
      <PhoneShell tab>
        <div className="p-6 text-[15px] text-muted">{t.empty}</div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell tab>
      <ShopKindPicker
        parent={category}
        onBack={() => router.push("/shops")}
        onChoose={(id) => router.push(`/shops/c/${category}/${id}`)}
      />
    </PhoneShell>
  );
}
