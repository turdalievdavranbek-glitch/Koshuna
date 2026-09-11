"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatSom } from "@/lib/data";
import { COMPLEX_AMENITIES, COMPLEX_CLASSES, COMPLEX_STAGES, hasRole, type ComplexAmenity } from "@/lib/partners";
import { useApp } from "@/lib/store";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { Chip, Field, Input } from "@/components/ui";

export default function DeveloperCabinetPage() {
  const { t, user, developerProfiles, complexes, complexUnits, partnerLeads, telegramOutbox, saveComplex, setComplexUnits, setUnitStatus, setLeadStatus, setDeveloperTelegram, setPendingPath } = useApp();
  const router = useRouter();
  const profile = developerProfiles.find((row) => row.userPhone === user?.phone);
  const mine = complexes.filter((row) => row.developerId === profile?.id);
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [klass, setKlass] = useState<(typeof COMPLEX_CLASSES)[number]>("comfort");
  const [stage, setStage] = useState<(typeof COMPLEX_STAGES)[number]>("under_construction");
  const [year, setYear] = useState("2027");
  const [amenities, setAmenities] = useState<ComplexAmenity[]>(["parking"]);
  const [chatId, setChatId] = useState(profile?.telegramChatId ?? "");
  const [selected, setSelected] = useState(mine[0]?.id ?? "");
  const units = complexUnits.filter((row) => row.complexId === selected);
  const leads = partnerLeads.filter((row) => mine.some((jk) => jk.id === row.complexId));
  const lastTg = telegramOutbox.find((row) => row.chatId === profile?.telegramChatId);

  const [building, setBuilding] = useState("1");
  const [floor, setFloor] = useState("3");
  const [rooms, setRooms] = useState("2");
  const [area, setArea] = useState("64");
  const [price, setPrice] = useState("6400000");

  if (!user) {
    setPendingPath("/developer");
    router.push("/login");
    return null;
  }
  if (!hasRole(user, "developer") || !profile) {
    return (
      <PhoneShell>
        <div className="p-5">
          <p className="text-muted">{t.applyDeveloper}</p>
          <button type="button" onClick={() => router.push("/partner?kind=developer")} className="mt-4 text-[15px] font-semibold text-accent">
            {t.partnerApplyTitle}
          </button>
        </div>
      </PhoneShell>
    );
  }

  const create = () => {
    const row = saveComplex({
      name,
      city: "bishkek",
      district,
      address,
      class: klass,
      stage,
      deadlineYear: Number(year) || undefined,
      amenities,
      description: name,
    });
    if (row) {
      setSelected(row.id);
      setName("");
    }
  };

  const addUnit = () => {
    if (!selected) return;
    setComplexUnits(selected, [
      ...units,
      {
        buildingLabel: building,
        floor: Number(floor) || 1,
        rooms: Number(rooms) || 0,
        area: Number(area) || 40,
        price: Number(price) || 0,
        status: "available",
      },
    ]);
  };

  return (
    <PhoneShell>
      <div className="px-5 pb-2 pt-1">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => router.push("/selling")} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface">
            <IconBack size={16} color="#17140F" />
          </button>
          <h1 className="font-display text-[17px] font-bold text-ink">{t.developerCabinet}</h1>
          <span className="w-9" />
        </div>
      </div>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        <div className="rounded-[16px] border border-line bg-white p-3.5">
          <div className="text-[15px] font-semibold text-ink">{profile.companyName}</div>
          <Field label={t.telegramChatId}>
            <Input value={chatId} onChange={setChatId} />
          </Field>
          <p className="mt-1 text-[12px] text-muted">{t.telegramHint}</p>
          <button type="button" onClick={() => setDeveloperTelegram(chatId)} className="mt-2 text-[13px] font-semibold text-accent">{t.saveComplex}</button>
          {lastTg ? <p className="mt-2 text-[12px] text-muted">{t.lastTelegram}: {lastTg.text}</p> : null}
        </div>

        <div className="mt-5 font-display text-[19px] font-bold">{t.newComplex}</div>
        <div className="mt-2">
          <Field label={t.shopName}><Input value={name} onChange={setName} /></Field>
        </div>
        <div className="mt-2 flex gap-2">
          <div className="flex-1"><Field label={t.workDistricts}><Input value={district} onChange={setDistrict} /></Field></div>
          <div className="flex-1"><Field label={t.shopAddress}><Input value={address} onChange={setAddress} /></Field></div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {COMPLEX_CLASSES.map((id) => (
            <Chip key={id} active={klass === id} onClick={() => setKlass(id)}>{t.complexClass[id]}</Chip>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {COMPLEX_STAGES.map((id) => (
            <Chip key={id} active={stage === id} onClick={() => setStage(id)}>{t.complexStage[id]}</Chip>
          ))}
        </div>
        <div className="mt-2"><Field label={t.deadline}><Input value={year} onChange={setYear} /></Field></div>
        <div className="mt-2 flex flex-wrap gap-2">
          {COMPLEX_AMENITIES.map((id) => (
            <Chip key={id} active={amenities.includes(id)} onClick={() => setAmenities(amenities.includes(id) ? amenities.filter((x) => x !== id) : [...amenities, id])}>
              {t.amenities[id]}
            </Chip>
          ))}
        </div>
        <button type="button" onClick={create} className="shadow-btn mt-3 h-12 w-full rounded-2xl bg-accent font-semibold text-accent-on">{t.saveComplex}</button>
        <p className="mt-2 text-[12px] text-muted">{t.partnerPending}</p>

        <div className="mt-6 font-display text-[19px] font-bold">{t.complexesTitle}</div>
        {mine.map((row) => (
          <button key={row.id} type="button" onClick={() => setSelected(row.id)} className={`mt-2 w-full rounded-[14px] border px-3.5 py-3 text-left ${selected === row.id ? "border-ink" : "border-line"}`}>
            <div className="font-semibold text-ink">{row.name}</div>
            <div className="text-[12px] text-muted">{row.isPublished ? t.partnerApproved : t.partnerPending} · {row.views}</div>
          </button>
        ))}

        {selected ? (
          <>
            <div className="mt-5 font-display text-[19px] font-bold">{t.complexUnits}</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Field label={t.unitBuilding}><Input value={building} onChange={setBuilding} /></Field>
              <Field label={t.unitFloor}><Input value={floor} onChange={setFloor} /></Field>
              <Field label={t.rooms}><Input value={rooms} onChange={setRooms} /></Field>
              <Field label={t.areaField}><Input value={area} onChange={setArea} /></Field>
            </div>
            <div className="mt-2"><Field label={t.priceKgs}><Input value={price} onChange={setPrice} /></Field></div>
            <button type="button" onClick={addUnit} className="mt-2 h-11 w-full rounded-xl border border-line font-semibold">{t.addUnit}</button>
            <div className="mt-3 overflow-hidden rounded-[16px] border border-line bg-white">
              {units.map((row, i) => (
                <div key={row.id} className={`flex items-center justify-between px-3 py-2.5 ${i ? "border-t border-line" : ""}`}>
                  <span className="text-[13px]">{row.buildingLabel}/{row.floor} · {row.rooms || t.roomsStudio} · {formatSom(row.price)}</span>
                  <button type="button" className="text-[12px] font-semibold text-accent" onClick={() => setUnitStatus(row.id, row.status === "available" ? "reserved" : row.status === "reserved" ? "sold" : "available")}>
                    {row.status === "available" ? t.unitAvailable : row.status === "reserved" ? t.unitReserved : t.unitSold}
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <div className="mt-6 font-display text-[19px] font-bold">{t.leaveLead}</div>
        {leads.map((row) => (
          <button key={row.id} type="button" onClick={() => setLeadStatus(row.id, row.status === "new" ? "contacted" : "closed")} className="mt-2 w-full rounded-[14px] border border-line bg-white px-3.5 py-3 text-left">
            <div className="font-semibold text-ink">{row.name} · {row.phone}</div>
            <div className="text-[12px] text-muted">{row.status} · {row.message}</div>
          </button>
        ))}
      </div>
    </PhoneShell>
  );
}
