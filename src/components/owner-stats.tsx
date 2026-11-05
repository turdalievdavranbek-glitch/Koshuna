"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { OwnerAccount, OwnerStats } from "@/lib/owner";
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

function dash(value: string): string {
  return value.trim() ? value : "—";
}

export function OwnerStatsScreen() {
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [accounts, setAccounts] = useState<OwnerAccount[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accountsBusy, setAccountsBusy] = useState(false);

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
    void api<{ accounts: OwnerAccount[] }>("/api/owner/accounts").then((res) => {
      if (cancel) return;
      if (!res.ok || !res.data?.accounts) {
        setError(true);
        return;
      }
      setAccounts(res.data.accounts);
    });
    return () => {
      cancel = true;
    };
  }, []);

  const download = async (path: string, filename: string, setFlag: (value: boolean) => void) => {
    setFlag(true);
    try {
      const res = await fetch(path, { credentials: "same-origin" });
      if (!res.ok) {
        setError(true);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(true);
    } finally {
      setFlag(false);
    }
  };

  const needle = query.trim().toLowerCase();
  const shown = (accounts ?? []).filter((row) => {
    if (!needle) return true;
    const shop = row.shop ? "да" : "нет";
    return [row.email, row.name, row.method, row.registeredAt, row.lastSeenAt, String(row.listings), shop]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

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
              <div className="mt-3">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Поиск по email или имени"
                  className="h-11 w-full rounded-2xl border border-line bg-white px-3.5 text-[14px] text-ink outline-none"
                />
                <div className="mt-2 overflow-x-auto rounded-[16px] border border-line bg-white">
                  <table className="w-full min-w-[760px] text-left text-[13px]">
                    <thead className="bg-[#FAFAFB] text-[11px] uppercase tracking-[0.04em] text-muted">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Email</th>
                        <th className="px-2 py-2 font-semibold">Имя</th>
                        <th className="px-2 py-2 font-semibold">Вход</th>
                        <th className="px-2 py-2 font-semibold">Регистрация</th>
                        <th className="px-2 py-2 font-semibold">Последний визит</th>
                        <th className="px-2 py-2 font-semibold">Объявления</th>
                        <th className="px-2 py-2 font-semibold">Точка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((row, index) => (
                        <tr key={`${row.email}-${row.registeredAt}-${index}`} className="border-t border-line">
                          <td className="max-w-[220px] truncate px-3 py-2">{dash(row.email)}</td>
                          <td className="max-w-[160px] truncate px-2 py-2">{dash(row.name)}</td>
                          <td className="whitespace-nowrap px-2 py-2">{dash(row.method)}</td>
                          <td className="whitespace-nowrap px-2 py-2 tabular-nums">{dash(row.registeredAt)}</td>
                          <td className="whitespace-nowrap px-2 py-2 tabular-nums">{dash(row.lastSeenAt)}</td>
                          <td className="px-2 py-2 tabular-nums">{row.listings}</td>
                          <td className="px-2 py-2">{row.shop ? "Да" : "Нет"}</td>
                        </tr>
                      ))}
                      {!accounts ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-3 text-muted">
                            Загрузка…
                          </td>
                        </tr>
                      ) : shown.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-3 text-muted">
                            {accounts.length === 0 ? "Пока нет аккаунтов." : "Ничего не найдено."}
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  disabled={accountsBusy || !accounts}
                  onClick={() => void download("/api/owner/accounts?format=csv", "akkaunty.csv", setAccountsBusy)}
                  className="mt-3 h-[52px] w-full rounded-2xl border border-line bg-white text-[16px] font-bold text-ink disabled:opacity-40"
                >
                  Скачать аккаунты (CSV)
                </button>
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
              onClick={() => void download("/api/owner/stats?format=csv", "statistika.csv", setBusy)}
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
