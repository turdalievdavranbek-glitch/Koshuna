"use client";

import { useRouter } from "next/navigation";
import { formatSom } from "@/lib/data";
import { dropAmount, dropPercent, hasPriceDrop, listingHasPrice } from "@/lib/deal";
import { applyFilters } from "@/lib/filter";
import { listingChipLabel, listingTitle, postedLabel } from "@/lib/i18n";
import { isVideoListing } from "@/lib/video-ai";
import { useApp } from "@/lib/store";
import { LANGS, type Listing } from "@/lib/types";
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
  size = "md",
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  accent?: boolean;
  className?: string;
  size?: "md" | "sm" | "xs";
}) {
  const bg = active ? (accent ? "#B8452F" : "#17140F") : "#FFFFFF";
  const color = active ? (accent ? "#FFF7F0" : "#F7F3EC") : "#17140F";
  const pad = size === "xs" ? "px-2 py-[3px] text-[10px]" : size === "sm" ? "px-[11px] py-[5px] text-[11px]" : "px-[15px] py-2 text-[13px]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full font-semibold ${pad} ${className ?? ""}`}
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
  const dropped = hasPriceDrop(listing);
  const amount = listingHasPrice(listing) ? `${formatSom(listing.price)}` : t.shopAskPrice;
  if (large) {
    return (
      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[32px] font-extrabold tracking-[-0.02em] text-accent">
            {listingHasPrice(listing) ? `${amount} KGS` : amount}
          </span>
          {listingHasPrice(listing) && unit ? <span className="text-sm text-muted">{unit}</span> : null}
        </div>
        {dropped && listing.previousPrice ? (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-muted-2 line-through">{formatSom(listing.previousPrice)} KGS</span>
            <span className="rounded-md bg-success-tint px-1.5 py-0.5 text-[11px] font-bold text-success">
              −{formatSom(dropAmount(listing))}
            </span>
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-display font-bold tracking-[-0.01em] text-ink ${compact ? "text-[19px]" : "text-[21px]"}`}>
          {listingHasPrice(listing) ? (
            <>
              {formatSom(listing.price)} {compact ? "" : "KGS"}
              {compact && listing.unit === "month" ? (
                <span className="ml-1 text-xs font-medium text-muted">{t.perMonthShort}</span>
              ) : compact && listing.unit === "night" ? (
                <span className="ml-1 text-xs font-medium text-muted">{t.units.night}</span>
              ) : compact && listing.unit === "day" ? (
                <span className="ml-1 text-xs font-medium text-muted">{t.units.day}</span>
              ) : compact ? (
                <span className="ml-1 text-[11px] font-medium text-muted">KGS</span>
              ) : null}
            </>
          ) : (
            amount
          )}
        </span>
        {!compact && listing.unit === "month" ? <span className="text-xs text-muted">{t.perMonth}</span> : null}
        {!compact && listing.unit === "night" ? <span className="text-xs text-muted">{t.units.night}</span> : null}
        {!compact && listing.unit === "day" ? <span className="text-xs text-muted">{t.units.day}</span> : null}
      </div>
      {dropped && listing.previousPrice ? (
        <div className={`flex items-center gap-1.5 ${compact ? "mt-0.5" : "mt-1"}`}>
          <span className={`text-muted-2 line-through ${compact ? "text-[10px]" : "text-xs"}`}>
            {formatSom(listing.previousPrice)}
          </span>
          {compact ? (
            <span className="text-[10px] font-bold text-success">−{dropPercent(listing)}%</span>
          ) : (
            <span className="rounded-md bg-success-tint px-1.5 py-0.5 text-[10px] font-bold text-success">
              {t.priceDropped}
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function ListingHero({ listing, onFav }: { listing: Listing; onFav?: () => void }) {
  const { t, lang, isFav, user } = useApp();
  const router = useRouter();
  const title = listingTitle(listing, lang);
  const video = isVideoListing(listing);
  return (
    <button
      type="button"
      onClick={() => router.push(`/listing/${listing.id}`)}
      className={`mt-3 w-full text-left ${video ? "" : "overflow-hidden rounded-[20px] border border-line bg-surface"}`}
    >
      <div className={`relative ${video ? "px-14 pt-4" : "aspect-square overflow-hidden rounded-t-[20px]"}`}>
        {video ? (
          <div
            className="rounded-full p-[2.5px]"
            style={{ background: "linear-gradient(145deg, #B8452F 0%, #17140F 78%)" }}
          >
            <div className="relative aspect-square overflow-hidden rounded-full bg-chip">
              <Photo src={listing.photos[0]} alt={title} />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(23,20,15,.72)] pl-0.5 text-white">
                  ▶
                </span>
              </span>
            </div>
          </div>
        ) : (
          <Photo src={listing.photos[0]} alt={title} />
        )}
        {!video ? (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-[rgba(23,20,15,.72)] px-2.5 py-1 text-[11px] font-semibold text-screen">
            {listingChipLabel(listing, t)}
          </span>
        ) : null}
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
      <div className={`px-[15px] pb-[15px] pt-[13px] ${video ? "text-center" : ""}`}>
        <Price listing={listing} />
        <div className="mt-1 text-[15px] font-medium leading-[1.3] text-ink">{title}</div>
        {listing.rooms ? (
          <div className="mt-1 text-[13px] text-muted">
            {listing.rooms} {t.roomWord} · {listing.area} м²
          </div>
        ) : null}
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-2">
          {listing.sellerName ? (
            <>
              <span>{listing.sellerName}</span>
              <span>·</span>
            </>
          ) : null}
          <span>{t.cities[listing.city]}</span>
          <span>·</span>
          <span>{postedLabel(listing, t)}</span>
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
  const cat = listingChipLabel(listing, t);
  const video = isVideoListing(listing);
  return (
    <button
      type="button"
      onClick={onOpen ?? (() => router.push(`/listing/${listing.id}`))}
      className="flex w-full items-center overflow-hidden rounded-[20px] border border-line bg-surface text-left"
      style={{ opacity: dim ? 0.7 : 1 }}
    >
      <div className={`relative shrink-0 self-center p-2 ${video ? "w-[92px]" : "w-[118px]"}`}>
        {video ? (
          <div
            className="rounded-full p-[2px]"
            style={{ background: "linear-gradient(145deg, #B8452F 0%, #17140F 78%)" }}
          >
            <div className="relative aspect-square overflow-hidden rounded-full bg-chip">
              <Photo src={listing.photos[0]} alt={title} />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] text-white">
                ▶
              </span>
            </div>
          </div>
        ) : (
          <div className="relative aspect-square overflow-hidden rounded-[10px]">
            <Photo src={listing.photos[0]} alt={title} />
            {hasPriceDrop(listing) ? (
              <span className="absolute left-2 top-2 rounded-md bg-success px-2 py-0.5 text-[10px] font-bold text-screen">
                −{formatSom(dropAmount(listing))}
              </span>
            ) : null}
            {overlay ? (
              <span className="absolute inset-0 flex items-center justify-center bg-[rgba(23,20,15,.42)] text-[11px] font-bold tracking-wide text-screen">
                {overlay}
              </span>
            ) : null}
          </div>
        )}
      </div>
      <div className="flex-1 px-3.5 py-3">
        <span className="inline-block rounded-md bg-chip px-2 py-0.5 text-[11px] font-semibold text-muted">{cat}</span>
        <div className="mt-1.5">
          <Price listing={listing} compact />
        </div>
        <div className="mt-1 text-sm leading-[1.3] text-ink">{title}</div>
        <div className="mt-1.5 text-xs text-muted-2">
          {listing.sellerName ? `${listing.sellerName} · ` : ""}
          {t.cities[listing.city]}
          {` · ${postedLabel(listing, t)}`}
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
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="h-[50px] w-full rounded-[14px] border border-line bg-surface px-[15px] text-[15px] text-ink outline-none placeholder:text-muted-2 disabled:bg-chip disabled:text-muted"
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
    <div className="flex gap-1 self-end rounded-full bg-chip p-1">
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          className="rounded-full px-2.5 py-1.5 text-[11px] font-semibold"
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
