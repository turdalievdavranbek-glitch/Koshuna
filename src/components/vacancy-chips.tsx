"use client";

import { JOB_SPHERES, JOB_TYPES, jobRolesOf, jobSubsOf } from "@/lib/vacancies";
import { useApp } from "@/lib/store";
import { Chip, Eyebrow } from "@/components/ui";
import { SectionList } from "@/components/section-list";

export function VacancyChips({ labeled, list }: { labeled?: boolean; list?: boolean }) {
  const { t, filters, setFilters } = useApp();
  const sphere = filters.jobSphere === "any" ? undefined : filters.jobSphere;
  const sub = filters.jobSub === "any" ? undefined : filters.jobSub;
  const subs = jobSubsOf(sphere);
  const roles = jobRolesOf(sphere, sub);

  const pickSphere = (id: string) => {
    setFilters({ jobSphere: id, jobSub: "any", jobRole: "any" });
  };
  const pickSub = (id: string) => {
    setFilters({ jobSub: id, jobRole: "any" });
  };

  const typeRow = (
    <div className="flex flex-wrap gap-2">
      <Chip active={filters.jobType === "any"} onClick={() => setFilters({ jobType: "any" })}>
        {t.any}
      </Chip>
      {JOB_TYPES.map((id) => (
        <Chip key={id} active={filters.jobType === id} onClick={() => setFilters({ jobType: id })}>
          {t.jobTypes[id]}
        </Chip>
      ))}
    </div>
  );

  if (list) {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <Eyebrow>{t.jobType}</Eyebrow>
          <div className="mt-2">{typeRow}</div>
        </div>
      </div>
    );
  }

  if (labeled) {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <Eyebrow>{t.jobType}</Eyebrow>
          <div className="mt-2.5">{typeRow}</div>
        </div>
        <SectionList
          title={t.jobSphere}
          rows={[
            { id: "any", label: t.allCategories, active: !sphere, onClick: () => pickSphere("any") },
            ...JOB_SPHERES.map((id) => ({
              id,
              label: t.jobSpheres[id],
              active: filters.jobSphere === id,
              onClick: () => pickSphere(id),
            })),
          ]}
        />
        {sphere ? (
          <SectionList
            title={t.jobSub}
            rows={[
              { id: "any", label: t.any, active: filters.jobSub === "any", onClick: () => pickSub("any") },
              ...subs.map((id) => ({
                id,
                label: t.jobSubs[id] ?? id,
                active: filters.jobSub === id,
                onClick: () => pickSub(id),
              })),
            ]}
          />
        ) : null}
        {sphere && sub ? (
          <SectionList
            title={t.jobRole}
            rows={[
              { id: "any", label: t.any, active: filters.jobRole === "any", onClick: () => setFilters({ jobRole: "any" }) },
              ...roles.map((id) => ({
                id,
                label: t.jobRoles[id] ?? id,
                active: filters.jobRole === id,
                onClick: () => setFilters({ jobRole: id }),
              })),
            ]}
          />
        ) : null}
      </div>
    );
  }

  return typeRow;
}
