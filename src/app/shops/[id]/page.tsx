"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatSom } from "@/lib/data";
import { displayPhotoForProduct } from "@/lib/shop-photos";
import { canSeeShop, formatShopHours, groupShopProducts, isOwnShop, nowInKg, publicProduct, shopDeliveryLine, shopHasPointPlace, shopPlaceHeadline, shopOpenNow } from "@/lib/shops";
import { shopKindLabel, shopQtyLabel } from "@/lib/shop-copy";
import { telegramLink } from "@/lib/telegram-username";
import { useApp } from "@/lib/store";
import { PhoneShell } from "@/components/shell";
import { ShopProductsEditor } from "@/components/shop-products";
import { ShopThumb, ShopVideo } from "@/components/shop-thumb";
import { Chip, Eyebrow } from "@/components/ui";
import { TrustStars } from "@/components/trust-stars";
import { FEATURES } from "@/lib/features";
import { GisOnMapCard } from "@/components/gis-on-map";
import { starsForUser } from "@/lib/trust";
import { ScreenBack } from "@/components/back-button";
import { BlockedAuthorNotice } from "@/components/block-author";
import { PlayBanner } from "@/components/play-banner";
import { ShareButton } from "@/components/share-button";
import { ShopSubscribe } from "@/components/shop-subscribe";
import { IconBack, IconPhone, IconTg, IconWa } from "@/components/icons";
import { goBack } from "@/lib/go-back";

