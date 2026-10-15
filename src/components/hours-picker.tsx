"use client";

import { useEffect, useRef, useState } from "react";
import { hoursFromLegacy, hoursToStored, type HoursPickerState } from "@/lib/shops";
import { useApp } from "@/lib/store";
import { SHOP_DAYS, type ShopDay, type ShopHours } from "@/lib/types";
import { Chip, Field } from "./ui";

const TIMES: string[] = [];
for (let hour = 0; hour < 24; hour += 1) {
  TIMES.push(`${String(hour).padStart(2, "0")}:00`);
  TIMES.push(`${String(hour).padStart(2, "0")}:30`);
}

const WEEK: ShopDay[] = ["mon", "tue", "wed", "thu", "fri"];

export function HoursPicker({
  hours,
  onChange,
  title,
}: {
  hours?: ShopHours;
  onChange: (next: ShopHours | undefined) => void;
  title?: string;
}) {
  const { t } = useApp();
  const [state, setState] = useState<HoursPickerState>(() => hoursFromLegacy(hours));
  const seen = useRef(JSON.stringify(hours ?? null));

  useEffect(() => {
    const key = JSON.stringify(hours ?? null);
    if (key === seen.current) return;
    seen.current = key;
    setState(hoursFromLegacy(hours));
  }, [hours]);

  const dayLabel: Record<ShopDay, string> = {
    mon: t.dayMon,
    tue: t.dayTue,
    wed: t.dayWed,
    thu: t.dayThu,
    fri: t.dayFri,
    sat: t.daySat,
    sun: t.daySun,
  };

  const commit = (next: HoursPickerState) => {
    setState(next);
    const stored = hoursToStored(next);
    seen.current = JSON.stringify(stored ?? null);
    onChange(stored);
  };

  const setDays = (days: ShopDay[]) => commit({ ...state, days });

  return (
    <div id="hours-block" data-testid="hours-block" className="flex flex-col gap-3">
      <div className="text-[13px] font-semibold text-ink">{title || t.hoursTitle}</div>
      <div className="flex flex-wrap gap-2">
        <Chip
          testId="hours-918"
          active={!state.allDay && state.slot?.open === "09:00" && state.slot?.close === "18:00"}
          onClick={() => commit({ ...state, allDay: false, slot: { open: "09:00", close: "18:00" } })}
        >
          {t.hours918}
        </Chip>
        <Chip
          testId="hours-1020"
          active={!state.allDay && state.slot?.open === "10:00" && state.slot?.close === "20:00"}
          onClick={() => commit({ ...state, allDay: false, slot: { open: "10:00", close: "20:00" } })}
        >
          {t.hours1020}
        </Chip>
        <Chip testId="hours-24" active={state.allDay} onClick={() => commit({ ...state, allDay: true, slot: null })}>
          {t.hours24}
        </Chip>
        <Chip
          testId="hours-weekend"
          active={state.days.length === WEEK.length && WEEK.every((id) => state.days.includes(id))}
          onClick={() => setDays([...WEEK])}
        >
          {t.hoursWeekendOff}
        </Chip>
      </div>
      {state.allDay ? null : (
        <div className="grid grid-cols-2 gap-2">
          <Field label={t.hoursFrom}>
            <select
              data-testid="hours-from"
              value={state.slot?.open ?? ""}
              onChange={(e) => {
                const open = e.target.value;
                if (!open) {
                  commit({ ...state, allDay: false, slot: null });
                  return;
                }
                commit({ ...state, allDay: false, slot: { open, close: state.slot?.close || "18:00" } });
              }}
              className="h-[50px] w-full rounded-[14px] border border-line bg-white px-[15px] text-[15px]"
            >
              <option value="">—</option>
              {TIMES.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.hoursTo}>
            <select
              data-testid="hours-to"
              value={state.slot?.close ?? ""}
              onChange={(e) => {
                const close = e.target.value;
                if (!close) {
                  commit({ ...state, allDay: false, slot: null });
                  return;
                }
                commit({ ...state, allDay: false, slot: { open: state.slot?.open || "09:00", close } });
              }}
              className="h-[50px] w-full rounded-[14px] border border-line bg-white px-[15px] text-[15px]"
            >
              <option value="">—</option>
              {TIMES.map((time) => (
                <option key={`to-${time}`} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
      <div>
        <div className="mb-1.5 text-[12px] font-semibold text-muted">{t.hoursDays}</div>
        <div className="flex flex-wrap gap-2">
          {SHOP_DAYS.map((id) => {
            const on = state.days.includes(id);
            return (
              <Chip
                key={id}
                testId={`day-${id}`}
                pressed={on}
                active={on}
                onClick={() => setDays(on ? state.days.filter((day) => day !== id) : [...state.days, id])}
              >
                {dayLabel[id]}
              </Chip>
            );
          })}
        </div>
      </div>
    </div>
  );
}
