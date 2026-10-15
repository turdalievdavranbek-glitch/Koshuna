"use client";

import type { ReactNode } from "react";
import { FiltersPanel } from "@/components/filters-panel";

/** Search, section and shop lists: filters sit in a sticky column on a wide screen. */
export function BrowseColumns({ children }: { children: ReactNode }) {
  return (
    <div className="contents desk:flex desk:min-h-0 desk:w-full desk:flex-1 desk:items-start desk:gap-6">
      <aside className="hidden desk:sticky desk:top-0 desk:block desk:max-h-[calc(100dvh-5.5rem)] desk:w-[280px] desk:shrink-0 desk:overflow-y-auto desk:pb-8">
        <FiltersPanel />
      </aside>
      <div className="contents desk:flex desk:min-h-0 desk:min-w-0 desk:flex-1 desk:flex-col">{children}</div>
    </div>
  );
}
