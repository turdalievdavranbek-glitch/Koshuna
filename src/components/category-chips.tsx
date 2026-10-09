"use client";

import { useEffect, useRef, useState } from "react";
import {
  categoryChipLabel,
  mentionsMedicine,
  readLastCategory,
  suggestCategories,
  type CategoryPick,
} from "@/lib/category-suggest";
import { isServiceGroup, SERVICE_GROUPS, SERVICE_TOP, serviceGroupOf } from "@/lib/data";
import { useApp } from "@/lib/store";
import type { DraftListing, SectionId } from "@/lib/types";
import { PostTypePicker } from "./post-type-picker";
import { pickSection } from "./post-taxonomy";
import { SectionList } from "./section-list";

const PERSONAL_HIDE: SectionId[] = ["shops", "restaurants"];
/** A guess this strong (and clearly ahead of the next) is selected for the person; weaker ones only suggest. */
const SURE_SCORE = 6;

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
  section,
  requirePick = false,
  showHint = false,
}: {
  draft: DraftListing;
  onPatch: (patch: Partial<DraftListing>) => void;
  personal?: boolean;
  autoApply?: boolean;
  /** When set, chips stay inside this section (the service card). */
  section?: SectionId;
  /** Personal post: nothing preselected; up to 3 suggestions; publishing needs draft.sectionPicked. */
  requirePick?: boolean;
  /** Show «Выберите раздел» under the chips (after a publish attempt). */
  showHint?: boolean;
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
      if (section === "services") {
        const next = short ? [] : suggestCategories(text, { personal, last, section }).filter((pick) => pick.score > 0 && pick.category);
        setAsLast(false);
        setPicks(next);
        if (autoApply && !draft.categoryLocked) {
          if (next[0]) onPatch(draftFromPick(draft, next[0], false));
          else if (draft.category) onPatch({ category: undefined, goodsKind: undefined });
        }
        return;
      }
      if (requirePick) {
        const found = short ? [] : suggestCategories(text, { personal, section }).filter((pick) => pick.score > 0);
        setAsLast(false);
        setPicks(found);
        if (!draft.categoryLocked) {
          const top = found[0];
          const sure = Boolean(top && top.score >= SURE_SCORE && (found.length === 1 || top.score >= 2 * found[1].score));
          if (sure && top) onPatch({ ...draftFromPick(draft, top, false), sectionPicked: true });
          else if (draft.sectionPicked) onPatch({ sectionPicked: false });
        }
        return;
      }
      const next = short
        ? last && (!section || last.section === section)
          ? [{ ...last, score: 0 }]
          : [{ section: section ?? ("secondhand" as const), score: 0 }]
        : suggestCategories(text, { personal, last, section });
      setAsLast(Boolean(short && last) || (!short && next[0]?.score === 0 && Boolean(last) && next[0]?.section === last?.section));
      setPicks(next);
      if (autoApply && !draft.categoryLocked && next[0]) onPatch(draftFromPick(draft, next[0], false));
    }, wait);
    return () => window.clearTimeout(timer);
    // Recompute when the title changes. onPatch/draft identity would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.title, draft.categoryLocked, personal, autoApply, section, requirePick]);

  const medicine = personal && mentionsMedicine(draft.title);
  if (requirePick) {
    const picked = Boolean(draft.sectionPicked);
    const same = (pick: CategoryPick) =>
      draft.section === pick.section &&
      (draft.category ?? "") === (pick.category ?? "") &&
      (draft.animalKind ?? "") === (pick.animalKind ?? "");
    const current: CategoryPick | null =
      picked && !picks.some(same)
        ? {
            section: draft.section,
            category: draft.category,
            goodsKind: draft.goodsKind,
            animalGroup: draft.animalGroup,
            animalKind: draft.animalKind,
            carMake: draft.carMake,
            score: 1,
          }
        : null;
    const shown = current ? [current, ...picks] : picks;
    return (
      <div>
        <div className="text-[13px] font-semibold text-muted">{t.catSection}</div>
        {picks.length ? <div className="mt-1 text-[12px] text-muted">{t.catLooksLike}</div> : null}
        <div className="mt-2 flex flex-wrap gap-2">
          {shown.map((pick, index) => {
            const selected = picked && same(pick);
            return (
              <button
                key={`${pick.section}-${pick.category ?? ""}-${pick.animalKind ?? ""}-${index}`}
                type="button"
                data-testid="cat-chip"
                data-category={pick.category ?? ""}
                data-selected={selected ? "true" : "false"}
                onClick={() => onPatch({ ...draftFromPick(draft, pick, true), sectionPicked: true })}
                className="rounded-full px-3 py-1.5 text-[13px] font-semibold"
                style={{ background: selected ? "#B8452F" : "#EFE8DB", color: selected ? "#FFF7F0" : "#17140F" }}
              >
                {selected ? "✓ " : ""}
                {categoryChipLabel(pick, t)}
              </button>
            );
          })}
          <button type="button" data-testid="cat-other" onClick={() => setOpen((v) => !v)} className="rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-accent">
            {t.catOther}
          </button>
        </div>
        {showHint && !picked ? (
          <p className="mt-2 text-[12px] font-semibold text-accent" data-testid="cat-pick-hint">
            {t.catPickHint}
          </p>
        ) : null}
        {medicine ? <p className="mt-2 text-[12px] leading-[1.4] text-muted">{t.catPharmacyNote}</p> : null}
        {open ? (
          <div className="mt-2" data-testid="post-sections">
            <PostTypePicker
              startOpen
              value={picked ? draft.section : undefined}
              exclude={personal ? PERSONAL_HIDE : undefined}
              onPick={(id) => {
                onPatch({ ...pickSection(draft, id), categoryLocked: true, sectionPicked: true });
                setOpen(false);
              }}
            />
          </div>
        ) : null}
      </div>
    );
  }
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
              data-category={pick.category ?? ""}
              data-selected={selected ? "true" : "false"}
              onClick={() => onPatch(draftFromPick(draft, pick, true))}
              className="rounded-full px-3 py-1.5 text-[13px] font-semibold"
              style={{ background: selected ? "#B8452F" : "#EFE8DB", color: selected ? "#FFF7F0" : "#17140F" }}
            >
              {selected ? "✓ " : ""}
              {label}
            </button>
          );
        })}
        {section ? null : (
          <button type="button" data-testid="cat-other" onClick={() => setOpen((v) => !v)} className="rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-accent">
            {t.catOther}
          </button>
        )}
      </div>
      {section === "services" ? <ServiceGroupList draft={draft} onPatch={onPatch} /> : null}
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

