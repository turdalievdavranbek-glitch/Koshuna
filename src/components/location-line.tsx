"use client";

import { usePathname, useRouter } from "next/navigation";
import { locationLineLabel } from "@/lib/places";
import { useApp } from "@/lib/store";
import { IconChevronDown, IconPin } from "@/components/icons";

const BACK_KEY = "koshuna-location-back";

export function openLocationPicker(router: { push: (href: string) => void }, from: string) {
  try {
    sessionStorage.setItem(BACK_KEY, from);
  } catch {
    /* ignore */
  }
  router.push("/location");
}

export function locationPickerBack(): string {
  try {
    return sessionStorage.getItem(BACK_KEY) || "/";
  } catch {
    return "/";
  }
}

export function LocationLine({ className }: { className?: string }) {
  const { t, lang, city, filters } = useApp();
  const router = useRouter();
  const path = usePathname();
  const label = locationLineLabel(
    lang,
    city,
    filters,
    t.cities,
    t.oblasts,
    t.locationRefine,
    t.locationCountryHint,
  );

  return (
    <button
      type="button"
      onClick={() => openLocationPicker(router, path || "/")}
      className={`mx-auto flex max-w-[320px] items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink ${className ?? ""}`}
    >
      <IconPin size={14} color="#B8452F" />
      <span className="truncate">{label}</span>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-chip" aria-hidden>
        <IconChevronDown size={14} color="#17140F" />
      </span>
    </button>
  );
}
