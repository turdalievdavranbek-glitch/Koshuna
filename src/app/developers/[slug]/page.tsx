"use client";

import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { Photo } from "@/components/ui";

export default function DeveloperPublicPage() {
  const slug = useParams<{ slug: string }>().slug;
  const { t, developerProfiles, complexes } = useApp();
  const router = useRouter();
  const developer = developerProfiles.find((row) => row.slug === slug);
  const list = complexes.filter((row) => row.developerId === developer?.id && row.isPublished);

  if (!developer) {
    return (
      <PhoneShell>
        <div className="p-5 text-muted">{t.empty}</div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell tab>
      <div className="px-5 pb-2 pt-1">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => router.push("/complexes")} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface">
            <IconBack size={16} color="#17140F" />
          </button>
          <h1 className="max-w-[240px] truncate font-display text-[17px] font-bold text-ink">{developer.companyName}</h1>
          <span className="w-9" />
        </div>
      </div>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        {developer.verified ? (
          <div className="rounded-[14px] bg-[#E7F3ED] px-3.5 py-2 text-[13px] font-bold text-success">{t.developerVerified}</div>
        ) : (
          <div className="rounded-[14px] bg-chip px-3.5 py-2 text-[13px] font-bold text-muted">{t.developerBadge}</div>
        )}
        <p className="mt-3 text-[15px] leading-[1.5] text-ink">{developer.description || developer.companyName}</p>
        <div className="mt-2 text-[13px] text-muted">{developer.phone}{developer.website ? ` · ${developer.website}` : ""}</div>
        <div className="mt-5 flex flex-col gap-3">
          {list.map((row) => (
            <button key={row.id} type="button" onClick={() => router.push(`/complexes/${row.slug}`)} className="overflow-hidden rounded-[18px] border border-line bg-white text-left">
              <div className="h-28 overflow-hidden">
                <Photo src={row.coverUrl} alt="" />
              </div>
              <div className="px-3.5 py-3 font-semibold text-ink">{row.name}</div>
            </button>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}
