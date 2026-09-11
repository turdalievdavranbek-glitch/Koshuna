"use client";

import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import type { AppSide } from "@/lib/types";

export function SideSwitch({ compact }: { compact?: boolean }) {
  const { t, side, setSide, elderMode, user, setPendingPath } = useApp();
  const path = usePathname();
  const router = useRouter();

  const pick = (next: AppSide) => {
    setSide(next);
    if (!user) {
      setPendingPath(path || "/profile");
      router.push("/login");
      return;
    }
    if (next === "sell" && path === "/favorites") router.replace("/selling");
    if (next === "buy" && path === "/selling") router.replace("/favorites");
  };

  return (
    <div>
      <div
        className={`flex rounded-[14px] bg-chip ${compact ? "p-1" : elderMode ? "p-1.5" : "p-1"}`}
        role="tablist"
        aria-label={t.sideSwitchAria}
      >
        {(
          [
            ["buy", t.sideBuy],
            ["sell", t.sideSell],
          ] as const
        ).map(([id, label]) => {
          const on = side === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => pick(id)}
              className={`flex-1 rounded-[11px] font-semibold ${
                compact ? "py-2 text-[13px]" : elderMode ? "py-3 text-[16px]" : "py-2.5 text-[14px]"
              }`}
              style={{
                background: on ? "#17140F" : "transparent",
                color: on ? "#F7F3EC" : "#6E6558",
                boxShadow: on ? "0 1px 3px rgba(23,20,15,.12)" : "none",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      {compact ? null : (
        <p className="mt-2 text-[13px] leading-[1.45] text-muted">{side === "sell" ? t.sideSellHint : t.sideBuyHint}</p>
      )}
    </div>
  );
}
