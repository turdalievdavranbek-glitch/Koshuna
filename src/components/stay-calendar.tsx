"use client";

import { useMemo, useState } from "react";
import {
  formatStayDay,
  monthCells,
  monthLabel,
  nightsBetween,
  parseKey,
  sameMonth,
  todayKey,
} from "@/lib/dates";
import { useApp } from "@/lib/store";

type Props = {
  checkIn: string | null;
  checkOut: string | null;
  onChange: (next: { checkIn: string | null; checkOut: string | null }) => void;
};

export function StayCalendar({ checkIn, checkOut, onChange }: Props) {
  const { t, lang } = useApp();
  const today = todayKey();
  const seed = parseKey(checkIn ?? today);
  const [cursor, setCursor] = useState(() => new Date(seed.getFullYear(), seed.getMonth(), 1));
  const nowMonth = useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  }, []);
  const cells = monthCells(cursor);
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const canPrev = !sameMonth(cursor, nowMonth) && cursor > nowMonth;

  const pick = (key: string) => {
    if (key < today) return;
    if (!checkIn || (checkIn && checkOut)) {
      onChange({ checkIn: key, checkOut: null });
      return;
    }
    if (key <= checkIn) {
      onChange({ checkIn: key, checkOut: null });
      return;
    }
    onChange({ checkIn, checkOut: key });
  };

  return (
    <div className="rounded-[18px] border border-line bg-white p-3.5">
      <div className="grid grid-cols-2 gap-2">
        <div
          className="rounded-xl px-3 py-2.5"
          style={{ background: checkIn && !checkOut ? "#17140F" : "#F7F3EC" }}
        >
          <div
            className="text-[11px] font-semibold uppercase tracking-[0.04em]"
            style={{ color: checkIn && !checkOut ? "#C9BBA8" : "#6E6558" }}
          >
            {t.checkIn}
          </div>
          <div
            className="mt-0.5 text-[15px] font-semibold"
            style={{ color: checkIn && !checkOut ? "#F7F3EC" : "#17140F" }}
          >
            {checkIn ? formatStayDay(checkIn, lang) : t.pickCheckIn}
          </div>
        </div>
        <div
          className="rounded-xl px-3 py-2.5"
          style={{ background: checkIn && !checkOut ? "#F7F3EC" : checkOut ? "#17140F" : "#F7F3EC" }}
        >
          <div
            className="text-[11px] font-semibold uppercase tracking-[0.04em]"
            style={{ color: checkOut ? "#C9BBA8" : "#6E6558" }}
          >
            {t.checkOut}
          </div>
          <div
            className="mt-0.5 text-[15px] font-semibold"
            style={{ color: checkOut ? "#F7F3EC" : "#17140F" }}
          >
            {checkOut ? formatStayDay(checkOut, lang) : t.pickCheckOut}
          </div>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between">
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
          const start = key === checkIn;
          const end = key === checkOut;
          const mid = Boolean(checkIn && checkOut && key > checkIn && key < checkOut);
          const selected = start || end;
          return (
            <button
              key={key}
              type="button"
              disabled={past}
              onClick={() => pick(key)}
              className="relative h-10 text-[13px] font-semibold"
              style={{
                color: past ? "#C9BBA8" : selected ? "#F7F3EC" : "#17140F",
                background: selected ? "#17140F" : mid ? "#F3E0D9" : "transparent",
                borderRadius: start && end ? 999 : start ? "999px 0 0 999px" : end ? "0 999px 999px 0" : mid ? 0 : 999,
              }}
            >
              {parseKey(key).getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-[13px] text-muted">
          {nights ? t.nights(nights) : checkIn ? t.pickCheckOutHint : t.pickCheckInHint}
        </p>
        {checkIn ? (
          <button
            type="button"
            onClick={() => onChange({ checkIn: null, checkOut: null })}
            className="text-[13px] font-semibold text-accent"
          >
            {t.clearDates}
          </button>
        ) : null}
      </div>
    </div>
  );
}
