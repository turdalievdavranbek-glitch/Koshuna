"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { hasRole, type ApplicationKind } from "@/lib/partners";
import { useApp } from "@/lib/store";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { Chip, Field, Input } from "@/components/ui";

function PartnerApplyInner() {
  const { t, user, applications, submitPartnerApplication, setPendingPath, city } = useApp();
  const router = useRouter();
  const rawKind = useSearchParams().get("kind");
  const kind: ApplicationKind = rawKind === "developer" || rawKind === "dealer" ? rawKind : "realtor";
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [districts, setDistricts] = useState("");
  const [specialization, setSpecialization] = useState(kind === "realtor" ? "продажа" : "");
  const [inn, setInn] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState("");

  if (!user) {
    return (
      <PhoneShell>
        <div className="px-5 pt-4">
          <button type="button" onClick={() => { setPendingPath("/partner"); router.push("/login"); }} className="shadow-btn h-12 w-full rounded-2xl bg-accent font-semibold text-accent-on">
            {t.loginCta}
          </button>
        </div>
      </PhoneShell>
    );
  }

  const mine = applications.find((row) => row.kind === kind && row.userPhone === user.phone);
  const already = hasRole(user, kind);

  const send = () => {
    submitPartnerApplication({
      kind,
      companyName,
      contactName,
      phone,
      city: city === "all" ? "bishkek" : city,
      districts,
      specialization,
      inn,
      website,
      address,
      hours,
    });
  };

  return (
    <PhoneShell>
      <div className="px-5 pb-2 pt-1">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => router.push("/selling")} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface">
            <IconBack size={16} color="#17140F" />
          </button>
          <h1 className="font-display text-[17px] font-bold text-ink">{t.partnerApplyTitle}</h1>
          <span className="w-9" />
        </div>
      </div>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        <div className="flex flex-wrap gap-2">
          <Chip active={kind === "realtor"} onClick={() => router.replace("/partner?kind=realtor")}>{t.applyRealtor}</Chip>
          <Chip active={kind === "developer"} onClick={() => router.replace("/partner?kind=developer")}>{t.applyDeveloper}</Chip>
          <Chip active={kind === "dealer"} onClick={() => router.replace("/partner?kind=dealer")}>{t.applyDealer}</Chip>
        </div>
        {already ? <p className="mt-4 text-[15px] text-success">{t.partnerApproved}</p> : null}
        {mine && !already ? (
          <p className="mt-4 text-[15px] text-ink">
            {mine.status === "pending" ? t.partnerPending : mine.status === "approved" ? t.partnerApproved : t.partnerRejected}
          </p>
        ) : null}
        {!already && mine?.status !== "pending" ? (
          <>
            <div className="mt-4">
              <Field label={kind === "realtor" ? t.agencyName : t.shopName}>
                <Input value={companyName} onChange={setCompanyName} />
              </Field>
            </div>
            <div className="mt-2">
              <Field label={t.yourName}>
                <Input value={contactName} onChange={setContactName} />
              </Field>
            </div>
            <div className="mt-2">
              <Field label={t.phone}>
                <Input value={phone} onChange={setPhone} />
              </Field>
            </div>
            {kind === "realtor" ? (
              <div className="mt-2">
                <Field label={t.workDistricts}>
                  <Input value={districts} onChange={setDistricts} />
                </Field>
              </div>
            ) : kind === "dealer" ? (
              <>
                <div className="mt-2">
                  <Field label={t.shopAddress}>
                    <Input value={address} onChange={setAddress} />
                  </Field>
                </div>
                <div className="mt-2">
                  <Field label={t.dealerHours}>
                    <Input value={hours} onChange={setHours} />
                  </Field>
                </div>
              </>
            ) : (
              <div className="mt-2">
                <Field label={t.innField}>
                  <Input value={inn} onChange={setInn} />
                </Field>
              </div>
            )}
            <div className="mt-2">
              <Field label={kind === "realtor" ? t.specialization : t.websiteField}>
                <Input value={kind === "realtor" ? specialization : website} onChange={kind === "realtor" ? setSpecialization : setWebsite} />
              </Field>
            </div>
            <button type="button" onClick={send} className="shadow-btn mt-4 h-12 w-full rounded-2xl bg-accent font-semibold text-accent-on">
              {t.sendApplication}
            </button>
          </>
        ) : null}
      </div>
    </PhoneShell>
  );
}

export default function PartnerApplyPage() {
  return (
    <Suspense fallback={null}>
      <PartnerApplyInner />
    </Suspense>
  );
}
