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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    void api<Mine>("/api/me/courier").then((res) => {
      if (res.ok && res.data) setMine(res.data);
    });
  }, [user]);

  const send = async () => {
    if (!passport || !selfie || busy) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("name", name.trim());
      form.set("phone", phone.trim());
      form.set("district", district.trim());
      form.set("transport", transport);
      form.set("passport", new File([await compressImage(passport)], "passport.jpg", { type: "image/jpeg" }));
      form.set("selfie", new File([await compressImage(selfie)], "selfie.jpg", { type: "image/jpeg" }));
      const res = await api("/api/me/courier", { method: "POST", body: form });
      setBusy(false);
      if (!res.ok) {
        setError(t.deliveryFail);
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
            <label className="block text-[14px] font-semibold">
              {t.deliveryPassport}
              <input type="file" accept="image/*" capture="environment" className="mt-1 block w-full text-[13px]" onChange={(e) => setPassport(e.target.files?.[0] ?? null)} />
            </label>
            <label className="block text-[14px] font-semibold">
              {t.deliverySelfie}
              <input type="file" accept="image/*" capture="user" className="mt-1 block w-full text-[13px]" onChange={(e) => setSelfie(e.target.files?.[0] ?? null)} />
            </label>
            {error ? <p className="text-[13px] font-semibold text-accent">{error}</p> : null}
            <RedBtn disabled={busy || name.trim().length < 2 || !phone.trim() || district.trim().length < 2 || !passport || !selfie} onClick={() => void send()}>
              {t.deliverySendApply}
            </RedBtn>
          </div>
        )}
      </div>
    </PhoneShell>
  );
}
