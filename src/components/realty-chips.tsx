"use client";

import {
  AREA_PRESETS,
  ROOM_FILTERS,
  REALTY_GROUPS,
  areaPresetId,
  housingKindOfRealty,
  realtyIsLiving,
  realtyKindsOf,
  realtyShowsArea,
  realtyShowsRooms,
  realtySubsOf,
  roomsOfRealtyKind,
  stockOfRealtyKind,
} from "@/lib/realty";
import { useApp } from "@/lib/store";
import { Chip, Eyebrow } from "@/components/ui";
import { SectionList } from "@/components/section-list";

export function RealtyChips({ labeled, list }: { labeled?: boolean; list?: boolean }) {
  const { t, filters, setFilters } = useApp();
  const group = filters.realtyGroup === "any" ? undefined : filters.realtyGroup;
  const sub = filters.realtySub === "any" ? undefined : filters.realtySub;
  const subs = realtySubsOf(group);
  const kinds = realtyKindsOf(group, sub);

  const pickGroup = (id: string) => {
    const housingType = housingKindOfRealty(id === "any" ? undefined : id);
    setFilters({
      realtyGroup: id,
      realtySub: "any",
      realtyKind: "any",
      housingType,
      rooms: [],
      stockType: "any",
      checkIn: realtyIsLiving(id) && filters.dealType === "short" ? filters.checkIn : null,
      checkOut: realtyIsLiving(id) && filters.dealType === "short" ? filters.checkOut : null,
    });
  };
  const pickSub = (id: string) => {
    setFilters({
      realtySub: id,
      realtyKind: "any",
      rooms: [],
      stockType: "any",
    });
  };
  const pickKind = (id: string) => {
    setFilters({
      realtyKind: id,
      housingType: housingKindOfRealty(group, id),
      rooms: roomsOfRealtyKind(id),
      stockType: stockOfRealtyKind(id),
    });
  };

  const areaRow = realtyShowsArea(group) ? (
    <div className="flex flex-wrap gap-2">
      {AREA_PRESETS.map((preset) => (
        <Chip
          key={preset.id}
          active={areaPresetId(filters.areaMin, filters.areaMax) === preset.id}
          onClick={() => setFilters({ areaMin: preset.min, areaMax: preset.max })}
        >
          {preset.id === "any"
            ? t.areaAny
            : preset.id === "to40"
              ? t.areaTo40
              : preset.id === "r40-70"
                ? t.area40to70
                : preset.id === "r70-100"
                  ? t.area70to100
                  : t.area100plus}
        </Chip>
      ))}
    </div>
  ) : null;

  const roomsRow = realtyShowsRooms(group, filters.realtyKind, filters.housingType) ? (
    <div className="flex flex-wrap gap-2">
      <Chip active={filters.rooms.length === 0} onClick={() => setFilters({ rooms: [] })}>
        {t.anyRooms}
      </Chip>
      {ROOM_FILTERS.map((row) => (
        <Chip
          key={row.kind}
          active={filters.rooms.includes(row.rooms)}
          onClick={() => {
            const has = filters.rooms.includes(row.rooms);
            setFilters({
              rooms: has ? filters.rooms.filter((n) => n !== row.rooms) : [...filters.rooms, row.rooms],
            });
          }}
        >
          {row.kind === "studio" ? t.roomsStudio : row.kind === "5plus" ? t.rooms5plus : row.kind}
        </Chip>
      ))}
    </div>
  ) : null;

  if (list) {
    return (
      <div className="flex flex-col gap-3">
        {areaRow ? (
          <div>
            <Eyebrow>{t.area}</Eyebrow>
            <div className="mt-2">{areaRow}</div>
          </div>
        ) : null}
        {roomsRow ? (
          <div>
            <Eyebrow>{t.rooms}</Eyebrow>
            <div className="mt-2">{roomsRow}</div>
          </div>
        ) : null}
      </div>
    );
  }

  if (labeled) {
    return (
      <div className="flex flex-col gap-3">
        {areaRow ? (
          <div>
            <Eyebrow>{t.area}</Eyebrow>
            <div className="mt-2.5">{areaRow}</div>
          </div>
        ) : null}
        {roomsRow ? (
          <div>
            <Eyebrow>{t.rooms}</Eyebrow>
            <div className="mt-2.5">{roomsRow}</div>
          </div>
        ) : null}
        <SectionList
          title={t.realtyGroup}
          rows={[
            ...REALTY_GROUPS.map((id) => ({
              id,
              label: t.realtyGroups[id],
              active: filters.realtyGroup === id,
              onClick: () => pickGroup(id),
            })),
          ]}
        />
        {group ? (
          <SectionList
            title={t.realtySub}
            rows={[
              { id: "any", label: t.any, active: filters.realtySub === "any", onClick: () => pickSub("any") },
              ...subs.map((id) => ({
                id,
                label: t.realtySubs[id] ?? id,
                active: filters.realtySub === id,
                onClick: () => pickSub(id),
              })),
            ]}
          />
        ) : null}
        {group && sub ? (
          <SectionList
            title={t.realtyKind}
            rows={[
              { id: "any", label: t.any, active: filters.realtyKind === "any", onClick: () => pickKind("any") },
              ...kinds.map((id) => ({
                id,
                label: t.realtyKinds[id] ?? id,
                active: filters.realtyKind === id,
                onClick: () => pickKind(id),
              })),
            ]}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {areaRow}
      {roomsRow}
    </div>
  );
}
