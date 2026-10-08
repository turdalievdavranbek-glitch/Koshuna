"use client";

import { useEffect, useState } from "react";
import {
  categoryChipLabel,
  mentionsMedicine,
  readLastCategory,
  suggestCategories,
  type CategoryPick,
} from "@/lib/category-suggest";
import { useApp } from "@/lib/store";
import type { DraftListing, SectionId } from "@/lib/types";
import { PostTypePicker } from "./post-type-picker";
import { pickSection } from "./post-taxonomy";

const PERSONAL_HIDE: SectionId[] = ["shops", "restaurants"];

export function draftFromPick(draft: DraftListing, pick: CategoryPick, locked: boolean): Partial<DraftListing> {
  const base = pickSection({ ...draft, category: pick.category, animalGroup: pick.animalGroup }, pick.section);
  return {
    ...base,
    category: pick.category,
    goodsKind: pick.goodsKind,
    animalGroup: pick.animalGroup,
    animalKind: pick.animalKind,
    vehicleGroup: pick.vehicleGroup,
    carMake: pick.carMake,
    techBrand: pick.techBrand,
    categoryLocked: locked,
  };
}

export function CategoryChips({
  draft,
  onPatch,
  personal = true,
  autoApply = true,
}: {
  draft: DraftListing;
  onPatch: (patch: Partial<DraftListing>) => void;
  personal?: boolean;
  autoApply?: boolean;
}) {
  const { t } = useApp();
  const [picks, setPicks] = useState<CategoryPick[]>([]);
  const [open, setOpen] = useState(false);
  const [asLast, setAsLast] = useState(false);

  useEffect(() => {
    const text = draft.title.trim();
    const wait = text.length >= 3 ? 300 : 0;
    const timer = window.setTimeout(() => {
      const last = readLastCategory(personal);
      const short = text.length < 3;
      const next = short
        ? last
          ? [{ ...last, score: 0 }]
          : [{ section: "secondhand" as const, score: 0 }]
        : suggestCategories(text, { personal, last });
      setAsLast(Boolean(short && last) || (!short && next[0]?.score === 0 && Boolean(last) && next[0]?.section === last?.section));
      setPicks(next);
      if (autoApply && !draft.categoryLocked && next[0]) onPatch(draftFromPick(draft, next[0], false));
    }, wait);
    return () => window.clearTimeout(timer);
    // Recompute when the title changes. onPatch/draft identity would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.title, draft.categoryLocked, personal, autoApply]);

  const medicine = personal && mentionsMedicine(draft.title);
  return (
    <div>
      <div className="text-[13px] font-semibold text-muted">{t.catSection}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {picks.map((pick, index) => {
          const matches =
            draft.section === pick.section &&
            (draft.category ?? "") === (pick.category ?? "") &&
            (draft.animalKind ?? "") === (pick.animalKind ?? "");
          const selected = draft.categoryLocked ? matches : index === 0;
          const label = categoryChipLabel(pick, t, {
            asLast: asLast && index === 0 && pick.score === 0,
            noRefine: pick.score === 0 && !pick.category,
          });
          return (
            <button
              key={`${pick.section}-${pick.category ?? ""}-${pick.animalKind ?? ""}-${index}`}
              type="button"
              data-testid="cat-chip"
              onClick={() => onPatch(draftFromPick(draft, pick, true))}
              className="rounded-full px-3 py-1.5 text-[13px] font-semibold"
              style={{ background: selected ? "#B8452F" : "#EFE8DB", color: selected ? "#FFF7F0" : "#17140F" }}
            >
              {selected ? "✓ " : ""}
              {label}
            </button>
          );
        })}
        <button type="button" data-testid="cat-other" onClick={() => setOpen((v) => !v)} className="rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-accent">
          {t.catOther}
        </button>
      </div>
      {medicine ? <p className="mt-2 text-[12px] leading-[1.4] text-muted">{t.catPharmacyNote}</p> : null}
      {open ? (
        <div className="mt-2" data-testid="post-sections">
          <PostTypePicker
            startOpen
            value={draft.section}
            exclude={personal ? PERSONAL_HIDE : undefined}
            onPick={(id) => {
              onPatch({ ...pickSection(draft, id), categoryLocked: true });
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
