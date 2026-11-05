"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { OwnerStats } from "@/lib/owner";
import { PhoneShell } from "./shell";
import { PageHead } from "./delivery-ui";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[16px] border border-line bg-white px-3.5 py-3">
      <div className="text-[12px] leading-[1.3] text-muted">{label}</div>
      <div className="mt-1 font-display text-[22px] font-extrabold tabular-nums text-ink">{value}</div>
    </div>
  );
}

export function OwnerStatsScreen() {
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancel = false;
    void api<OwnerStats>("/api/owner/stats").then((res) => {
      if (cancel) return;
      if (!res.ok || !res.data) {
        setError(true);
        return;
      }
      setStats(res.data);
    });
    return () => {
      cancel = true;
    };
  }, []);

  const download = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/owner/stats?format=csv", { credentials: "same-origin" });
      if (!res.ok) {
        setError(true);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "statistika.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PhoneShell>
      <PageHead title="Статистика" fallback="/profile" />
      <div className="sc mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        {error ? <p className="text-[14px] font-semibold text-accent">Не удалось загрузить статистику.</p> : null}
        {stats ? (
          <div className="flex flex-col gap-4">
            <section>
              <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted">Аккаунты</h2>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Stat label="Всего" value={stats.accounts.total} />
                <Stat label="Новые сегодня" value={stats.accounts.today} />
                <Stat label="Новые за 7 дней" value={stats.accounts.days7} />
                <Stat label="Новые за 30 дней" value={stats.accounts.days30} />
              </div>
            </section>
            <section>
              <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted">Активные</h2>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Stat label="Сегодня" value={stats.active.today} />
                <Stat label="За 7 дней" value={stats.active.days7} />
                <Stat label="За 30 дней" value={stats.active.days30} />
              </div>
            </section>
            <section>
              <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted">Объявления</h2>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Stat label="Активные" value={stats.listings.active} />
                <Stat label="С видео" value={stats.listings.videos} />
                <Stat label="Новые сегодня" value={stats.listings.today} />
                <Stat label="Новые за 7 дней" value={stats.listings.days7} />
                <Stat label="Новые за 30 дней" value={stats.listings.days30} />
              </div>
            </section>
            <section>
              <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted">Точки и доставка</h2>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Stat label="Точек всего" value={stats.shops.total} />
                <Stat label="Новых точек за 7 дней" value={stats.shops.days7} />
                <Stat label="Заказов всего" value={stats.orders.total} />
              </div>
              <div className="mt-2 rounded-[16px] border border-line bg-white px-3.5 py-3">
                {stats.orders.byStatus.map((row) => (
                  <div key={row.status} className="flex items-center justify-between py-1 text-[14px]">
                    <span className="text-muted">{row.label}</span>
                    <span className="font-semibold tabular-nums text-ink">{row.count}</span>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted">Последние 30 дней</h2>
              <p className="mt-1 text-[12px] leading-[1.4] text-muted">В столбце «Активные» — люди, чей последний заход пришёлся на этот день.</p>
              <div className="mt-2 overflow-hidden rounded-[16px] border border-line bg-white">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-[#FAFAFB] text-[11px] uppercase tracking-[0.04em] text-muted">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Дата</th>
                      <th className="px-2 py-2 font-semibold">Аккаунты</th>
                      <th className="px-2 py-2 font-semibold">Активные</th>
                      <th className="px-2 py-2 font-semibold">Объявления</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.days.map((row) => (
                      <tr key={row.date} className="border-t border-line">
                        <td className="px-3 py-2 tabular-nums">{row.label}</td>
                        <td className="px-2 py-2 tabular-nums">{row.accounts}</td>
                        <td className="px-2 py-2 tabular-nums">{row.active}</td>
                        <td className="px-2 py-2 tabular-nums">{row.listings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <button
              type="button"
              disabled={busy}
              onClick={() => void download()}
              className="shadow-btn h-[52px] w-full rounded-2xl bg-accent text-[16px] font-bold text-accent-on disabled:opacity-40"
            >
              Скачать Excel (CSV)
            </button>
          </div>
        ) : null}
      </div>
    </PhoneShell>
  );
}