export default function ShopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, lang, shops, user, allListings, withdrawShop, reportShop, reports, synced, recallShop, isBlocked } = useApp();
  const shop = recallShop(id) ?? shops.find((item) => item.id === id);
  const [playing, setPlaying] = useState(false);

  const mine = shop ? isOwnShop(shop, user) : false;
  const visible = shop ? canSeeShop(shop, user) : false;
  const open = shopOpenNow(shop?.hours, nowInKg());
  const products = useMemo(
    () => (shop ? shop.products.filter((p) => mine || publicProduct(p, shop)) : []),
    [shop, mine],
  );
  const groups = useMemo(() => (shop ? groupShopProducts(shop, products) : []), [shop, products]);
  const linked = useMemo(
    () => (shop ? allListings.filter((item) => item.shopId === shop.id && item.status !== "draft" && item.status !== "withdrawn" && item.status !== "closed" && item.status !== "hidden") : []),
    [allListings, shop],
  );

  if (!shop && !synced) return null;

  if (shop && isBlocked(shop.ownerId)) {
    return (
      <PhoneShell>
        <div className="p-6 text-[15px] text-muted">
          <ScreenBack fallback="/shops" />
          <BlockedAuthorNotice userId={shop.ownerId || ""} />
        </div>
      </PhoneShell>
    );
  }

  if (!shop || !visible) {
    return (
      <PhoneShell>
        <div className="p-6 text-[15px] text-muted">
          <ScreenBack fallback="/shops" />
          <p className="mt-4">{shop ? t.shopHidden : t.empty}</p>
        </div>
      </PhoneShell>
    );
  }

  const hoursLine = formatShopHours(shop.hours, {
    days: { mon: t.dayMon, tue: t.dayTue, wed: t.dayWed, thu: t.dayThu, fri: t.dayFri, sat: t.daySat, sun: t.daySun },
    daily: t.hoursDaily,
    allDay: t.hours24,
  });
  const cityLabel = t.cities[shop.city] || shop.city;
  const deliveryLine = shopDeliveryLine(shop, t.pointDeliveryFreeLine, t.pointDeliveryPaidLine);
  const telegramHref = telegramLink(shop.telegramUsername);

  return (
    <PhoneShell>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-1">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => goBack(router, "/shops")} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface" aria-label={t.backLeave}>
            <IconBack size={16} color="#17140F" />
          </button>
          <span className="font-display text-[15px] font-bold">{t.shopCard}</span>
          <span className="w-9" />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button type="button" onClick={() => shop.videoUrl && setPlaying(true)}>
            <ShopThumb cover={shop.coverUrl} video={shop.videoUrl} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="font-display text-[22px] font-bold leading-[1.15] text-ink">{shop.name}</h1>
              <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-screen">{t.shopBadge}</span>
            </div>
            <div className="mt-1 text-[13px] text-muted">{shop.ownerName}</div>
            {FEATURES.accountStars && mine ? (
              <div className="mt-1">
                <TrustStars n={starsForUser(user)} size={12} />
              </div>
            ) : null}
            <div className="mt-1 text-[12px] text-muted-2">{t.shopCats[shop.category]}</div>
          </div>
        </div>

        {playing && shop.videoUrl ? (
          <div className="mt-3 overflow-hidden rounded-[18px] bg-ink">
            <ShopVideo src={shop.videoUrl} poster={shop.coverUrl} />
          </div>
        ) : shop.videoUrl ? (
          <button type="button" onClick={() => setPlaying(true)} className="mt-3 h-11 w-full rounded-2xl border border-line bg-white text-[13px] font-semibold">
            {t.shopPlay}
          </button>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip active>{t.shopCats[shop.category]}</Chip>
          {(shop.kinds ?? []).map((id) => (
            <Chip key={id}>{shopKindLabel(t, id)}</Chip>
          ))}
          {shop.extraCategories.map((id) => (
            <Chip key={id}>{t.shopCats[id]}</Chip>
          ))}
        </div>

        {shop.description ? <p className="mt-3 text-[15px] leading-[1.55] text-ink-2">{shop.description}</p> : null}

        <ShopSubscribe shopId={shop.id} mine={mine} />
        <PlayBanner />

        <div className="mt-3 flex flex-wrap gap-2 overflow-x-hidden">
          {shop.contacts.phone ? (
            <a href={`tel:${shop.contacts.phone}`} className="shadow-btn flex h-[54px] min-w-[8.5rem] flex-1 items-center justify-center gap-2 rounded-2xl bg-ink text-[15px] font-semibold text-screen">
              <IconPhone size={18} color="#FFF7F0" />
              {t.callNow}
            </a>
          ) : null}
          {shop.contacts.whatsapp && shop.contacts.phone ? (
            <a href={`https://wa.me/${shop.contacts.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-2xl bg-success text-white">
              <IconWa size={18} color="#fff" />
            </a>
          ) : null}
          {telegramHref ? (
            <a href={telegramHref} target="_blank" rel="noreferrer" aria-label="Telegram" className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-2xl border border-line bg-white">
              <IconTg size={18} color="#17140F" />
            </a>
          ) : null}
        </div>
        {/* Later: «Сегодня на точке» */}
        <div data-slot="today-on-point" className="h-0 overflow-hidden" />

        <div className="mt-4 rounded-[16px] border border-line bg-white p-4">
          <div className="text-[13px] font-semibold text-ink">
            {shopHasPointPlace(shop) ? shopPlaceHeadline(shop, cityLabel, lang) : `${cityLabel}, ${shop.address}`}
          </div>
          {deliveryLine ? <div className="mt-1 text-[12px] text-muted">{deliveryLine}</div> : null}
          {open === true ? <div className="mt-1 text-[12px] font-bold text-success">{t.shopOpenNow}</div> : null}
          {open === false ? <div className="mt-1 text-[12px] font-bold text-muted">{t.shopClosedNow}</div> : null}
          {shop.hoursNote ? <div className="mt-1 text-[12px] text-muted">{shop.hoursNote}</div> : null}
          {hoursLine ? <div className="mt-1 text-[12px] text-muted">{hoursLine}</div> : null}
        </div>
        {shop.lat != null && shop.lng != null ? (
          <div className="mt-3">
            <GisOnMapCard
              city={shop.city}
              lat={shop.lat}
              lng={shop.lng}
              listingId={linked[0]?.id}
              compact
            />
          </div>
        ) : null}

        <div className="mt-3 rounded-[16px] border border-line bg-white p-4">
          <Eyebrow>{t.shopFulfillment}</Eyebrow>
          <div className="mt-2 text-[14px] text-ink">
            {shop.pickup ? t.shopPickup : null}
            {shop.pickup && shop.delivery ? " · " : null}
            {shop.delivery ? t.shopDelivery : null}
            {!shop.pickup && !shop.delivery ? t.shopAskPrice : null}
          </div>
          {shop.deliveryNote ? <p className="mt-1 text-[12px] text-muted">{shop.deliveryNote}</p> : null}
        </div>

        <div className="mt-5">
          <Eyebrow>{t.shopCatalog}</Eyebrow>
          {!products.length && !groups.length ? <p className="mt-2 text-[13px] text-muted">{t.shopNoCatalog}</p> : null}
          <div className="mt-2 flex flex-col gap-3">
            {groups.map((group) => (
              <div key={group.id}>
                {group.id !== "none" || groups.length > 1 ? (
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-2">
                    {group.id === "none" ? t.shopCatalog : shopKindLabel(t, group.id)}
                  </div>
                ) : null}
                <div className="flex flex-col gap-2">
                  {group.items.map((item) => (
                    <div key={item.id} className="flex gap-3 rounded-[16px] border border-line bg-white p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={displayPhotoForProduct(item)} alt="" className="h-16 w-16 rounded-[12px] object-cover" />
                      <div className="min-w-0 flex-1">
                      <div className="font-display text-[16px] font-bold text-ink">{item.title}</div>
                      {item.description ? <p className="mt-1 text-[13px] text-muted">{item.description}</p> : null}
                      <div className="mt-1 text-[15px] font-semibold text-accent">
                        {item.price != null ? `${formatSom(item.price)} KGS / ${t.shopUnits[item.unit]}` : t.shopAskPrice}
                      </div>
                      <div className="mt-0.5 text-[12px] text-muted">
                        {shopQtyLabel(t, item) ? `${shopQtyLabel(t, item)} · ` : ""}
                        {item.stock === "in" ? t.shopStockIn : item.stock === "out" ? t.shopStockOut : item.stock === "order" ? t.shopStockOrder : t.shopStockAsk}
                        {" · "}
                        {t.shopStockStale} {item.updatedAt.slice(0, 10)}
                      </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {linked.length ? (
          <div className="mt-5">
            <Eyebrow>{t.shopMoreFrom}</Eyebrow>
            <div className="mt-2 flex flex-col gap-2">
              {linked.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(`/listing/${item.id}`)}
                  className="rounded-[16px] border border-line bg-white px-3 py-3 text-left text-[14px] font-semibold"
                >
                  {item.title} · {formatSom(item.price)} KGS
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex">
          <ShareButton shop={shop} />
        </div>

        {mine ? (
          <div className="mt-5">
            <ShopProductsEditor shop={shop} />
            <button type="button" onClick={() => router.push(`/shops/${shop.id}/edit`)} className="mt-3 h-12 w-full rounded-2xl bg-ink text-[15px] font-semibold text-screen">
              {t.shopEdit}
            </button>
            {shop.status === "active" ? (
              <button
                type="button"
                onClick={() => void withdrawShop(shop.id)}
                className="mt-2 h-12 w-full rounded-2xl border border-line text-[15px] font-semibold"
              >
                {t.shopWithdraw}
              </button>
            ) : null}
          </div>
        ) : reports[shop.id] ? (
          <p className="mt-5 text-center text-[13px] text-muted">{t.reportThanks}</p>
        ) : (
          <button type="button" onClick={() => (user ? reportShop(shop.id, "other") : router.push("/login"))} className="mt-5 w-full text-center text-[13px] font-semibold text-muted">
            {t.shopReport}
          </button>
        )}
      </div>
    </PhoneShell>
  );
}
