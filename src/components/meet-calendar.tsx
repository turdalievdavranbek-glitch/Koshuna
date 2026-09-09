"use client";

import { useMemo, useState } from "react";
import { monthCells, monthLabel, parseKey, sameMonth, todayKey } from "@/lib/dates";
import { useApp } from "@/lib/store";

type Props = {
  value: string | null;
  onChange: (key: string) => void;
};

export function MeetDayCalendar({ value, onChange }: Props) {
  const { t, lang } = useApp();
  const today = todayKey();
  const seed = parseKey(value ?? today);
  const [cursor, setCursor] = useState(() => new Date(seed.getFullYear(), seed.getMonth(), 1));
  const nowMonth = useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  }, []);
  const cells = monthCells(cursor);
  const canPrev = !sameMonth(cursor, nowMonth) && cursor > nowMonth;

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line disabled:opacity-30"
          aria-label={t.prevMonth}
        >
          ‹
        </button>
        <div className="font-display text-[15px] font-bold text-ink">{monthLabel(cursor, lang)}</div>
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line"
          aria-label={t.nextMonth}
        >
          ›
        </button>
      </div>
      <div className="mt-2.5 grid grid-cols-7">
        {t.weekdays.map((d) => (
          <div key={d} className="py-1 text-center text-[11px] font-semibold text-muted-2">
            {d}
          </div>
        ))}
        {cells.map((key, i) => {
          if (!key) return <div key={`e-${i}`} />;
          const past = key < today;
          const selected = key === value;
          return (
            <button
              key={key}
              type="button"
              disabled={past}
              onClick={() => onChange(key)}
              className="h-10 text-[13px] font-semibold"
              style={{
                color: past ? "#C9BBA8" : selected ? "#F7F3EC" : "#17140F",
                background: selected ? "#17140F" : "transparent",
                borderRadius: 999,
              }}
            >
              {parseKey(key).getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
