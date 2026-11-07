"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { formatSom } from "@/lib/data";
import { useApp } from "@/lib/store";
import type { ShopItemStats, ShopStatsCard, ShopStatsPeriod } from "@/lib/shop-stats-types";
import { PhoneShell } from "./shell";
import { IconBack } from "./icons";

const PERIODS: ShopStatsPeriod[] = ["day", "week", "month"];

function replyLabel(minutes: number | null, empty: string, t: { shopStatsReplyMin: (n: number) => string; shopStatsReplyHour: (n: number) => string }): string {
  if (minutes == null) return empty;
  if (minutes < 1) return t.shopStatsReplyMin(1);
  if (minutes < 60) return t.shopStatsReplyMin(minutes);
  return t.shopStatsReplyHour(Math.max(1, Math.round(minutes / 60)));
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-line bg-white px-3 py-2.5">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="mt-0.5 font-display text-[18px] font-bold tabular-nums text-ink">{value}</div>
    </div>
  );
}

export function ShopStatsScreen() {
  const { t, user, setPendingPath } = useApp();
  const router = useRouter();
  const [period, setPeriod] = useState<ShopStatsPeriod>("day");
  const [rows, setRows] = useState<ShopStatsCard[] | null>(null);
  const [error, setError] = useState("");
  const labels: Record<ShopStatsPeriod, string> = {
    day: t.shopStatsDay,
    week: t.shopStatsWeek,
    month: t.shopStatsMonth,
  };

  useEffect(() => {
    if (!user) {
      setPendingPath("/shops/stats");
      router.replace("/login");
    }
  }, [user, router, setPendingPath]);

  useEffect(() => {
    if (!user) return;
    let live = true;
    setError("");
    void api<{ shops?: ShopStatsCard[] }>(`/api/shops/stats?period=${period}`).then((res) => {
      if (!live) return;
      if (!res.ok || !res.data?.shops) {
        setError(t.shopError);
        setRows([]);
        return;
      }
      setRows(res.data.shops);
    });
    return () => {
      live = false;
    };
  }, [user, period, t.shopError]);

  if (!user) return null;

  return (
    <PhoneShell>
      <div className="px-5 pb-2 pt-1">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface"
            aria-label={t.backLeave}
          >
            <IconBack size={16} color="#18181B" />
          </button>
          <span className="font-display text-[16px] font-bold">{t.shopStatsTitle}</span>
          <span className="w-9" />
        </div>
        <div className="mt-3 flex gap-2">
          {PERIODS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setPeriod(id)}
              className={`h-9 flex-1 rounded-full text-[13px] font-semibold ${period === id ? "bg-ink text-screen" : "border border-line bg-white text-ink"}`}
            >
              {labels[id]}
            </button>
          ))}
        </div>
      </div>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        {error ? <p className="text-[14px] font-semibold text-accent">{error}</p> : null}
        {rows && rows.length === 0 ? <p className="mt-4 text-[14px] text-muted">{t.shopStatsEmpty}</p> : null}
        <div className="mt-3 flex flex-col gap-4">
          {(rows ?? []).map((shop) => (
            <ShopBlock key={shop.id} shop={shop} empty={t.shopStatsNone} />
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}

function ShopBlock({ shop, empty }: { shop: ShopStatsCard; empty: string }) {
  const { t } = useApp();
  const refusal = shop.ordersOpened > 0 ? `${Math.round((shop.refused / shop.ordersOpened) * 100)}%` : empty;
  const metrics: Array<[string, string]> = [
    [t.shopStatsViews, String(shop.views)],
    [t.shopStatsItemViews, String(shop.itemViews)],
    [t.shopStatsCalls, String(shop.calls)],
    [t.shopStatsWhatsapp, String(shop.whatsapp)],
    [t.shopStatsChats, String(shop.chats)],
    [t.shopStatsSubs, String(shop.subscribers)],
    [t.shopStatsLikes, String(shop.likes)],
    [t.shopStatsOrders, String(shop.orders)],
    [t.shopStatsOrdersSum, `${formatSom(shop.ordersSom)} сом`],
    [t.shopStatsStockValue, `${formatSom(shop.stockValueSom)} сом`],
  ];
  return (
    <section className="rounded-[18px] border border-line bg-[#FAFAFB] p-3">
      <h2 className="font-display text-[18px] font-bold text-ink">{shop.name}</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {metrics.map(([label, value]) => (
          <Metric key={label} label={label} value={value} />
        ))}
      </div>
      <div className="mt-3 rounded-[14px] border border-line bg-white p-3">
        <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">{t.shopStatsRating}</div>
        <div className="mt-2 flex gap-4">
          <div>
            <div className="text-[12px] text-muted">{t.shopStatsReply}</div>
            <div className="font-display text-[16px] font-bold text-ink">
              {replyLabel(shop.replyMinutes, empty, t)}
            </div>
          </div>
          <div>
            <div className="text-[12px] text-muted">{t.shopStatsRefusal}</div>
            <div className="font-display text-[16px] font-bold text-ink">{refusal}</div>
          </div>
        </div>
      </div>
      {shop.items.length ? (
        <div className="mt-3 flex flex-col gap-2">
          {shop.items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ItemRow({ item }: { item: ShopItemStats }) {
  const { t } = useApp();
  return (
    <div className="rounded-[14px] border border-line bg-white px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 truncate text-[14px] font-semibold text-ink">{item.title}</div>
        {item.low ? <span className="shrink-0 rounded-full bg-[#FDE8E8] px-2 py-0.5 text-[11px] font-bold text-accent">{t.shopStatsLow}</span> : null}
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-muted">
        <span>{t.shopStatsItemViews}: {item.views}</span>
        <span>{t.shopStatsSold}: {item.sold}</span>
        <span>{t.shopStatsLeft}: {item.quantity == null ? t.shopStatsNone : item.quantity}</span>
        <span>{t.shopStatsRevenue}: {formatSom(item.revenueSom)} сом</span>
        <span className="col-span-2">{t.shopStatsItemValue}: {item.stockValueSom == null ? t.shopStatsNone : `${formatSom(item.stockValueSom)} сом`}</span>
      </div>
    </div>
  );
}
