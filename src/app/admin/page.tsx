"use client";

import { useRouter } from "next/navigation";
import { isAdminUser } from "@/lib/partners";
import { useApp } from "@/lib/store";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";

export default function AdminPage() {
  const { t, user, applications, complexes, developerProfiles, realtorProfiles, dealerProfiles, reviewApplication, publishComplex, toggleDeveloperVerified, toggleRealtorVerified, toggleDealerVerified, setPendingPath } = useApp();
  const router = useRouter();

  if (!user) {
    setPendingPath("/admin");
    router.push("/login");
    return null;
  }
  if (!isAdminUser(user)) {
    return (
      <PhoneShell>
        <div className="p-5 text-muted">{t.empty}</div>
      </PhoneShell>
    );
  }

  const pending = applications.filter((row) => row.status === "pending");
  const unpublished = complexes.filter((row) => !row.isPublished);

  return (
    <PhoneShell>
      <div className="px-5 pb-2 pt-1">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => router.push("/selling")} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface">
            <IconBack size={16} color="#17140F" />
          </button>
          <h1 className="font-display text-[17px] font-bold text-ink">{t.adminTitle}</h1>
          <span className="w-9" />
        </div>
      </div>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        <div className="font-display text-[19px] font-bold text-ink">{t.partnerApplyTitle}</div>
        <div className="mt-3 flex flex-col gap-2.5">
          {pending.length ? pending.map((row) => (
            <div key={row.id} className="rounded-[16px] border border-line bg-white p-3.5">
              <div className="text-[11px] font-bold uppercase text-accent-dark">
                {row.kind === "realtor" ? t.realtorBadge : row.kind === "dealer" ? t.dealerBadge : t.developerBadge}
              </div>
              <div className="mt-1 text-[15px] font-semibold text-ink">{row.companyName || row.userName}</div>
              <div className="text-[13px] text-muted">{row.phone} · {row.userName}</div>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => reviewApplication(row.id, "approved")} className="h-10 flex-1 rounded-xl bg-ink text-[13px] font-semibold text-screen">{t.approve}</button>
                <button type="button" onClick={() => reviewApplication(row.id, "rejected")} className="h-10 flex-1 rounded-xl border border-line text-[13px] font-semibold">{t.reject}</button>
              </div>
            </div>
          )) : <p className="text-[13px] text-muted">{t.empty}</p>}
        </div>

        <div className="mt-6 font-display text-[19px] font-bold text-ink">{t.complexesTitle}</div>
        <div className="mt-3 flex flex-col gap-2.5">
          {unpublished.map((row) => (
            <div key={row.id} className="rounded-[16px] border border-line bg-white p-3.5">
              <div className="text-[15px] font-semibold text-ink">{row.name}</div>
              <button type="button" onClick={() => publishComplex(row.id, true)} className="mt-2 h-10 w-full rounded-xl bg-ink text-[13px] font-semibold text-screen">{t.publishComplex}</button>
            </div>
          ))}
          {complexes.filter((row) => row.isPublished).map((row) => (
            <div key={row.id} className="rounded-[16px] border border-line bg-white p-3.5">
              <div className="text-[15px] font-semibold text-ink">{row.name}</div>
              <button type="button" onClick={() => publishComplex(row.id, false)} className="mt-2 text-[13px] font-semibold text-accent">{t.unpublishComplex}</button>
            </div>
          ))}
        </div>

        <div className="mt-6 font-display text-[19px] font-bold text-ink">{t.developerBadge}</div>
        {developerProfiles.map((row) => (
          <button key={row.id} type="button" onClick={() => toggleDeveloperVerified(row.id)} className="mt-2 w-full rounded-[14px] border border-line bg-white px-3.5 py-3 text-left">
            {row.companyName} · {row.verified ? t.developerVerified : t.developerBadge}
          </button>
        ))}
        <div className="mt-6 font-display text-[19px] font-bold text-ink">{t.realtorBadge}</div>
        {realtorProfiles.map((row) => (
          <button key={row.id} type="button" onClick={() => toggleRealtorVerified(row.id)} className="mt-2 w-full rounded-[14px] border border-line bg-white px-3.5 py-3 text-left">
            {row.agencyName || row.phone} · {row.verified ? t.realtorVerified : t.realtorBadge}
          </button>
        ))}
        <div className="mt-6 font-display text-[19px] font-bold text-ink">{t.dealerBadge}</div>
        {dealerProfiles.map((row) => (
          <button key={row.id} type="button" onClick={() => toggleDealerVerified(row.id)} className="mt-2 w-full rounded-[14px] border border-line bg-white px-3.5 py-3 text-left">
            {row.companyName} · {row.verified ? t.dealerVerified : t.dealerBadge}
          </button>
        ))}
      </div>
    </PhoneShell>
  );
}
