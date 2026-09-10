"use client";

import { shopKindsOf } from "@/lib/shops";
import { useApp } from "@/lib/store";
import type { ShopCategory, ShopKind } from "@/lib/types";
import { IconBack, IconCheck } from "./icons";

export function ShopKindPicker({
  parent,
  selected,
  multiple,
  onChoose,
  onToggle,
  onBack,
  onDone,
}: {
  parent: ShopCategory;
  selected?: ShopKind[];
  multiple?: boolean;
  onChoose?: (id: ShopKind | "all") => void;
  onToggle?: (id: ShopKind) => void;
  onBack: () => void;
  onDone?: () => void;
}) {
  const { t } = useApp();
  const kids = shopKindsOf(parent);
  const picked = selected ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-screen">
      <div className="flex items-center justify-between px-5 pb-2 pt-1">
        <button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface">
          <IconBack size={16} color="#17140F" />
        </button>
        <h1 className="font-display text-[17px] font-bold text-ink">{t.shopCats[parent]}</h1>
        <span className="w-9" />
      </div>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.shopDepartments}</div>
        {multiple ? <p className="mt-1 text-[12px] leading-[1.4] text-muted">{t.shopDepartmentHint}</p> : null}
        <div className="mt-3 overflow-hidden rounded-[18px] border border-line bg-white">
          {multiple ? null : (
            <button
              type="button"
              onClick={() => onChoose?.("all")}
              className="flex h-[54px] w-full items-center justify-between border-b border-line px-4 text-left"
            >
              <span className="text-[15px] font-semibold text-ink">{t.shopAllInCat}</span>
              <span className="text-[18px] text-muted-2">›</span>
            </button>
          )}
          {kids.map((id, i) => {
            const on = picked.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => (multiple ? onToggle?.(id) : onChoose?.(id))}
                className={`flex h-[54px] w-full items-center justify-between px-4 text-left ${i < kids.length - 1 ? "border-b border-line" : ""}`}
              >
                <span className="text-[15px] font-semibold text-ink">{t.shopKinds[id]}</span>
                {multiple ? (
                  on ? <IconCheck size={16} color="#B8452F" /> : <span className="h-4 w-4 rounded-full border border-line" />
                ) : (
                  <span className="text-[18px] text-muted-2">›</span>
                )}
              </button>
            );
          })}
        </div>
        {multiple ? (
          <button type="button" onClick={onDone} className="shadow-btn mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-accent text-[15px] font-semibold text-accent-on">
            {t.shopDeptDone}
          </button>
        ) : null}
      </div>
    </div>
  );
}
