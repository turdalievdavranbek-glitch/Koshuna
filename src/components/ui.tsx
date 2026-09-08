"use client";

import { useRouter } from "next/navigation";
import { formatSom } from "@/lib/data";
import { applyFilters } from "@/lib/filter";
import { listingTitle } from "@/lib/i18n";
import { useApp } from "@/lib/store";
import type { Listing } from "@/lib/types";
import { IconCheck, IconHeart, IconPin } from "./icons";

export function Photo({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={`h-full w-full object-cover ${className ?? ""}`} />
  );
}

export function Chip({
  children,
  active,
  onClick,
  accent,
  className,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  accent?: boolean;
  className?: string;
}) {
  const bg = active ? (accent ? "#B8452F" : "#17140F") : "#FFFFFF";
  const color = active ? (accent ? "#FFF7F0" : "#F7F3EC") : "#17140F";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-[15px] py-2 text-[13px] font-semibold ${className ?? ""}`}
      style={{
        background: bg,
        color,
        border: active ? "none" : "1px solid #E4DCCE",
      }}
    >
      {children}
    </button>
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className="relative h-[27px] w-[46px] shrink-0 rounded-full"
      style={{ background: on ? "#B8452F" : "#DCD3C4" }}
    >
      <span
        className="absolute top-[3px] h-[21px] w-[21px] rounded-full bg-white"
        style={{ left: on ? "auto" : 3, right: on ? 3 : "auto" }}
      />
    </button>
  );
}

export function Price({ listing, large, compact }: { listing: Listing; large?: boolean; compact?: boolean }) {
  const { t } = useApp();
  const unit = listing.unit ? t.units[listing.unit] : "";
  if (large) {
    return (
      <div className="flex items-baseline gap-2">
        <span className="font-display text-[32px] font-extrabold tracking-[-0.02em] text-accent">
          {formatSom(listing.price)} KGS
        </span>
        {unit ? <span className="text-sm text-muted">{unit}</span> : null}
      </div>
    );
  }
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`font-display font-bold tracking-[-0.01em] text-ink ${compact ? "text-[19px]" : "text-[21px]"}`}>
        {formatSom(listing.price)} {compact ? "" : "KGS"}
        {compact && listing.unit === "month" ? (
          <span className="ml-1 text-xs font-medium text-muted">{t.perMonthShort}</span>
        ) : compact ? (
          <span className="ml-1 text-[11px] font-medium text-muted">KGS</span>
        ) : null}
      </span>
      {!compact && listing.unit === "month" ? <span className="text-xs text-muted">{t.perMonth}</span> : null}
    </div>
  );
}

export function ListingHero({ listing, onFav }: { listing: Listing; onFav?: () => void }) {
  const { t, lang, isFav, user } = useApp();
  const router = useRouter();
  const title = listingTitle(listing, lang);
  return (
    <button
      type="button"
      onClick={() => router.push(`/listing/${listing.id}`)}
      className="mt-3 w-full overflow-hidden rounded-[20px] border border-line bg-surface text-left"
    >
      <div className="relative h-[186px]">
        <Photo src={listing.photos[0]} alt={title} />
        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-[rgba(23,20,15,.72)] px-2.5 py-1 text-[11px] font-semibold text-screen">
          {listing.section === "rent" ? t.rent : t.cats[listing.category ?? ""] ?? t.sectionNames[listing.section]}
        </span>
        <span
          role="button"
          onClick={(e) => {
            e.stopPropagation();
            onFav?.();
          }}
          className="absolute right-2.5 top-2.5 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/92"
        >
          <IconHeart size={16} color={user && isFav(listing.id) ? "#B8452F" : "#17140F"} filled={Boolean(user && isFav(listing.id))} />
        </span>
      </div>
      <div className="px-[15px] pb-[15px] pt-[13px]">
        <Price listing={listing} />
        <div className="mt-1 text-[15px] font-medium leading-[1.3] text-ink">{title}</div>
        {listing.rooms ? (
          <div className="mt-1 text-[13px] text-muted">
            {listing.rooms} {t.roomWord} · {listing.area} м²
          </div>
        ) : null}
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-2">
          <span>{t.cities[listing.city]}</span>
          <span>·</span>
          <span>{t.ago[listing.postedAgo] ?? listing.postedAgo}</span>
          {listing.verified ? (
            <span className="ml-auto flex items-center gap-1 font-semibold text-success">
              <IconCheck size={12} color="#2A6B57" />
              {t.verified}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function ListingRow({
  listing,
  onOpen,
  overlay,
  priceDrop,
  heart,
  dim,
}: {
  listing: Listing;
  onOpen?: () => void;
  overlay?: string;
  priceDrop?: boolean;
  heart?: boolean;
  dim?: boolean;
}) {
  const { t, lang, isFav, user } = useApp();
  const router = useRouter();
  const title = listingTitle(listing, lang);
  const cat =
    listing.section === "rent"
      ? t.rent
      : listing.category
        ? (t.cats[listing.category] ?? t.sectionNames[listing.section])
        : t.sectionNames[listing.section];
  return (
    <button
      type="button"
      onClick={onOpen ?? (() => router.push(`/listing/${listing.id}`))}
      className="flex w-full overflow-hidden rounded-[20px] border border-line bg-surface text-left"
      style={{ opacity: dim ? 0.7 : 1 }}
    >
      <div className="relative h-full w-[118px] shrink-0 self-stretch">
        <Photo src={listing.photos[0]} alt={title} className="min-h-[118px]" />
        {priceDrop ? (
          <span className="absolute left-2 top-2 rounded-md bg-success px-2 py-0.5 text-[10px] font-bold text-screen">
            −3 000
          </span>
        ) : null}
        {overlay ? (
          <span className="absolute inset-0 flex items-center justify-center bg-[rgba(23,20,15,.42)] text-[11px] font-bold tracking-wide text-screen">
            {overlay}
          </span>
        ) : null}
      </div>
      <div className="flex-1 px-3.5 py-3">
        <span className="inline-block rounded-md bg-chip px-2 py-0.5 text-[11px] font-semibold text-muted">{cat}</span>
        {priceDrop ? (
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="font-display text-[19px] font-bold text-ink">35 000</span>
            <span className="text-xs text-muted-2 line-through">38 000</span>
          </div>
        ) : (
          <div className="mt-1.5">
            <Price listing={listing} compact />
          </div>
        )}
        <div className="mt-1 text-sm leading-[1.3] text-ink">{title}</div>
        <div className="mt-1.5 text-xs text-muted-2">
          {t.cities[listing.city]}
          {listing.rooms
            ? ` · ${listing.rooms} ${t.roomWord} · ${listing.area} м²`
            : listing.condition
              ? ` · ${t.conditions[listing.condition]}`
              : ""}
        </div>
      </div>
      {heart ? (
        <div className="pr-3 pt-3">
          <IconHeart size={18} filled color="#B8452F" />
        </div>
      ) : user && isFav(listing.id) ? (
        <div className="pr-3 pt-3">
          <IconHeart size={18} filled color="#B8452F" />
        </div>
      ) : null}
    </button>
  );
}

export function useFiltered() {
  const { allListings, filters, city } = useApp();
  return applyFilters(allListings, filters, city);
}

export function RoundBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface"
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[13px] font-semibold text-ink">{label}</span>
      <div className="mt-[7px]">{children}</div>
    </label>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-[50px] w-full rounded-[14px] border border-line bg-surface px-[15px] text-[15px] text-ink outline-none placeholder:text-muted-2"
    />
  );
}

export function SelectRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-full items-center justify-between rounded-[14px] border border-line bg-surface px-[15px]"
    >
      <span className="text-sm text-muted">{label}</span>
      <span className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
        {value}
        <span className="text-[11px] text-muted-2">▾</span>
      </span>
    </button>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-bold uppercase tracking-[0.12em] text-accent-dark">{children}</div>
  );
}

export function CityPicker({
  value,
  onChange,
  includeAll = true,
}: {
  value: string;
  onChange: (v: string) => void;
  includeAll?: boolean;
}) {
  const { t } = useApp();
  const keys = Object.keys(t.cities).filter((k) => includeAll || k !== "all");
  return (
    <div className="flex flex-wrap gap-2">
      {keys.map((id) => (
        <Chip key={id} active={value === id} accent={id !== "all" && value === id} onClick={() => onChange(id)}>
          {t.cities[id]}
        </Chip>
      ))}
    </div>
  );
}

export function LangSwitch() {
  const { lang, setLang } = useApp();
  return (
    <div className="flex gap-1.5 self-end rounded-full bg-chip p-1">
      {(["ru", "ky", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          className="rounded-full px-[13px] py-1.5 text-xs font-semibold"
          style={{
            background: lang === code ? "#17140F" : "transparent",
            color: lang === code ? "#F7F3EC" : "#6E6558",
          }}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function MapSketch() {
  return (
    <div className="absolute inset-0 bg-[#E9E4D5]">
      <div className="absolute left-[-40px] top-[120px] h-[70px] w-[520px] origin-left -rotate-8 bg-[#F4F0E4]" />
      <div className="absolute left-[-40px] top-[430px] h-[46px] w-[520px] rotate-[4deg] bg-[#F4F0E4]" />
      <div className="absolute left-[110px] top-[-40px] h-[960px] w-11 rotate-6 bg-[#F4F0E4]" />
      <div className="absolute left-[290px] top-[-40px] h-[960px] w-[30px] -rotate-4 bg-[#F4F0E4]" />
      <div className="absolute left-6 top-[250px] h-[120px] w-[150px] rounded-[18px] bg-[#DCE6D8]" />
      <div className="absolute left-[210px] top-[560px] h-[150px] w-40 rounded-[20px] bg-[#DCE6D8]" />
      <div className="absolute left-[180px] top-[200px] h-[110px] w-[180px] rounded-[14px] bg-[#E3DED0]" />
    </div>
  );
}

export function IconPinTiny() {
  return <IconPin size={14} color="#B8452F" />;
}
