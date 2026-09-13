"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CITIES, GIS_CITIES } from "@/lib/data";
import { meetupSpotsFor } from "@/lib/deal";
import { gisCity, meetupCoords, nearestDistrict } from "@/lib/geo";
import { listingChipLabel } from "@/lib/i18n";
import { hasRole } from "@/lib/partners";
import { useApp } from "@/lib/store";
import { classifyListingSpeech, aiToDraftPatch } from "@/lib/video-ai";
import { MarketRangeCard } from "@/components/market-range";
import { AiConfirmCard, MediaCapture } from "@/components/media-capture";
import { GisOnMapCard } from "@/components/gis-on-map";
import { ShareToSocial } from "@/components/share-to-social";
import { PhoneShell } from "@/components/shell";
import { Chip, Eyebrow, Field, Input, Photo, Toggle } from "@/components/ui";
import { PostTypePicker } from "@/components/post-type-picker";
import { PostTaxonomy, pickSection } from "@/components/post-taxonomy";
import { IconBack } from "@/components/icons";
import { showsNeighborPledge } from "@/lib/neighbor";

const GisMap = dynamic(() => import("@/components/gis-map").then((m) => m.GisMap), { ssr: false });

export default function PostPage() {
  const { t, user, draft, setDraft, publishDraft, saveDraft, clearPostedDraft, setPendingPath, pendingPath, allListings, setSide } = useApp();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState("");
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const [entryCard, setEntryCard] = useState<string | null>(null);

  useEffect(() => {
    const card = new URLSearchParams(window.location.search).get("card");
    setEntryCard(card);
    if (card === "developer") {
      setDraft({
        ...pickSection(draft, "rent"),
        dealKind: "buy",
        realtyGroup: "apartments",
        neighborPledge: false,
      });
    }
    if (card === "dealer") {
      setDraft({
        ...pickSection(draft, "cars"),
        neighborPledge: false,
        sellerType: "dealer",
      });
    }
    if (card === "cafe") {
      setDraft({
        ...pickSection(draft, "restaurants"),
        neighborPledge: false,
      });
    }
    // Apply once when opening a seller-card shortcut.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) {
      setPendingPath("/post");
      router.replace("/login");
    } else {
      setSide("sell");
    }
  }, [user, router, setPendingPath, setSide]);

  useEffect(() => {
    if (step !== 3) return;
    if (!pendingPath?.startsWith("/restaurants/quick")) return;
    const next = pendingPath;
    setPendingPath(null);
    router.push(next);
    // pendingPath/setPendingPath change identity each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (!user) return null;

  const bizCard = entryCard === "developer" || entryCard === "dealer" || entryCard === "cafe";
  const published = publishedId ? allListings.find((item) => item.id === publishedId) : undefined;

  const bars = [step >= 1, step >= 2, step >= 3];

  return (
    <PhoneShell>
      <div className="px-5 pb-3.5 pt-1">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="flex items-center gap-1 rounded-full border border-line bg-surface py-1.5 pl-2 pr-3 text-[13px] font-semibold text-ink"
            aria-label={t.backLeave}
          >
            <IconBack size={16} color="#17140F" />
            {t.backLeave}
          </button>
          <span className="font-display text-[16px] font-bold text-ink">{t.newListing}</span>
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

            {draft.mediaKind === "text" ? (
              <div className="rounded-[14px] border border-line bg-white px-3.5 py-3">
                <div className="text-[15px] font-semibold text-ink">{t.pasteListing}</div>
                <p className="mt-1 text-[12px] leading-[1.4] text-muted">{t.pasteListingHint}</p>
                <textarea
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  placeholder={t.pasteListingHint}
                  className="mt-2 min-h-[72px] w-full rounded-[12px] border border-line bg-screen px-3 py-2 text-[14px] leading-[1.45] outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const text = paste.trim();
                    if (!text) return;
                    const guess = classifyListingSpeech(text);
                    const patch = aiToDraftPatch(guess);
                    if (!text.match(/\d/) || !guess.price) delete patch.price;
                    setDraft({ mediaKind: "text", description: text, ...patch });
                  }}
                  className="mt-2 h-10 rounded-xl border border-line px-3 text-[13px] font-bold"
                >
                  {t.pasteFill}
                </button>
              </div>
            ) : null}

            <div>
              {entryCard ? null : (
                <>
                  <Eyebrow>{t.whatPost}</Eyebrow>
                  <div className="mt-2.5">
                    <PostTypePicker value={draft.section} onPick={(id) => setDraft(pickSection(draft, id))} />
                  </div>
                </>
              )}
              {entryCard === "developer" ? (
                <p className="mt-2 text-[12px] leading-[1.4] text-muted">{t.sellCardDeveloperHint}</p>
              ) : null}
              {entryCard === "dealer" ? (
                <p className="mt-2 text-[12px] leading-[1.4] text-muted">{t.sellCardDealerHint}</p>
              ) : null}
              {entryCard === "cafe" ? (
                <p className="mt-2 text-[12px] leading-[1.4] text-muted">{t.sellCardCafeHint}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3.5">
              <Field label={t.title}>
                <Input value={draft.title} onChange={(v) => setDraft({ title: v })} placeholder={t.title} />
              </Field>
              <Field label={t.venueAddress}>
                <Input value={draft.address ?? ""} onChange={(v) => setDraft({ address: v })} placeholder={t.venueAddress} />
              </Field>
              {bizCard ? (
                <Field label={t.city}>
                  <select
                    value={draft.city}
                    onChange={(e) => {
                      const city = e.target.value;
                      const gis = GIS_CITIES[city] ?? gisCity(city);
                      setDraft({ city, lat: gis.lat, lng: gis.lng, district: undefined });
                    }}
                    className="h-[50px] w-full rounded-[14px] border border-line bg-white px-[15px] text-[15px]"
                  >
                    {CITIES.filter((c) => c !== "all").map((c) => (
                      <option key={c} value={c}>
                        {t.cities[c]}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <div className="flex gap-2.5">
                  <div className="flex-1">
                    <Field label={t.city}>
                      <select
                        value={draft.city}
                        onChange={(e) => {
                          const city = e.target.value;
                          const gis = GIS_CITIES[city] ?? gisCity(city);
                          setDraft({ city, lat: gis.lat, lng: gis.lng, district: undefined });
                        }}
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
              )}
              <button
                type="button"
                onClick={() => {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition((pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    const area = nearestDistrict(lat, lng, draft.city);
                    setDraft({ lat, lng, district: area?.name });
                  });
                }}
                className="h-11 rounded-[14px] border border-line bg-white text-[13px] font-semibold"
              >
                {t.locationGeo}
              </button>
              {bizCard ? (
                <Field label={t.mapPoint}>
                  <p className="mb-2 text-[12px] leading-[1.4] text-muted">{t.mapPointHint}</p>
                  <div className="relative isolate z-0 h-52 overflow-hidden rounded-[14px] border border-line">
                    <GisMap
                      center={{
                        lat: draft.lat ?? gisCity(draft.city).lat,
                        lng: draft.lng ?? gisCity(draft.city).lng,
                      }}
                      zoom={draft.lat != null ? 15 : gisCity(draft.city).zoom}
                      pick={
                        draft.lat != null && draft.lng != null
                          ? { lat: draft.lat, lng: draft.lng }
                          : { lat: gisCity(draft.city).lat, lng: gisCity(draft.city).lng }
                      }
                      onPick={(lat, lng) => {
                        const area = nearestDistrict(lat, lng, draft.city);
                        setDraft({ lat, lng, district: area?.name });
                      }}
                    />
                  </div>
                </Field>
              ) : null}
              <PostTaxonomy draft={draft} onPatch={setDraft} />
              {bizCard ? (
                <Field label={draft.kind === "rent" ? t.priceMonthField : t.priceSomField}>
                  <Input value={draft.price} onChange={(v) => setDraft({ price: v })} placeholder="38 000" />
                </Field>
              ) : null}
              {bizCard ? null : draft.section === "restaurants" ? (
                <div className="flex gap-2.5">
                  <div className="flex-1">
                    <Field label={t.caloriesField}>
                      <Input value={draft.calories ?? ""} onChange={(v) => setDraft({ calories: v })} placeholder="320" />
                    </Field>
                  </div>
                  <div className="flex-1">
                    <Field label={t.ingredientsField}>
                      <Input value={draft.ingredients ?? ""} onChange={(v) => setDraft({ ingredients: v })} />
                    </Field>
                  </div>
                </div>
              ) : null}
              {bizCard ? null : draft.kind === "rent" ? (
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
              {bizCard ? null : draft.section === "cars" || draft.section === "car-rental" ? (
                <div className="flex gap-2.5">
                  <div className="flex-1">
                    <Field label={t.yearField}>
                      <Input
                        value={draft.year != null ? String(draft.year) : ""}
                        onChange={(v) => setDraft({ year: Number(v.replace(/\D/g, "")) || undefined })}
                        placeholder="2018"
                      />
                    </Field>
                  </div>
                  <div className="flex-1">
                    <Field label={t.mileageField}>
                      <Input
                        value={draft.mileage != null ? String(draft.mileage) : ""}
                        onChange={(v) => setDraft({ mileage: Number(v.replace(/\D/g, "")) || undefined })}
                        placeholder="90000"
                      />
                    </Field>
                  </div>
                </div>
              ) : null}
              {bizCard ? null : (
                <>
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
                </>
              )}
              {bizCard || hasRole(user, "realtor") || hasRole(user, "dealer") || !showsNeighborPledge(draft.section) ? null : (
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
              )}
              {bizCard || (draft.section !== "secondhand" && draft.section !== "animals" && draft.section !== "construction") ? null : (
                <div>
                  <Eyebrow>{t.goMeetTitle}</Eyebrow>
                  <p className="mt-1 text-[12px] leading-[1.4] text-muted">{t.goMeetHint}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {meetupSpotsFor(draft.city).map((id) => (
                      <Chip
                        key={id}
                        active={draft.meetupSpot === id}
                        accent={draft.meetupSpot === id}
                        onClick={() => {
                          const pt = meetupCoords(id, draft.city);
                          setDraft({ meetupSpot: id, lat: pt.lat, lng: pt.lng });
                        }}
                      >
                        {t.meetupSpots[id]}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              {bizCard ? null : (
                <Field label={t.description}>
                  <textarea
                    value={draft.description}
                    onChange={(e) => setDraft({ description: e.target.value })}
                    placeholder={t.descPh}
                    className="min-h-[88px] w-full rounded-[14px] border border-line bg-white px-[15px] py-[13px] text-[15px] leading-[1.45] outline-none placeholder:text-muted-2"
                  />
                </Field>
              )}
              {bizCard ? null : (
              <Field label={t.mapPoint}>
                <p className="mb-2 text-[12px] leading-[1.4] text-muted">{t.mapPointHint}</p>
                <div className="relative isolate z-0 h-52 overflow-hidden rounded-[14px] border border-line">
                  <GisMap
                    center={{
                      lat: draft.lat ?? gisCity(draft.city).lat,
                      lng: draft.lng ?? gisCity(draft.city).lng,
                    }}
                    zoom={draft.lat != null ? 15 : gisCity(draft.city).zoom}
                    pick={
                      draft.lat != null && draft.lng != null
                        ? { lat: draft.lat, lng: draft.lng }
                        : { lat: gisCity(draft.city).lat, lng: gisCity(draft.city).lng }
                    }
                    onPick={(lat, lng) => {
                      const area = nearestDistrict(lat, lng, draft.city);
                      setDraft({ lat, lng, district: area?.name });
                    }}
                  />
                </div>
              </Field>
              )}
            </div>

            {bizCard ? null : (
            <div className="rounded-[18px] bg-ink p-4">
              <div className="flex items-center justify-between">
                <span className="font-display text-[17px] font-bold text-screen">{t.promote}</span>
                <Toggle on={draft.promote} onChange={() => setDraft({ promote: !draft.promote })} />
              </div>
              <p className="mt-2 text-[13px] leading-[1.5] text-[rgba(247,243,236,.72)]">{t.promoteHint}</p>
            </div>
            )}
            {error ? <p className="text-[13px] text-accent">{error}</p> : null}
          </div>
          <div className="relative z-20 flex shrink-0 flex-col gap-2 border-t border-line bg-screen px-5 pb-[26px] pt-3.5">
            {error ? <p className="text-[13px] text-accent">{error}</p> : null}
            <div className="flex gap-2.5">
            <button
              type="button"
              data-testid="post-save"
              onClick={() => {
                const item = saveDraft();
                if (!item) {
                  setError(t.needFields);
                  return;
                }
                setError("");
                setSide("sell");
                router.push("/selling");
              }}
              className="h-[54px] rounded-2xl border border-line bg-white px-5 text-[15px] font-semibold text-ink"
            >
              {t.save}
            </button>
            <button
              type="button"
              data-testid="post-next"
              onClick={() => {
                const spoken = draft.mediaKind === "video" || draft.mediaKind === "voice";
                if (draft.mediaKind === "text" && paste.trim() && !draft.description.trim()) {
                  const guess = classifyListingSpeech(paste.trim());
                  const patch = aiToDraftPatch(guess);
                  if (!paste.match(/\d/) || !guess.price) delete patch.price;
                  setDraft({ mediaKind: "text", description: paste.trim(), ...patch });
                }
                if (spoken && draft.mediaKind === "video" && !draft.videoUrl) {
                  setError(t.mediaNeed);
                  return;
                }
                if (draft.mediaKind === "text" && !draft.title.trim() && !draft.description.trim() && !paste.trim()) {
                  setError(t.needFields);
                  return;
                }
                if (spoken && !draft.transcript?.trim() && !draft.description.trim() && !draft.voiceUrl && !draft.videoUrl) {
                  setError(t.mediaNeed);
                  return;
                }
                if (!spoken && !draft.title.trim()) {
                  setError(t.needFields);
                  return;
                }
                if (!spoken && !draft.price.trim() && draft.section !== "vacancies") {
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
                  {` · ${listingChipLabel({ section: draft.section, category: draft.category, goodsKind: draft.goodsKind, housingKind: draft.housingKind, realtyGroup: draft.realtyGroup, realtyKind: draft.realtyKind, carMake: draft.carMake, carModel: draft.carModel, techBrand: draft.techBrand, techModel: draft.techModel, animalKind: draft.animalKind, jobRole: draft.jobRole, jobSphere: draft.jobSphere }, t)}`}
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
          <div className="relative z-20 flex shrink-0 flex-col gap-2 border-t border-line bg-screen px-5 pb-[26px] pt-3.5">
            {error ? <p className="text-[13px] text-accent">{error}</p> : null}
            <div className="flex gap-2.5">
            <button type="button" onClick={() => setStep(1)} className="h-[54px] rounded-2xl border border-line bg-white px-5 text-[15px] font-semibold">
              {t.edit}
            </button>
            <button
              type="button"
              data-testid="post-publish"
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
          {published?.lat != null && published.lng != null ? (
            <div className="mt-6">
              <GisOnMapCard
                city={published.city}
                lat={published.lat}
                lng={published.lng}
                listingId={published.id}
                label={`${published.price} KGS`}
                showHint
              />
            </div>
          ) : null}
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
          {published?.section === "restaurants" ? (
            <button
              type="button"
              onClick={() => router.push("/restaurants/quick")}
              className="mt-3 h-[54px] w-full rounded-2xl border border-line bg-white text-[15px] font-semibold"
            >
              {t.restaurantQuickCta}
            </button>
          ) : null}
          <button type="button" onClick={() => setStep(1)} className="mt-3 h-[54px] w-full rounded-2xl border border-line bg-white text-[15px] font-semibold">
            {t.postAnother}
          </button>
        </div>
      ) : null}
    </PhoneShell>
  );
}
