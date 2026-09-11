"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatSom } from "@/lib/data";
import { minSqmPrice, type ComplexClass } from "@/lib/partners";
import { useApp } from "@/lib/store";
import { IconBack } from "@/components/icons";
import { LocationLine } from "@/components/location-line";
import { PhoneShell } from "@/components/shell";
import { Chip, Photo } from "@/components/ui";

export default function ComplexesPage() {
  const { t, complexes, complexUnits, developerProfiles } = useApp();
  const router = useRouter();
  const [klass, setKlass] = useState<ComplexClass | "any">("any");
  const publicList = complexes.filter((row) => row.isPublished);
  const list = useMemo(
    () => (klass === "any" ? publicList : publicList.filter((row) => row.class === klass)),
    [publicList, klass],
  );

  return (
    <PhoneShell tab>
      <div className="px-5 pb-2 pt-1">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => router.push("/section/rent")} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface">
            <IconBack size={16} color="#17140F" />
          </button>
          <h1 className="font-display text-[17px] font-bold text-ink">{t.complexesTitle}</h1>
          <span className="w-9" />
        </div>
        <LocationLine className="mt-2" />
      </div>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        <p className="text-[13px] leading-[1.45] text-muted">{t.complexesHint}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip active={klass === "any"} onClick={() => setKlass("any")}>{t.any}</Chip>
          {(["economy", "comfort", "business", "elite"] as const).map((id) => (
            <Chip key={id} active={klass === id} onClick={() => setKlass(id)}>
              {t.complexClass[id]}
            </Chip>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {list.length ? (
            list.map((row) => {
            const units = complexUnits.filter((u) => u.complexId === row.id);
            const sqm = minSqmPrice(units);
            const developer = developerProfiles.find((d) => d.id === row.developerId);
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => router.push(`/complexes/${row.slug}`)}
                className="overflow-hidden rounded-[18px] border border-line bg-white text-left"
              >
                <div className="h-36 w-full overflow-hidden">
                  <Photo src={row.coverUrl} alt="" />
                </div>
                <div className="px-3.5 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-md bg-chip px-2 py-0.5 text-[10px] font-bold text-muted">{t.complexClass[row.class]}</span>
                    <span className="rounded-md bg-chip px-2 py-0.5 text-[10px] font-bold text-muted">{t.complexStage[row.stage]}</span>
                    {developer?.verified ? (
                      <span className="rounded-md bg-[#E7F3ED] px-2 py-0.5 text-[10px] font-bold text-success">{t.developerVerified}</span>
                    ) : null}
                  </div>
                  <div className="mt-1.5 font-display text-[17px] font-bold text-ink">{row.name}</div>
                  <div className="mt-1 text-[13px] text-muted">
                    {t.cities[row.city]} · {row.district}
                    {sqm ? ` · ${t.complexFrom} ${formatSom(sqm)} ${t.complexSqm}` : ""}
                    {row.deadlineYear ? ` · ${t.deadline} ${row.deadlineQuarter ?? ""}${t.qShort} ${row.deadlineYear}` : ""}
                  </div>
                </div>
              </button>
            );
          })
          ) : (
            <p className="text-[13px] text-muted">{t.empty}</p>
          )}
        </div>
      </div>
    </PhoneShell>
  );
}
