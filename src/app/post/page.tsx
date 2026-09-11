"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CITIES, CATEGORIES, PROPERTY_TYPES, ANIMAL_GROUPS, SECTIONS, SERVICE_CATEGORIES, CONSTRUCTION_CATEGORIES, RESTAURANT_CATEGORIES, animalKindsOf, goodsKindsOf, isTechCategory, techBrandsOf, techModelsOf } from "@/lib/data";
import { VEHICLE_GROUPS, vehicleMakesOf, vehicleModelsOf, vehicleTypesOf } from "@/lib/transport";
import { meetupSpotsFor } from "@/lib/deal";
import { listingChipLabel } from "@/lib/i18n";
import { useApp } from "@/lib/store";
import { IconPin, sectionIcon } from "@/components/icons";
import { MarketRangeCard } from "@/components/market-range";
import { AiConfirmCard, MediaCapture } from "@/components/media-capture";
import { ShareToSocial } from "@/components/share-to-social";
import { PhoneShell } from "@/components/shell";
import { Chip, Eyebrow, Field, Input, MapSketch, Photo, SelectRow, Toggle } from "@/components/ui";

export default function PostPage() {
  const { t, user, draft, setDraft, publishDraft, clearPostedDraft, setPendingPath, allListings, setSide } = useApp();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState("");
  const [publishedId, setPublishedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPendingPath("/post");
      router.replace("/login");
    } else {
      setSide("sell");
    }
  }, [user, router, setPendingPath, setSide]);

  if (!user) return null;

  const published = publishedId ? allListings.find((item) => item.id === publishedId) : undefined;

  const bars = [step >= 1, step >= 2, step >= 3];

  return (
    <PhoneShell>
      <div className="px-5 pb-3.5 pt-1">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => (step === 1 ? router.back() : setStep((s) => (s === 3 ? 1 : ((s - 1) as 1))))} className="text-base text-muted">
            ×
          </button>
          <span className="font-display text-lg font-bold text-ink">{t.newListing}</span>
          <span className="text-[13px] font-semibold text-accent">{t.draft}</span>
        </div>
        <div className="mt-3.5 flex items-center gap-2">
          {bars.map((on, i) => (
            <span key={i} className="h-1 flex-1 rounded-full" style={{ background: on ? "#B8452F" : "#E4DCCE" }} />
          ))}
          <span className="ml-1 text-xs font-semibold text-muted">
            {step === 1
              ? t.step1
              : step === 2
                ? draft.mediaKind === "video" || draft.mediaKind === "voice"
                  ? t.step2Ai
                  : t.step2
                : t.step3}
          </span>
        </div>
      </div>

      {step === 1 ? (
        <>
          <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-5 flex flex-col gap-5">
            <div className="flex items-center gap-2.5 rounded-[14px] bg-success-tint px-3.5 py-3">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="#2A6B57">
                <circle cx="9" cy="9" r="9" />
                <path d="m4.6 9.3 3.1 3L13.4 6" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              <div className="text-[13px] leading-[1.4] text-success-ink">
                {t.loggedInAs}{" "}
                <strong>
                  {user.name} · {user.phone}
                </strong>
                . {t.phoneNote}
              </div>
            </div>

            <MediaCapture draft={draft} onPatch={setDraft} />

            <div>
              <Eyebrow>{t.whatPost}</Eyebrow>
              <div className="mt-2.5">
                <SelectRow
                  label={t.listingType}
                  value={t.sectionNames[draft.section === "car-rental" ? "cars" : draft.section]}
                  onClick={() => {
                    const ids = SECTIONS.map((s) => s.id);
                    const visual = draft.section === "car-rental" ? "cars" : draft.section;
                    const i = Math.max(0, ids.indexOf(visual));
                    setDraft({ section: ids[(i + 1) % ids.length] });
                  }}
                />
              </div>
              {(draft.section === "cars" || draft.section === "car-rental") ? (
                <>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <Chip active={draft.section === "cars"} onClick={() => setDraft({ section: "cars" })}>
                      {t.autoSale}
                    </Chip>
                    <Chip active={draft.section === "car-rental"} onClick={() => setDraft({ section: "car-rental" })}>
                      {t.autoRent}
                    </Chip>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {VEHICLE_GROUPS.map((id) => (
                      <Chip
                        key={id}
                        active={(draft.vehicleGroup ?? "passenger") === id}
                        onClick={() => setDraft({ vehicleGroup: id, vehicleType: undefined, carMake: undefined, carModel: undefined })}
                      >
                        {t.vehicleGroups[id]}
                      </Chip>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {vehicleTypesOf(draft.vehicleGroup ?? "passenger").map((id) => (
                      <Chip
                        key={id}
                        active={draft.vehicleType === id}
                        onClick={() => setDraft({ vehicleType: id, carMake: undefined, carModel: undefined })}
                      >
                        {t.vehicleTypes[id]}
                      </Chip>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {vehicleMakesOf(draft.vehicleGroup ?? "passenger", draft.vehicleType).map((id) => (
                      <Chip
                        key={id}
                        active={draft.carMake === id}
                        onClick={() => setDraft({ carMake: id, carModel: undefined })}
                      >
                        {t.carMakes[id] ?? id}
                      </Chip>
                    ))}
                  </div>
                  {vehicleModelsOf(draft.carMake, draft.vehicleGroup ?? "passenger", draft.vehicleType).length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {vehicleModelsOf(draft.carMake, draft.vehicleGroup ?? "passenger", draft.vehicleType).map((id) => (
                        <Chip
                          key={id}
                          active={draft.carModel === id}
                          onClick={() => setDraft({ carModel: id })}
                        >
                          {t.carModels[id] ?? id}
                        </Chip>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
              <div className="mt-2.5 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setDraft({ kind: "rent", section: "rent", housingKind: "apartment" })}
                  className="flex-1 rounded-2xl p-3.5 text-left"
                  style={{
                    background: draft.kind === "rent" ? "#17140F" : "#FFFFFF",
                    color: draft.kind === "rent" ? "#F7F3EC" : "#17140F",
                    border: draft.kind === "rent" ? "none" : "1px solid #E4DCCE",
                  }}
                >
                  {sectionIcon("rent", draft.kind === "rent" ? "#F7F3EC" : "#17140F", 20)}
                  <div className="mt-2.5 text-[15px] font-semibold">{t.kindRent}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setDraft({ kind: "goods", section: "secondhand", category: "furniture" })}
                  className="flex-1 rounded-2xl p-3.5 text-left"
                  style={{
                    background: draft.kind === "goods" ? "#17140F" : "#FFFFFF",
                    color: draft.kind === "goods" ? "#F7F3EC" : "#17140F",
                    border: draft.kind === "goods" ? "none" : "1px solid #E4DCCE",
                  }}
                >
                  {sectionIcon("secondhand", draft.kind === "goods" ? "#F7F3EC" : "#17140F", 20)}
                  <div className="mt-2.5 text-[15px] font-semibold">{t.kindGoods}</div>
                </button>
              </div>
              {draft.section === "rent" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {PROPERTY_TYPES.map((id) => (
                    <Chip
                      key={id}
                      active={draft.housingKind === id}
                      onClick={() => setDraft({ housingKind: id })}
                    >
                      {t.propertyTypes[id]}
                    </Chip>
                  ))}
                </div>
              ) : null}
              {draft.section === "secondhand" ? (
                <>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <Chip
                        key={c}
                        active={draft.category === c}
                        onClick={() => setDraft({ category: c, goodsKind: undefined, techBrand: undefined, techModel: undefined })}
                      >
                        {t.cats[c]}
                      </Chip>
                    ))}
                  </div>
                  {goodsKindsOf(draft.category).length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {goodsKindsOf(draft.category).map((id) => (
                        <Chip
                          key={id}
                          active={draft.goodsKind === id}
                          onClick={() => setDraft({ goodsKind: id })}
                        >
                          {t.goodsKinds[id]}
                        </Chip>
                      ))}
                    </div>
                  ) : null}
                  {isTechCategory(draft.category) ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {techBrandsOf(draft.category).map((id) => (
                        <Chip
                          key={id}
                          active={draft.techBrand === id}
                          onClick={() => setDraft({ techBrand: id, techModel: undefined })}
                        >
                          {t.techBrands[id]}
                        </Chip>
                      ))}
                    </div>
                  ) : null}
                  {techModelsOf(draft.category, draft.techBrand).length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {techModelsOf(draft.category, draft.techBrand).map((id) => (
                        <Chip
                          key={id}
                          active={draft.techModel === id}
                          onClick={() => setDraft({ techModel: id })}
                        >
                          {t.techModels[id]}
                        </Chip>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
              {draft.section === "animals" ? (
                <>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ANIMAL_GROUPS.map((id) => (
                      <Chip
                        key={id}
                        active={(draft.animalGroup ?? "pets") === id}
                        onClick={() => setDraft({ animalGroup: id, animalKind: undefined })}
                      >
                        {id === "pets" ? t.animalPets : t.animalFarm}
                      </Chip>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {animalKindsOf(draft.animalGroup ?? "pets").map((id) => (
                      <Chip
                        key={id}
                        active={draft.animalKind === id}
                        onClick={() => setDraft({ animalKind: id })}
                      >
                        {t.animalKinds[id]}
                      </Chip>
                    ))}
                  </div>
                </>
              ) : null}
              {draft.section === "services" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {SERVICE_CATEGORIES.map((c) => (
                    <Chip
                      key={c}
                      active={draft.category === c}
                      onClick={() => setDraft({ category: c })}
                    >
                      {t.cats[c]}
                    </Chip>
                  ))}
                </div>
              ) : null}
              {draft.section === "construction" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {CONSTRUCTION_CATEGORIES.map((c) => (
                    <Chip
                      key={c}
                      active={draft.category === c}
                      onClick={() => setDraft({ category: c })}
                    >
                      {t.cats[c]}
                    </Chip>
                  ))}
                </div>
              ) : null}
              {draft.section === "restaurants" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {RESTAURANT_CATEGORIES.map((c) => (
                    <Chip
                      key={c}
                      active={draft.category === c}
                      onClick={() => setDraft({ category: c })}
                    >
                      {t.cats[c]}
                    </Chip>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3.5">
              <Field label={t.title}>
                <Input value={draft.title} onChange={(v) => setDraft({ title: v })} placeholder={t.title} />
              </Field>
              <div className="flex gap-2.5">
                <div className="flex-1">
                  <Field label={t.city}>
                    <select
                      value={draft.city}
                      onChange={(e) => setDraft({ city: e.target.value })}
                      className="h-[50px] w-full rounded-[14px] border border-line bg-white px-[15px] text-[15px]"
                    >
                      {CITIES.filter((c) => c !== "all").map((c) => (
                        <option key={c} value={c}>
                          {t.cities[c]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label={draft.kind === "rent" ? t.priceMonthField : t.priceSomField}>
                    <Input value={draft.price} onChange={(v) => setDraft({ price: v })} placeholder="38 000" />
                  </Field>
                </div>
              </div>
              {draft.kind === "rent" ? (
                <div className="flex gap-2.5">
                  <div className="flex-1">
                    <Field label={t.roomsField}>
                      <Input value={draft.rooms} onChange={(v) => setDraft({ rooms: v })} placeholder="2" />
                    </Field>
                  </div>
                  <div className="flex-1">
                    <Field label={t.areaField}>
                      <Input value={draft.area} onChange={(v) => setDraft({ area: v })} placeholder="62" />
                    </Field>
                  </div>
                </div>
              ) : null}
              <div className="flex gap-2.5">
                <div className="flex-1">
                  <Field label={t.yourName}>
                    <Input value={draft.name} onChange={(v) => setDraft({ name: v })} />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label={t.phone}>
                    <Input value={draft.phone} onChange={(v) => setDraft({ phone: v })} />
                  </Field>
                </div>
              </div>
              <p className="text-xs leading-[1.5] text-muted">{t.contactNote}</p>
              <div className="rounded-[14px] border border-line bg-accent-tint px-3.5 py-3 text-[13px] leading-[1.45] text-safe">
                {t.igPostHint}
              </div>
              <div className="flex items-start justify-between gap-3 rounded-[14px] border border-line bg-white px-3.5 py-3">
                <div>
                  <div className="text-[15px] font-semibold text-ink">{t.neighborPledge}</div>
                  <p className="mt-1 text-[12px] leading-[1.4] text-muted">{t.neighborPledgeHint}</p>
                </div>
                <Toggle
                  on={draft.neighborPledge !== false}
                  onChange={() => setDraft({ neighborPledge: draft.neighborPledge === false })}
                />
              </div>
              {draft.section === "secondhand" || draft.section === "animals" || draft.section === "construction" ? (
                <div>
                  <Eyebrow>{t.goMeetTitle}</Eyebrow>
                  <p className="mt-1 text-[12px] leading-[1.4] text-muted">{t.goMeetHint}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {meetupSpotsFor(draft.city).map((id) => (
                      <Chip
                        key={id}
                        active={draft.meetupSpot === id}
                        accent={draft.meetupSpot === id}
                        onClick={() => setDraft({ meetupSpot: id })}
                      >
                        {t.meetupSpots[id]}
                      </Chip>
                    ))}
                  </div>
                </div>
              ) : null}
              <Field label={t.description}>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ description: e.target.value })}
                  placeholder={t.descPh}
                  className="min-h-[88px] w-full rounded-[14px] border border-line bg-white px-[15px] py-[13px] text-[15px] leading-[1.45] outline-none placeholder:text-muted-2"
                />
              </Field>
              <Field label={t.mapPoint}>
                <div className="relative h-24 overflow-hidden rounded-[14px] border border-line">
                  <MapSketch />
                  <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-white px-3 py-[7px] text-xs font-semibold text-ink shadow-[0_4px_12px_rgba(23,20,15,.16)]">
                    <IconPin size={13} color="#B8452F" />
                    {t.setPlace}
                  </span>
                </div>
              </Field>
            </div>

            <div className="rounded-[18px] bg-ink p-4">
              <div className="flex items-center justify-between">
                <span className="font-display text-[17px] font-bold text-screen">{t.promote}</span>
                <Toggle on={draft.promote} onChange={() => setDraft({ promote: !draft.promote })} />
              </div>
              <p className="mt-2 text-[13px] leading-[1.5] text-[rgba(247,243,236,.72)]">{t.promoteHint}</p>
            </div>
            {error ? <p className="text-[13px] text-accent">{error}</p> : null}
          </div>
          <div className="flex shrink-0 gap-2.5 border-t border-line bg-screen px-5 pb-[26px] pt-3.5">
            <button type="button" className="h-[54px] rounded-2xl border border-line bg-white px-5 text-[15px] font-semibold text-ink">
              {t.save}
            </button>
            <button
              type="button"
              onClick={() => {
                const spoken = draft.mediaKind === "video" || draft.mediaKind === "voice";
                if (spoken && draft.mediaKind === "video" && !draft.videoUrl) {
                  setError(t.mediaNeed);
                  return;
                }
                if (spoken && !draft.transcript?.trim() && !draft.description.trim()) {
                  setError(t.mediaNeed);
                  return;
                }
                if (!draft.title.trim() || !draft.price.trim()) {
                  setError(t.needFields);
                  return;
                }
                setError("");
                setStep(2);
              }}
              className="shadow-btn h-[54px] flex-1 rounded-2xl bg-accent text-base font-semibold text-accent-on"
            >
              {t.nextReview}
            </button>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-5">
            <div className="overflow-hidden rounded-[20px] border border-line bg-white">
              {draft.videoUrl ? (
                <video src={draft.videoUrl} poster={draft.photo} controls playsInline className="h-56 w-full object-cover bg-ink" />
              ) : draft.photo ? (
                <div className="h-44">
                  <Photo src={draft.photo} alt="" />
                </div>
              ) : (
                <div className="flex h-44 items-center justify-center bg-chip text-sm text-muted">{t.photos}</div>
              )}
              <div className="p-4">
                <div className="font-display text-[21px] font-bold text-ink">
                  {draft.price} KGS {draft.kind === "rent" ? t.perMonth : ""}
                </div>
                <div className="mt-1 text-[15px] font-medium text-ink">{draft.title}</div>
                <div className="mt-1 text-[13px] text-muted">
                  {t.cities[draft.city]}
                  {draft.rooms ? ` · ${draft.rooms} ${t.roomWord} · ${draft.area} м²` : ""}
                  {` · ${listingChipLabel({ section: draft.section, category: draft.category, goodsKind: draft.goodsKind, housingKind: draft.housingKind, carMake: draft.carMake, carModel: draft.carModel, techBrand: draft.techBrand, techModel: draft.techModel, animalKind: draft.animalKind }, t)}`}
                </div>
                {draft.voiceUrl ? <audio src={draft.voiceUrl} controls className="mt-3 w-full" /> : null}
                {draft.description ? <p className="mt-3 text-sm leading-[1.5] text-ink-2">{draft.description}</p> : null}
              </div>
            </div>
            <MarketRangeCard draft={draft} onPatch={setDraft} />
            {draft.mediaKind === "video" || draft.mediaKind === "voice" ? (
              <div className="mt-4">
                <AiConfirmCard draft={draft} onPatch={setDraft} />
              </div>
            ) : null}
            {error ? <p className="mt-3 text-[13px] text-accent">{error}</p> : null}
          </div>
          <div className="flex shrink-0 gap-2.5 border-t border-line px-5 pb-[26px] pt-3.5">
            <button type="button" onClick={() => setStep(1)} className="h-[54px] rounded-2xl border border-line bg-white px-5 text-[15px] font-semibold">
              {t.edit}
            </button>
            <button
              type="button"
              onClick={() => {
                const spoken = draft.mediaKind === "video" || draft.mediaKind === "voice";
                if (spoken && !draft.aiConfirmed) {
                  setError(t.needConfirm);
                  return;
                }
                const item = publishDraft();
                if (!item) {
                  setError(t.needFields);
                  return;
                }
                clearPostedDraft();
                setPublishedId(item.id);
                setStep(3);
              }}
              className="shadow-btn h-[54px] flex-1 rounded-2xl text-base font-semibold"
              style={{
                background:
                  (draft.mediaKind === "video" || draft.mediaKind === "voice") && !draft.aiConfirmed
                    ? "#DCD3C4"
                    : "#B8452F",
                color:
                  (draft.mediaKind === "video" || draft.mediaKind === "voice") && !draft.aiConfirmed
                    ? "#6E6558"
                    : "#FFF7F0",
              }}
            >
              {t.publish}
            </button>
          </div>
        </>
      ) : null}

      {step === 3 ? (
        <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-2">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-tint text-2xl text-success">✓</div>
            <h2 className="mt-5 font-display text-[26px] font-bold text-ink">{t.published}</h2>
            <p className="mt-2 text-[15px] leading-[1.5] text-muted">{t.publishedHint}</p>
          </div>
          {published ? (
            <div className="mt-6 rounded-[18px] border border-line bg-white p-4">
              <ShareToSocial listing={published} />
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => router.push(publishedId ? `/listing/${publishedId}` : "/")}
            className="shadow-btn mt-6 h-[54px] w-full rounded-2xl bg-accent text-base font-semibold text-accent-on"
          >
            {t.viewListing}
          </button>
          <button type="button" onClick={() => setStep(1)} className="mt-3 h-[54px] w-full rounded-2xl border border-line bg-white text-[15px] font-semibold">
            {t.postAnother}
          </button>
        </div>
      ) : null}
    </PhoneShell>
  );
}
