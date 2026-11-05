"use client";

import { CourierReview } from "@/components/courier-admin";
import { PageHead, useSignedIn } from "@/components/delivery-ui";
import { PhoneShell } from "@/components/shell";
import { isAdminUser } from "@/lib/partners";
import { useApp } from "@/lib/store";

export default function CourierReviewPage() {
  const { t } = useApp();
  const user = useSignedIn("/courier/review");
  const allowed = Boolean(user && (isAdminUser(user) || user.owner));
  return (
    <PhoneShell>
      <PageHead title={t.deliveryAdminCouriers} fallback="/profile" />
      <div className="sc mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        {allowed ? <CourierReview /> : <p className="text-[15px] text-muted">{t.empty}</p>}
      </div>
    </PhoneShell>
  );
}
