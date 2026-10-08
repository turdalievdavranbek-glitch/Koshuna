"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { formatPhoneDisplay, normalizePhoneInput } from "@/lib/phone";
import { useApp } from "@/lib/store";

export default function ProfileEditPage() {
  const { t, user, ready, setPendingPath, updateProfile } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const back = params.get("back") || "/profile";
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ? formatPhoneDisplay(user.phone) : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setPendingPath("/profile/edit");
      router.replace("/login");
    }
    // setPendingPath is recreated on every store render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    setName(user.name || "");
    setPhone(user.phone ? formatPhoneDisplay(user.phone) : "");
  }, [user]);

  if (!ready || !user) return null;

  const save = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 80) {
      setError(t.phoneRequired);
      return;
    }
    const normalized = phone.trim() ? normalizePhoneInput(phone) : "";
    if (phone.trim() && !normalized) {
      setError(t.phoneBad);
      return;
    }
    setBusy(true);
    const res = await updateProfile({ name: trimmed, phone: normalized || "" });
    setBusy(false);
    if (!res.ok) {
      setError(res.error === "network" ? t.noNetSave : res.error === "phone" ? t.phoneBad : res.error === "name" ? t.phoneRequired : t.noNetSave);
      return;
    }
    router.push(back);
  };

  return (
    <PhoneShell>
      <div className="px-5 pb-2 pt-1">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => router.push("/profile")} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface" aria-label={t.backLeave}>
            <IconBack size={16} color="#17140F" />
          </button>
          <span className="font-display text-[16px] font-bold">{t.myData}</span>
          <span className="w-9" />
        </div>
      </div>
      <div className="px-5 pb-8">
        <label className="mt-3 block">
          <span className="text-[13px] font-semibold">{t.nameField}</span>
          <input data-testid="profile-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 h-[50px] w-full rounded-[14px] border border-line bg-white px-3 text-[15px] outline-none" />
        </label>
        <label className="mt-3 block">
          <span className="text-[13px] font-semibold">{t.phoneCallField}</span>
          <input data-testid="profile-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+996 " className="mt-1.5 h-[50px] w-full rounded-[14px] border border-line bg-white px-3 text-[15px] outline-none" />
        </label>
        <p className="mt-2 text-[12px] leading-[1.45] text-muted">{t.phoneNoSms}</p>
        <p className="mt-1 text-[12px] leading-[1.45] text-muted">{t.phoneClearedNote}</p>
        {error ? <p className="mt-2 text-[13px] text-accent">{error}</p> : null}
        <button type="button" data-testid="profile-save" disabled={busy} onClick={() => void save()} className="shadow-btn mt-4 h-[52px] w-full rounded-2xl bg-accent text-[16px] font-semibold text-accent-on">
          {t.save}
        </button>
        <button type="button" onClick={() => router.push("/profile")} className="mt-2 h-[48px] w-full text-[15px] font-semibold text-muted">
          {t.postCancel}
        </button>
      </div>
    </PhoneShell>
  );
}
