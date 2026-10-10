"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CITIES, GIS_CITIES } from "@/lib/data";
import { meetupSpotsFor } from "@/lib/deal";
import { draftUnfinished } from "@/lib/draft-media";
import { gisCity, meetupCoords, nearestDistrict, spotForFix } from "@/lib/geo";
import { locate, type LocateError } from "@/lib/locate";
import { writeLastCategory } from "@/lib/category-suggest";
import { formatPhoneDisplay, normalizePhoneInput } from "@/lib/phone";
import { hasRole } from "@/lib/partners";
import { showsNeighborPledge } from "@/lib/neighbor";
import { useApp } from "@/lib/store";
import { MarketRangeCard } from "@/components/market-range";
import { MediaCapture } from "@/components/media-capture";
import { PhoneShell } from "@/components/shell";
import { Chip, Field, Toggle } from "@/components/ui";
import { PostTaxonomy } from "@/components/post-taxonomy";
import { GeoError } from "@/components/geo-error";
import { IconBack } from "@/components/icons";
import { CategoryChips } from "@/components/category-chips";
import { LeaveDialog } from "@/components/leave-dialog";
import { useDraftHistoryGuard } from "@/components/draft-guard";
import { DailyLimitNotice } from "@/components/daily-limit";
import { personalPostLimited } from "@/lib/post-limit";

const GisMap = dynamic(() => import("@/components/gis-map").then((m) => m.GisMap), { ssr: false });

const AUTO_UNIT = new Set(["rent", "stays", "vacancies", "car-rental"]);

