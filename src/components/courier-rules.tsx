"use client";

import { useApp } from "@/lib/store";

export function CourierRules() {
  const { t } = useApp();
  const lines = [t.courierRulePay, t.courierRuleCode, t.courierRuleReceipt, t.courierRulePause, t.courierRulePolite];
  return (
    <div className="rounded-[18px] border border-line bg-white px-4 py-3" data-testid="courier-rules">
      <div className="text-[14px] font-extrabold text-ink">{t.courierRulesTitle}</div>
      <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[13px] leading-[1.45] text-ink">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
    </div>
  );
}
