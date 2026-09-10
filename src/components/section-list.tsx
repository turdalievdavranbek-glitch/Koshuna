"use client";

import { IconCheck } from "@/components/icons";
import { Eyebrow } from "@/components/ui";

export type SectionListRow = {
  id: string;
  label: string;
  active: boolean;
  onClick: () => void;
};

export function SectionList({
  title,
  rows,
  hideSingle,
}: {
  title: string;
  rows: SectionListRow[];
  hideSingle?: boolean;
}) {
  if (!rows.length) return null;
  if (hideSingle && rows.length <= 1) return null;

  return (
    <div>
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-2 overflow-hidden rounded-[16px] border border-line bg-white">
        {rows.map((row, i) => (
          <button
            key={row.id}
            type="button"
            onClick={row.onClick}
            className={`flex h-[50px] w-full items-center justify-between px-4 text-left ${
              i < rows.length - 1 ? "border-b border-line" : ""
            } ${row.active ? "bg-accent-tint" : ""}`}
          >
            <span
              className={`text-[15px] ${row.active ? "font-bold text-accent-dark" : "font-semibold text-ink"}`}
            >
              {row.label}
            </span>
            {row.active ? (
              <IconCheck size={16} color="#B8452F" />
            ) : (
              <span className="text-[17px] leading-none text-muted-2">›</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
