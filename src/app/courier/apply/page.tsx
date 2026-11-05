"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { compressImage } from "@/lib/media-compress";
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
}: {
  file: File | null;
  onFile: (file: File | null) => void;
  icon: string;
  label: string;
  replace: string;
  capture: "environment" | "user";
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
          <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
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
  );
}

type Mine = {
  courier: boolean;
  application: { status: string } | null;
};

export default function CourierApplyPage() {
  const { t, user: sessionUser } = useApp();
  const user = useSignedIn("/courier/apply");
  const router = useRouter();
  const [mine, setMine] = useState<Mine | null>(null);
  const [name, setName] = useState(sessionUser?.name ?? "");
  const [phone, setPhone] = useState(sessionUser?.phone ?? "");
  const [district, setDistrict] = useState("");
  const [transport, setTransport] = useState<CourierTransport>("walk");
  const [passport, setPassport] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    void api<Mine>("/api/me/courier").then((res) => {
      if (res.ok && res.data) setMine(res.data);
    });
  }, [user]);

  const send = async () => {
    if (!passport || !selfie || !agreed || busy) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("name", name.trim());
      form.set("phone", phone.trim());
      form.set("district", district.trim());
      form.set("transport", transport);
      form.set("rules", "1");
      form.set("passport", new File([await compressImage(passport)], "passport.jpg", { type: "image/jpeg" }));
      form.set("selfie", new File([await compressImage(selfie)], "selfie.jpg", { type: "image/jpeg" }));
      const res = await api("/api/me/courier", { method: "POST", body: form });
      setBusy(false);
      if (!res.ok) {
        setError(res.error === "rules" ? t.courierRulesRequired : t.deliveryFail);
        return;
      }
      refreshCourierBadge();
      setMine({ courier: false, application: { status: "pending" } });
    } catch {
      setBusy(false);
      setError(t.deliveryFail);
    }
  };

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
            {mine?.application?.status === "revoked" ? <p className="text-[13px] text-muted">{t.deliveryRevokedHint}</p> : null}
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
            <Input value={district} onChange={setDistrict} placeholder={t.deliveryDistrict} />
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
              <PhotoTile file={selfie} onFile={setSelfie} icon="🤳" label={t.courierTileSelfie} replace={t.courierTileReplace} capture="user" />
            </div>
            {error ? <p className="text-[13px] font-semibold text-accent">{error}</p> : null}
            <RedBtn disabled={busy || !agreed || name.trim().length < 2 || !phone.trim() || district.trim().length < 2 || !passport || !selfie} onClick={() => void send()}>
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