function ServiceGroupList({
  draft,
  onPatch,
}: {
  draft: DraftListing;
  onPatch: (patch: Partial<DraftListing>) => void;
}) {
  const { t } = useApp();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const holdOpen = useRef(false);
  useEffect(() => {
    if (holdOpen.current) {
      holdOpen.current = false;
      return;
    }
    if (!draft.category) {
      setOpenGroup(null);
      return;
    }
    if (isServiceGroup(draft.category)) {
      setOpenGroup(draft.category);
      return;
    }
    const group = serviceGroupOf(draft.category);
    if (group) setOpenGroup(group);
  }, [draft.category]);
  return (
    <div className="mt-3">
      <SectionList
        title={t.category}
        rows={SERVICE_TOP.map((id) => ({
          id,
          label: t.cats[id] ?? id,
          active: isServiceGroup(id) ? openGroup === id : draft.category === id && !openGroup,
          onClick: () => {
            if (isServiceGroup(id)) {
              setOpenGroup(id);
              if (draft.category && draft.category !== id && serviceGroupOf(draft.category) !== id) {
                holdOpen.current = true;
                onPatch({ category: undefined, categoryLocked: true });
              }
              return;
            }
            setOpenGroup(null);
            onPatch({ category: id, categoryLocked: true });
          },
        }))}
      />
      {openGroup && isServiceGroup(openGroup) ? (
        <div className="mt-3">
          <SectionList
            title={t.cats[openGroup] ?? openGroup}
            rows={SERVICE_GROUPS[openGroup].map((id) => ({
              id,
              label: t.cats[id] ?? id,
              active: draft.category === id,
              onClick: () => onPatch({ category: id, categoryLocked: true }),
            }))}
          />
        </div>
      ) : null}
    </div>
  );
}
