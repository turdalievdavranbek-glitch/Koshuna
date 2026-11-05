"use client";

import { CourierRules } from "@/components/courier-rules";
import { PageHead, useSignedIn } from "@/components/delivery-ui";
import { PhoneShell } from "@/components/shell";
import { useApp } from "@/lib/store";

export default function CourierRulesPage() {
  const { t } = useApp();
  useSignedIn("/courier/rules");
  return (
    <PhoneShell>
      <PageHead title={t.courierRulesTitle} fallback="/courier" />
      <div className="sc mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        <CourierRules />
      </div>
    </PhoneShell>
  );
}