export function PersonalPost() {
  const { t, user, draft, setDraft, publishDraft, clearPostedDraft, city, setLeaveGuard, discardDraft, updateProfile } = useApp();
  const router = useRouter();
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(false);
  const [more, setMore] = useState(false);
  const [oldOpen, setOldOpen] = useState(Boolean(draft.oldPrice));
  const [leave, setLeave] = useState<null | { proceed: () => void }>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<LocateError | null>(null);
  const [busy, setBusy] = useState(false);
  const [sectionHint, setSectionHint] = useState(false);
  const leaveBack = useRef<() => void>(() => undefined);
  const unfinished = draftUnfinished(draft);
  const historyGuard = useDraftHistoryGuard(unfinished, () => setLeave({ proceed: () => leaveBack.current() }));
  leaveBack.current = () => historyGuard.leave();

  useEffect(() => {
    // A draft left by a business card (service, cafe, dealer) must not hand its locked
    // section to a personal post: that is how «Ноутбук» was published as «СТО / автосервис».
    const fromCard = Boolean(draft.flow && draft.flow !== "personal");
    setDraft({
      flow: "personal",
      city: draft.city || city || "bishkek",
      ...(fromCard
        ? {
            section: "secondhand" as const,
            kind: "goods" as const,
            category: undefined,
            goodsKind: undefined,
            techBrand: undefined,
            techModel: undefined,
            categoryLocked: false,
            sectionPicked: false,
          }
        : {}),
      // An old lock without a real pick would stop the guesser on a fresh form.
      ...(!fromCard && !draft.editing && !draft.sectionPicked ? { categoryLocked: false } : {}),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!unfinished) {
      setLeaveGuard(null);
      return;
    }
    setLeaveGuard(({ proceed }) => setLeave({ proceed }));
    return () => setLeaveGuard(null);
  }, [unfinished, setLeaveGuard]);

  if (!user) return null;

  const needIdentity = !user.name?.trim() || !user.phone?.trim();
  const autoUnit = AUTO_UNIT.has(draft.section);
  const priceNumber = Number(draft.price.replace(/\s/g, "")) || 0;
  const oldNumber = Number((draft.oldPrice || "").replace(/\s/g, "")) || 0;

  const back = () => {
    if (unfinished) {
      setLeave({ proceed: () => historyGuard.leave() });
      return;
    }
    if (window.history.length > 1) router.back();
    else router.push("/");
  };

  const locateDraft = () => {
    if (geoBusy) return;
    setGeoBusy(true);
    setGeoError(null);
    void locate().then((res) => {
      setGeoBusy(false);
      if (!res.ok) {
        setGeoError(res.error);
        return;
      }
      const spot = spotForFix(res.lat, res.lng);
      setDraft({ lat: res.lat, lng: res.lng, ...(spot.city ? { city: spot.city } : {}), district: spot.district?.name });
    });
  };

  const publish = async () => {
    const media = Boolean(draft.videoUrl || draft.photo || (draft.photos && draft.photos.length));
    if (!media) {
      setError(t.postMediaNeed);
      return;
    }
    if (!draft.title.trim()) {
      setError(t.postNeedTitle);
      return;
    }
    // The section is the person's choice (or a sure match); never a silent default.
    if (!draft.editing && !draft.sectionPicked) {
      setSectionHint(true);
      setError("");
      document.querySelector('[data-testid="cat-other"]')?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    if (!draft.priceNegotiable && draft.section !== "vacancies" && priceNumber <= 0) {
      setError(t.needFields);
      return;
    }
    if (!draft.priceNegotiable && oldOpen && (draft.oldPrice || "").trim() && oldNumber <= priceNumber) {
      setError(t.oldPriceErr);
      return;
    }
    if (needIdentity) {
      const name = (draft.name || user.name || "").trim();
      const normalized = normalizePhoneInput(draft.phone || "");
      if (name.length < 1 || name.length > 40) {
        setError(t.phoneRequired);
        return;
      }
      if (!normalized) {
        setError(draft.phone.trim() ? t.phoneBad : t.phoneRequired);
        return;
      }
      setBusy(true);
      const saved = await updateProfile({ name, phone: normalized });
      setBusy(false);
      if (!saved.ok) {
        setError(saved.error === "network" ? t.noNetSave : saved.error === "phone" ? t.phoneBad : t.noNetSave);
        return;
      }
    } else if (!user.phone) {
      setError(t.phoneRequired);
      return;
    }
    setLimit(false);
    if (!draft.editing && (await personalPostLimited())) {
      setLimit(true);
      setError("");
      return;
    }
    const item = publishDraft();
    if (!item) {
      setError(t.needFields);
      return;
    }
    writeLastCategory({
      section: item.section,
      category: item.category,
      goodsKind: item.goodsKind,
      animalGroup: item.animalGroup,
      animalKind: item.animalKind,
    });
    setError("");
    clearPostedDraft();
    setLeaveGuard(null);
    router.replace(`/post?published=${item.id}`);
  };

  return (
    <PhoneShell focus>
      <div className="px-5 pb-3 pt-1">
        <div className="flex items-center justify-between">
          <button
            type="button"
            data-testid="post-back"
            onClick={back}
            className="flex items-center gap-1 rounded-full border border-line bg-surface py-1.5 pl-2 pr-3 text-[13px] font-semibold text-ink"
            aria-label={t.backLeave}
          >
            <IconBack size={16} color="#17140F" />
            {t.backLeave}
          </button>
          <span className="font-display text-[16px] font-bold text-ink">{t.newListing}</span>
          <span className="w-16" />
        </div>
      </div>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <MediaCapture variant="personal" draft={draft} onPatch={setDraft} />
        <label className="mt-4 block">
          <span className="text-[13px] font-semibold text-ink">{t.postWhat}</span>
          <input
            data-testid="post-title"
            value={draft.title}
            onChange={(e) => setDraft({ title: e.target.value })}
            placeholder={t.postWhatPh}
            className="mt-1.5 h-[50px] w-full rounded-[14px] border border-line bg-white px-[15px] text-[15px] outline-none"
          />
        </label>
        <div className="mt-3">
          <CategoryChips draft={draft} onPatch={setDraft} personal requirePick showHint={sectionHint} />
        </div>
        <label className="mt-4 block">
          <span className="text-[13px] font-semibold text-ink">{t.priceSomField}</span>
          <input
            data-testid="post-price"
            value={draft.priceNegotiable ? "" : draft.price}
            disabled={Boolean(draft.priceNegotiable)}
            onChange={(e) => setDraft({ price: e.target.value, priceNegotiable: false })}
            placeholder="2 500"
            className="mt-1.5 h-[50px] w-full rounded-[14px] border border-line bg-white px-[15px] text-[15px] outline-none disabled:bg-chip"
          />
        </label>
        <div className="mt-2">
          <Chip
            active={Boolean(draft.priceNegotiable)}
            accent={Boolean(draft.priceNegotiable)}
            onClick={() =>
              setDraft({
                priceNegotiable: !draft.priceNegotiable,
                price: draft.priceNegotiable ? draft.price : "",
                oldPrice: undefined,
              })
            }
          >
            <span data-testid="post-negotiable">{t.priceNegotiable}</span>
          </Chip>
        </div>
        {autoUnit || draft.priceNegotiable ? null : (
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip active={!draft.saleUnit} onClick={() => setDraft({ saleUnit: undefined })}>
              {t.unitWhole}
            </Chip>
            <Chip active={draft.saleUnit === "kg"} accent={draft.saleUnit === "kg"} onClick={() => setDraft({ saleUnit: "kg" })}>
              <span data-testid="unit-kg">{t.unitKg}</span>
            </Chip>
            <Chip active={draft.saleUnit === "piece"} onClick={() => setDraft({ saleUnit: "piece" })}>
              {t.unitPiece}
            </Chip>
            <Chip active={draft.saleUnit === "hour"} onClick={() => setDraft({ saleUnit: "hour" })}>
              {t.unitHour}
            </Chip>
          </div>
        )}
        {!draft.priceNegotiable ? (
          <button type="button" className="mt-2 text-[13px] font-semibold text-accent" onClick={() => setOldOpen(!oldOpen)}>
            {t.oldPriceAdd}
          </button>
        ) : null}
        {oldOpen && !draft.priceNegotiable ? (
          <label className="mt-2 block">
            <span className="text-[13px] font-semibold text-ink">{t.oldPriceField}</span>
            <input
              data-testid="post-old-price"
              value={draft.oldPrice ?? ""}
              onChange={(e) => setDraft({ oldPrice: e.target.value })}
              className="mt-1.5 h-[50px] w-full rounded-[14px] border border-line bg-white px-[15px] text-[15px] outline-none"
            />
          </label>
        ) : null}
        <MarketRangeCard draft={draft} onPatch={setDraft} />
        <label className="mt-4 block">
          <span className="text-[13px] font-semibold text-ink">{t.postShort}</span>
          <textarea
            value={draft.description}
            onChange={(e) => setDraft({ description: e.target.value })}
            className="mt-1.5 min-h-[88px] w-full rounded-[14px] border border-line bg-white px-[15px] py-[13px] text-[15px] leading-[1.45] outline-none"
          />
        </label>
        <p className="mt-3 text-[14px] text-ink">
          📍 {t.cities[draft.city] || draft.city}
          {draft.district ? `, ${draft.district}` : ""}
        </p>
        <button type="button" disabled={geoBusy} onClick={locateDraft} className="mt-2 h-11 w-full rounded-[14px] border border-line bg-white text-[13px] font-semibold">
          {geoBusy ? t.locationGeoBusy : t.locationGeo}
        </button>
        {geoError ? <GeoError compact error={geoError} onRetry={locateDraft} /> : null}
        {needIdentity ? (
          <div className="mt-4 flex flex-col gap-3">
            <Field label={t.nameField}>
              <input
                data-testid="post-name"
                value={draft.name || user.name || ""}
                onChange={(e) => setDraft({ name: e.target.value.slice(0, 40) })}
                className="h-[50px] w-full rounded-[14px] border border-line bg-white px-[15px] text-[15px] outline-none"
              />
            </Field>
            <Field label={t.phoneCallField}>
              <input
                data-testid="post-phone"
                value={draft.phone}
                placeholder="+996 "
                onChange={(e) => setDraft({ phone: e.target.value })}
                className="h-[50px] w-full rounded-[14px] border border-line bg-white px-[15px] text-[15px] outline-none"
              />
            </Field>
            <p className="text-[12px] leading-[1.45] text-muted">{t.phoneNoSms}</p>
          </div>
        ) : (
          <p className="mt-4 text-[13px] text-muted">
            {t.callersSee} {user.name} · {formatPhoneDisplay(user.phone)} ·{" "}
            <button type="button" className="font-semibold text-accent" onClick={() => router.push("/profile/edit?back=/post?type=personal")}>
              {t.edit}
            </button>
          </p>
        )}
        <button type="button" className="mt-4 text-[14px] font-semibold text-ink" onClick={() => setMore(!more)}>
          {t.moreDetails}
        </button>
        {more ? (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-[13px] font-semibold text-muted">{t.catRefine}</p>
            <PostTaxonomy draft={draft} onPatch={(patch) => setDraft(patch.section ? { ...patch, categoryLocked: true, sectionPicked: true } : patch)} />
            <Field label={t.venueAddress}>
              <input value={draft.address ?? ""} onChange={(e) => setDraft({ address: e.target.value })} className="h-[50px] w-full rounded-[14px] border border-line bg-white px-[15px] text-[15px] outline-none" />
            </Field>
            <Field label={t.city}>
              <select
                value={draft.city}
                onChange={(e) => {
                  const next = e.target.value;
                  const gis = GIS_CITIES[next] ?? gisCity(next);
                  setDraft({ city: next, lat: gis.lat, lng: gis.lng, district: undefined });
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
            {draft.kind === "rent" ? (
              <div className="flex gap-2">
                <input value={draft.rooms} onChange={(e) => setDraft({ rooms: e.target.value })} placeholder={t.roomsField} className="h-[50px] flex-1 rounded-[14px] border border-line px-3" />
                <input value={draft.area} onChange={(e) => setDraft({ area: e.target.value })} placeholder={t.areaField} className="h-[50px] flex-1 rounded-[14px] border border-line px-3" />
              </div>
            ) : null}
            <Field label={t.mapPoint}>
              <div className="relative isolate z-0 h-52 overflow-hidden rounded-[14px] border border-line">
                <GisMap
                  center={{ lat: draft.lat ?? gisCity(draft.city).lat, lng: draft.lng ?? gisCity(draft.city).lng }}
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
            {draft.section === "secondhand" || draft.section === "animals" || draft.section === "construction" ? (
              <div className="flex flex-wrap gap-2">
                {meetupSpotsFor(draft.city).map((id) => (
                  <Chip
                    key={id}
                    active={draft.meetupSpot === id}
                    onClick={() => {
                      const pt = meetupCoords(id, draft.city);
                      setDraft({ meetupSpot: id, lat: pt.lat, lng: pt.lng });
                    }}
                  >
                    {t.meetupSpots[id]}
                  </Chip>
                ))}
              </div>
            ) : null}
            {hasRole(user, "realtor") || hasRole(user, "dealer") || !showsNeighborPledge(draft.section) ? null : (
              <div className="flex items-center justify-between gap-3 rounded-[14px] border border-line bg-white px-3 py-3">
                <span className="text-[15px] font-semibold">{t.neighborPledge}</span>
                <Toggle on={draft.neighborPledge !== false} onChange={() => setDraft({ neighborPledge: draft.neighborPledge === false })} />
              </div>
            )}
            <div className="flex items-center justify-between rounded-[18px] bg-ink p-4 text-screen">
              <span className="font-display text-[17px] font-bold">{t.promote}</span>
              <Toggle on={draft.promote} onChange={() => setDraft({ promote: !draft.promote })} />
            </div>
          </div>
        ) : null}
        {draft.savedAt && unfinished ? (
          <p data-testid="draft-saved" className="mt-3 text-[12px] text-muted">
            {t.draftSaved}
          </p>
        ) : null}
      </div>
      <div className="relative z-20 border-t border-line bg-screen px-5 pb-6 pt-3">
        {limit ? (
          <div className="mb-2">
            <DailyLimitNotice />
          </div>
        ) : error ? (
          <p data-testid="post-error" className="mb-2 text-[13px] text-accent">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          data-testid="post-publish"
          disabled={busy}
          onClick={() => void publish()}
          className="shadow-btn h-[54px] w-full rounded-2xl bg-accent text-base font-semibold text-accent-on disabled:opacity-60"
        >
          {t.publish}
        </button>
        <p className="mt-2 text-center text-[12px] text-muted">{t.publishHint}</p>
      </div>
      <LeaveDialog
        open={Boolean(leave)}
        onStay={() => {
          setLeave(null);
          historyGuard.stay();
        }}
        onSave={() => {
          const go = leave?.proceed;
          setLeave(null);
          go?.();
        }}
        onDelete={() => {
          const go = leave?.proceed;
          setLeave(null);
          discardDraft();
          go?.();
        }}
      />
    </PhoneShell>
  );
}
