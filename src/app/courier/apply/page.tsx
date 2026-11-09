"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { areasOfOblast, adminAreaLabel, type AdminArea } from "@/lib/admin-areas";
import { courierFixPlace, haversineKm } from "@/lib/geo";
import { pointOblasts, pointPlaceSuggestions } from "@/lib/point-place";
import { settlementById } from "@/lib/data";
import { compressImage } from "@/lib/media-compress";
import { locate as readLocation } from "@/lib/locate";
import type { CourierTransport } from "@/lib/delivery";
import { useApp } from "@/lib/store";
import { PhoneShell } from "@/components/shell";
import { Input } from "@/components/ui";
import { PageHead, RedBtn, useSignedIn } from "@/components/delivery-ui";
import { refreshCourierBadge } from "@/components/courier-badge";
import { CourierRules } from "@/components/courier-rules";

function PhotoTile({
  file,
  onFile,
  icon,
  label,
  replace,
  capture,
  hint,
}: {
  file: File | null;
  onFile: (file: File | null) => void;
  icon: string;
  label: string;
  replace: string;
  capture: "environment" | "user";
  hint?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return (
    <div className="flex flex-col gap-1">
    <label className="shadow-btn relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl bg-accent text-center text-accent-on ring-2 ring-[#FFE600]">
      <input
        type="file"
        accept="image/*"
        capture={capture}
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {url ? (
        <>
          <img src={url} alt="" className="absolute inset-0 h-full w-full object-contain" />
          <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#FFE600] text-[14px] font-extrabold text-ink">✔</span>
          <span className="absolute inset-x-0 bottom-0 bg-accent/95 py-2 text-[13px] font-bold">{replace}</span>
        </>
      ) : (
        <>
          <span className="text-[42px] leading-none">{icon}</span>
          <span className="mt-1.5 px-2 text-[13px] font-bold leading-tight">{label}</span>
        </>
      )}
    </label>
    {hint ? <p className="text-center text-[11px] font-semibold leading-tight text-muted">{hint}</p> : null}
    </div>
  );
}

type Mine = {
  courier: boolean;
  application: { status: string; rejectReason?: string | null } | null;
};

export default function CourierApplyPage() {
  const { t, lang, user: sessionUser } = useApp();
  const user = useSignedIn("/courier/apply");
  const router = useRouter();
  const [mine, setMine] = useState<Mine | null>(null);
  const [name, setName] = useState(sessionUser?.name ?? "");
  const [phone, setPhone] = useState(sessionUser?.phone ?? "");
  const [place, setPlace] = useState<{ city: string; districtId: string; label: string; lat: number; lng: number } | null>(null);
  const [step, setStep] = useState(0);
  const [oblast, setOblast] = useState("");
  const [rayon, setRayon] = useState<AdminArea | null>(null);
  const [locating, setLocating] = useState(false);
  const [transport, setTransport] = useState<CourierTransport>("walk");
  const [passport, setPassport] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    void api<Mine>("/api/me/courier").then((res) => {
      if (res.ok && res.data) setMine(res.data);
    });
  }, [user]);

  const send = async () => {
    if (sending.current || !passport || !selfie || !agreed || !place || busy) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("name", name.trim());
      form.set("phone", phone.trim());
      form.set("city", place?.city ?? "");
      form.set("district", place?.districtId ?? "");
      form.set("lat", String(place?.lat ?? ""));
      form.set("lng", String(place?.lng ?? ""));
      form.set("transport", transport);
      form.set("rules", "1");
      form.set("passport", new File([await compressImage(passport)], "passport.jpg", { type: "image/jpeg" }));
      form.set("selfie", new File([await compressImage(selfie)], "selfie.jpg", { type: "image/jpeg" }));
      const res = await api("/api/me/courier", { method: "POST", body: form });
      if (!res.ok) {
        setError(res.error === "rules" ? t.courierRulesRequired : t.deliveryFail);
        return;
      }
      refreshCourierBadge();
      setMine({ courier: false, application: { status: "pending" } });
    } catch {
      setError(t.deliveryFail);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };

  const choose = (lat: number, lng: number) => {
    const found = courierFixPlace(lat, lng, lang);
    if (!found) {
      setError(t.courierLocateFail);
      return;
    }
    setPlace({ ...found, lat, lng });
    setError("");
  };

  const locate = () => {
    if (locating) return;
    setLocating(true);
    setError("");
    void readLocation().then((fix) => {
      setLocating(false);
      if (!fix.ok) {
        setStep(0);
        setOblast("");
        setRayon(null);
        setError(t.courierLocateFail);
        return;
      }
      choose(fix.lat, fix.lng);
    });
  };

  const areas = oblast ? areasOfOblast(oblast) : { districts: [], cities: [] };
  const rayons = areas.districts;
  const nearestRayonId = (lat: number, lng: number) =>
    areas.districts.reduce(
      (best, row) => {
        const km = haversineKm(lat, lng, row.lat, row.lng);
        return km < best.km ? { id: row.id, km } : best;
      },
      { id: "", km: Infinity },
    ).id;
  const towns = rayon
    ? [
        ...areas.cities
          .filter((city) => nearestRayonId(city.lat, city.lng) === rayon.id)
          .map((city) => ({ id: city.id, label: adminAreaLabel(city, lang), lat: city.lat, lng: city.lng })),
        ...(rayon.settlementId
          ? (() => {
              const own = settlementById(rayon.settlementId);
              return own ? [{ id: `s-${own.id}`, label: lang === "ky" ? own.nameKy : own.name, lat: own.lat, lng: own.lng }] : [];
            })()
          : []),
        ...pointPlaceSuggestions(oblast, rayon, lang),
      ]
    : [];

  const choices: { id: CourierTransport; label: string }[] = [
    { id: "car", label: t.deliveryCar },
    { id: "moto", label: t.deliveryMoto },
    { id: "walk", label: t.deliveryWalk },
  ];

  return (
    <PhoneShell>
      <PageHead title={t.deliveryApplyTitle} fallback="/profile" />
      <div className="sc mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        {mine?.courier ? (
          <button type="button" onClick={() => router.push("/courier")} className="w-full rounded-[18px] border border-line bg-white px-4 py-4 text-left">
            <div className="text-[16px] font-extrabold">✔ {t.deliveryCourierBadge}</div>
          </button>
        ) : mine?.application?.status === "pending" ? (
          <p className="rounded-[18px] border border-line bg-white px-4 py-4 text-[15px] font-semibold">{t.deliveryPending}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {mine?.application?.status === "revoked" ? (
              <div className="rounded-[18px] border border-line bg-white px-4 py-4">
                <p className="text-[13px] text-muted">{t.deliveryRevokedHint}</p>
                {mine.application.rejectReason ? (
                  <p className="mt-2 text-[15px] font-semibold text-ink" data-testid="courier-reject-reason">
                    {t.courierRejectSaved}: {mine.application.rejectReason}
                  </p>
                ) : null}
              </div>
            ) : null}
            <p className="text-[13px] leading-[1.4] text-muted">{t.deliveryBecomeHint}</p>
            <CourierRules />
            {agreed ? (
              <p className="text-[13px] font-semibold text-ink">{t.courierRulesDone}</p>
            ) : (
              <button
                type="button"
                onClick={() => setAgreed(true)}
                className="shadow-btn h-[52px] w-full rounded-2xl bg-accent text-[16px] font-bold text-accent-on"
              >
                {t.courierRulesConfirm}
              </button>
            )}
            {agreed ? (
              <>
            <Input value={name} onChange={setName} placeholder={t.deliveryYourName} />
            <Input value={phone} onChange={setPhone} placeholder="+996" inputMode="tel" />
            {place ? (
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-white px-4 py-3">
                <span className="text-[15px] font-semibold text-ink">{place.label}</span>
                <button
                  type="button"
                  onClick={() => {
                    setStep(0);
                    setOblast("");
                    setRayon(null);
                  }}
                  className="shrink-0 text-[14px] font-bold text-accent"
                >
                  {t.courierLocateChange}
                </button>
              </div>
            ) : null}
            <button
              type="button"
              disabled={locating}
              onClick={locate}
              className="shadow-btn flex h-[72px] w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-[16px] font-bold text-accent-on ring-2 ring-[#FFE600] disabled:opacity-60"
            >
              <span className="text-[28px] leading-none">📍</span>
              <span>{locating ? t.courierLocateWait : t.courierLocate}</span>
            </button>
            {error ? <p className="text-[13px] font-semibold text-accent">{error}</p> : null}
            <div className="rounded-2xl border border-line bg-white px-3 py-3">
              <div className="flex flex-wrap items-center gap-1 text-[13px] font-semibold">
                <button type="button" onClick={() => setStep(0)} className={step === 0 ? "text-accent" : "text-ink"}>
                  {oblast ? (t.oblasts[oblast] ?? oblast) : t.placeOblast}
                </button>
                {step >= 1 ? (
                  <>
                    <span className="text-muted">›</span>
                    <button type="button" onClick={() => setStep(1)} className={step === 1 ? "text-accent" : "text-ink"}>
                      {rayon ? adminAreaLabel(rayon, lang) : t.locationDistricts}
                    </button>
                  </>
                ) : null}
                {step === 2 ? (
                  <>
                    <span className="text-muted">›</span>
                    <span className="text-accent">{t.courierPlaceTown}</span>
                  </>
                ) : null}
              </div>
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep((n) => Math.max(0, n - 1))}
                  className="mt-2 text-[13px] font-bold text-ink"
                >
                  ‹ {t.pointPrev}
                </button>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {step === 0
                  ? pointOblasts().map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setOblast(id);
                          setRayon(null);
                          setStep(1);
                        }}
                        className="flex min-h-[64px] items-center justify-center rounded-2xl border border-line bg-white px-2 py-2 text-center text-[14px] font-semibold leading-tight text-ink"
                      >
                        {t.oblasts[id] ?? id}
                      </button>
                    ))
                  : null}
                {step === 1
                  ? rayons.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => {
                          setRayon(row);
                          setStep(2);
                        }}
                        className={`flex min-h-[64px] items-center justify-center rounded-2xl border px-2 py-2 text-center text-[14px] font-semibold leading-tight text-ink ${rayon?.id === row.id ? "border-2 border-accent bg-[#FFF4EC]" : "border-line bg-white"}`}
                      >
                        {adminAreaLabel(row, lang)}
                      </button>
                    ))
                  : null}
                {step === 2
                  ? (towns.length ? towns : rayon ? [{ id: rayon.id, label: adminAreaLabel(rayon, lang), lat: rayon.lat, lng: rayon.lng }] : []).map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => choose(row.lat, row.lng)}
                        className="flex min-h-[64px] items-center justify-center rounded-2xl border border-line bg-white px-2 py-2 text-center text-[14px] font-semibold leading-tight text-ink"
                      >
                        {row.label}
                      </button>
                    ))
                  : null}
              </div>
            </div>
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t.deliveryTransport}</div>
            <div className="flex gap-2">
              {choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => setTransport(choice.id)}
                  className={`h-10 flex-1 rounded-xl text-[14px] font-bold ${transport === choice.id ? "bg-ink text-screen" : "border border-line bg-white"}`}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <PhotoTile file={passport} onFile={setPassport} icon="🪪" label={t.deliveryPassport} replace={t.courierTileReplace} capture="environment" />
              <PhotoTile file={selfie} onFile={setSelfie} icon="🤳" label={t.courierTileSelfie} replace={t.courierTileReplace} capture="user" hint={t.courierSelfieHint} />
            </div>
            {error ? <p className="text-[13px] font-semibold text-accent">{error}</p> : null}
            <RedBtn disabled={busy || !agreed || !place || name.trim().length < 2 || !phone.trim() || !passport || !selfie} onClick={() => void send()}>
              {t.deliverySendApply}
            </RedBtn>
              </>
            ) : null}
          </div>
        )}
      </div>
    </PhoneShell>
  );
}
