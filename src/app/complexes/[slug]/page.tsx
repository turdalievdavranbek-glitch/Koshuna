"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatSom } from "@/lib/data";
import { minSqmPrice, type UnitStatus } from "@/lib/partners";
import { useApp } from "@/lib/store";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { Chip, Field, Input, Photo } from "@/components/ui";

export default function ComplexDetailPage() {
  const slug = useParams<{ slug: string }>().slug;
  const { t, complexes, complexUnits, developerProfiles, bumpComplexViews, submitLead, user } = useApp();
  const router = useRouter();
  const complex = complexes.find((row) => row.slug === slug);
  const developer = complex ? developerProfiles.find((row) => row.id === complex.developerId) : undefined;
  const units = complexUnits.filter((row) => row.complexId === complex?.id);
  const [rooms, setRooms] = useState<number | "any">("any");
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [message, setMessage] = useState("");
  const [unitId, setUnitId] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (complex?.isPublished) bumpComplexViews(complex.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complex?.id]);

  const visible = useMemo(() => {
    return units
      .filter((row) => (rooms === "any" ? true : row.rooms === rooms))
      .sort((a, b) => a.price - b.price);
  }, [units, rooms]);

  if (!complex || !complex.isPublished) {
    return (
      <PhoneShell>
        <div className="p-5">
          <button type="button" onClick={() => router.push("/complexes")} className="text-[15px] font-semibold text-accent">
            {t.complexesTitle}
          </button>
          <p className="mt-4 text-muted">{t.empty}</p>
        </div>
      </PhoneShell>
    );
  }

  const sqm = minSqmPrice(units);
  const send = () => {
    const res = submitLead({
      source: "complex_page",
      complexId: complex.id,
      unitId: unitId || undefined,
      developerId: complex.developerId,
      name,
      phone,
      message,
      honeypot,
    });
    setNote(res.ok ? t.leadSent : res.error === "rate" ? t.leadRate : t.leadNeedPhone);
  };

  const statusLabel = (id: UnitStatus) => (id === "available" ? t.unitAvailable : id === "reserved" ? t.unitReserved : t.unitSold);

  return (
    <PhoneShell tab>
      <div className="px-5 pb-2 pt-1">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => router.push("/complexes")} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface">
            <IconBack size={16} color="#17140F" />
          </button>
          <h1 className="max-w-[240px] truncate font-display text-[17px] font-bold text-ink">{complex.name}</h1>
          <span className="w-9" />
        </div>
      </div>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        <div className="h-44 overflow-hidden rounded-[18px]">
          <Photo src={complex.coverUrl} alt="" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-md bg-chip px-2 py-0.5 text-[10px] font-bold text-muted">{t.complexClass[complex.class]}</span>
          <span className="rounded-md bg-chip px-2 py-0.5 text-[10px] font-bold text-muted">{t.complexStage[complex.stage]}</span>
          {developer?.verified ? (
            <span className="rounded-md bg-[#E7F3ED] px-2 py-0.5 text-[10px] font-bold text-success">{t.developerVerified}</span>
          ) : null}
        </div>
        <p className="mt-3 text-[15px] leading-[1.5] text-ink">{complex.description}</p>
        <div className="mt-2 text-[13px] text-muted">
          {t.cities[complex.city]}, {complex.district}, {complex.address}
          {sqm ? ` · ${t.complexFrom} ${formatSom(sqm)} ${t.complexSqm}` : ""}
          {complex.deadlineYear ? ` · ${t.deadline} ${complex.deadlineQuarter ?? ""}${t.qShort} ${complex.deadlineYear}` : ""}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {complex.amenities.map((id) => (
            <span key={id} className="rounded-full border border-line px-2.5 py-1 text-[12px] font-semibold text-ink">
              {t.amenities[id]}
            </span>
          ))}
        </div>
        {developer ? (
          <button type="button" onClick={() => router.push(`/developers/${developer.slug}`)} className="mt-4 w-full rounded-[16px] border border-line bg-white px-3.5 py-3 text-left">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.developerBadge}</div>
            <div className="mt-1 text-[15px] font-semibold text-ink">{developer.companyName}</div>
            <div className="text-[13px] text-muted">{developer.phone}</div>
          </button>
        ) : null}

        <div className="mt-5 font-display text-[19px] font-bold text-ink">{t.complexUnits}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip active={rooms === "any"} onClick={() => setRooms("any")}>{t.anyRooms}</Chip>
          {[0, 1, 2, 3].map((n) => (
            <Chip key={n} active={rooms === n} onClick={() => setRooms(n)}>
              {n === 0 ? t.roomsStudio : n}
            </Chip>
          ))}
        </div>
        <div className="mt-3 overflow-hidden rounded-[16px] border border-line bg-white">
          {visible.map((row, i) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setUnitId(row.id)}
              className={`flex w-full items-center justify-between px-3.5 py-3 text-left ${i ? "border-t border-line" : ""} ${unitId === row.id ? "bg-accent-tint" : ""}`}
            >
              <span className="text-[13px] font-semibold text-ink">
                {t.unitBuilding} {row.buildingLabel} · {t.unitFloor} {row.floor} · {row.rooms === 0 ? t.roomsStudio : `${row.rooms}`} · {row.area} м²
              </span>
              <span className="text-[13px] font-bold text-ink">
                {row.status === "sold" ? statusLabel(row.status) : `${formatSom(row.price)}`}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-[18px] border border-line bg-white p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.leaveLead}</div>
          <div className="mt-3">
            <Field label={t.yourName}>
              <Input value={name} onChange={setName} />
            </Field>
          </div>
          <div className="mt-2">
            <Field label={t.phone}>
              <Input value={phone} onChange={setPhone} placeholder="+996" />
            </Field>
          </div>
          <label className="hidden">
            website
            <input value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </label>
          <div className="mt-2">
            <Field label={t.description}>
              <Input value={message} onChange={setMessage} />
            </Field>
          </div>
          {note ? <p className="mt-2 text-[13px] text-success">{note}</p> : null}
          <button type="button" onClick={send} className="shadow-btn mt-3 h-12 w-full rounded-2xl bg-accent text-[15px] font-semibold text-accent-on">
            {t.askPrice}
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
