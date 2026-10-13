"use client";

import { MasterBadge } from "@/components/master-badge";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatSom } from "@/lib/data";
import { displayPhotoForProduct } from "@/lib/shop-photos";
import { canSeeShop, shopCallPhone, formatShopHours, groupShopProducts, isOwnShop, nowInKg, publicProduct, shopDeliveryLine, shopHasPointPlace, shopPlaceHeadline, shopOpenNow } from "@/lib/shops";
import { shopKindLabel, shopQtyLabel } from "@/lib/shop-copy";
import { telegramLink } from "@/lib/telegram-username";
import { isDbUserId } from "@/lib/phone";
import { api } from "@/lib/api/client";
import { useApp } from "@/lib/store";
import { PhoneShell } from "@/components/shell";
import { ShopProductsEditor } from "@/components/shop-products";
import { ShopThumb, ShopVideo } from "@/components/shop-thumb";
import { Chip, Eyebrow } from "@/components/ui";
import { TrustStars } from "@/components/trust-stars";
import { FEATURES } from "@/lib/features";
import { GisOnMapCard } from "@/components/gis-on-map";
import { TodayOnPoint } from "@/components/magnets";
import { starsForUser } from "@/lib/trust";
import { ScreenBack } from "@/components/back-button";
import { BlockedAuthorNotice } from "@/components/block-author";
import { PlayBanner } from "@/components/play-banner";
import { PointChecklist } from "@/components/point-checklist";
import { ShareButton } from "@/components/share-button";
import { PointTransfer } from "@/components/point-transfer";
import { ShopSubscribe } from "@/components/shop-subscribe";
import { IconBack, IconPhone, IconTg, IconWa } from "@/components/icons";
import { goBack } from "@/lib/go-back";
import { socialCounts } from "@/lib/reactions";
import { ListingThumb } from "@/components/listing-media";

export default function ShopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, lang, shops, user, allListings, reactions, withdrawShop, reportShop, reports, synced, recallShop, isBlocked } = useApp();
  const shop = recallShop(id) ?? shops.find((item) => item.id === id);
  const [playing, setPlaying] = useState(false);
  const [followers, setFollowers] = useState<number | null>(null);

  const mine = shop ? isOwnShop(shop, user) : false;
  const callPhone = shop ? shopCallPhone(shop) : "";
  const visible = shop ? canSeeShop(shop, user) : false;
  const open = shopOpenNow(shop?.hours, nowInKg());
  const products = useMemo(
    () => (shop ? shop.products.filter((p) => mine || publicProduct(p, shop)) : []),
    [shop, mine],
  );
  const groups = useMemo(() => (shop ? groupShopProducts(shop, products) : []), [shop, products]);
  const linked = useMemo(
    () => (shop ? allListings.filter((item) => item.shopId === shop.id && !item.underReview && item.status !== "draft" && item.status !== "withdrawn" && item.status !== "closed" && item.status !== "hidden") : []),
    [allListings, shop],
  );

  const postCount = linked.length || products.length;
  const likeSum = useMemo(() => linked.reduce((sum, item) => sum + socialCounts(item.id, reactions, 0).likes, 0), [linked, reactions]);

  // No Telegram on the point: fall back to the owner's own Telegram from their profile.
  const [ownerTelegram, setOwnerTelegram] = useState<string | null>(null);
  const ownerId = shop && !shop.telegramUsername && isDbUserId(shop.ownerId) ? shop.ownerId : null;
  useEffect(() => {
    setOwnerTelegram(null);
    if (!ownerId) return;
    let cancel = false;
    void api<{ telegram?: string | null }>(`/api/users/${encodeURIComponent(ownerId)}`).then((res) => {
      if (!cancel) setOwnerTelegram(res.ok ? res.data?.telegram || null : null);
    });
    return () => {
      cancel = true;
    };
  }, [ownerId]);

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
  const telegramHref = telegramLink(shop.telegramUsername) ?? telegramLink(ownerTelegram);

  return (
    <PhoneShell>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-1">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => goBack(router, "/shops")} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface" aria-label={t.backLeave}>
            <IconBack size={16} color="#2A2550" />
          </button>
          <span className="font-display text-[15px] font-bold">{t.shopCard}</span>
          <span className="w-9" />
        </div>

        <div className="contents desk:mt-3 desk:grid desk:grid-cols-12 desk:items-start desk:gap-4">
        <div className="mt-3 desk:col-span-5 desk:row-start-1 desk:mt-0">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => shop.videoUrl && setPlaying(true)}
              className="shrink-0 rounded-full bg-[conic-gradient(from_200deg,#7C5CFF,#FF6FB5,#FFB86B,#7C5CFF)] p-[3px]"
            >
              <span className="block overflow-hidden rounded-full border-[3px] border-white [&_*]:!rounded-full">
                <ShopThumb cover={shop.coverUrl} video={shop.videoUrl} />
              </span>
            </button>
            <div className="grid flex-1 grid-cols-3 text-center" data-testid="shop-stats">
              <div>
                <div className="font-display text-[18px] font-extrabold text-ink tabular-nums">{postCount}</div>
                <div className="text-[11px] text-muted">{t.igPosts}</div>
              </div>
              <div>
                <div className="font-display text-[18px] font-extrabold text-ink tabular-nums">{followers ?? "·"}</div>
                <div className="text-[11px] text-muted">{t.igFollowers}</div>
              </div>
              <div>
                <div className="font-display text-[18px] font-extrabold text-ink tabular-nums">{likeSum}</div>
                <div className="text-[11px] text-muted">{t.igLikes}</div>
              </div>
            </div>
          </div>
          <div className="mt-3 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="font-display text-[19px] font-bold leading-[1.15] text-ink">{shop.name}</h1>
              <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-screen">{t.shopBadge}</span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
              <span>{shop.managedFor?.name || shop.ownerName}</span>
              <MasterBadge userId={shop.ownerId} />
              <span className="text-muted-2">· {t.shopCats[shop.category]}</span>
            </div>
            {shop.managedFor?.phone ? (
              <div className="mt-1.5 inline-block rounded-md bg-surface px-2 py-0.5 text-[11px] font-semibold text-ink-2">{t.managedBadge}</div>
            ) : null}
            {FEATURES.accountStars && mine ? (
              <div className="mt-1">
                <TrustStars n={starsForUser(user)} size={12} />
              </div>
            ) : null}
            {shop.underReview ? (
              <div className="mt-1.5 inline-block rounded-md bg-[#F6E3D4] px-2 py-0.5 text-[10px] font-bold text-ink">{t.underReview}</div>
            ) : null}
            {shop.description ? <p className="mt-1.5 whitespace-pre-line text-[14px] leading-[1.45] text-ink-2">{shop.description}</p> : null}
            <div className="mt-1 text-[13px] text-ink-2">
              📍 {shopHasPointPlace(shop) ? shopPlaceHeadline(shop, cityLabel, lang) : [cityLabel, shop.address?.trim()].filter(Boolean).join(", ")}
            </div>
            {hoursLine || open != null ? (
              <div className="mt-0.5 text-[13px] text-ink-2">
                🕒 {open === true ? <b className="text-success">{t.shopOpenNow}</b> : open === false ? <b className="text-muted">{t.shopClosedNow}</b> : null}
                {open != null && hoursLine ? " · " : null}
                {hoursLine}
              </div>
            ) : null}
          </div>
          <div className="mt-1 flex items-center gap-2 [&>div]:mt-0">
            <ShopSubscribe shopId={shop.id} mine={mine} onCount={setFollowers} hideCount />
            {!mine && linked[0] ? (
              <button
                type="button"
                data-testid="shop-write"
                onClick={() => router.push(`/chat/open/${linked[0].id}`)}
                className="mt-3 h-11 flex-1 rounded-2xl border border-line bg-white px-4 text-[14px] font-semibold text-ink"
              >
                {t.igWrite}
              </button>
            ) : null}
          </div>
        </div>

        {playing && shop.videoUrl ? (
          <div className="mt-3 overflow-hidden rounded-[18px] bg-ink desk:col-span-12">
            <ShopVideo src={shop.videoUrl} poster={shop.coverUrl} />
          </div>
        ) : shop.videoUrl ? (
          <button type="button" onClick={() => setPlaying(true)} className="mt-3 h-11 w-full rounded-2xl border border-line bg-white text-[13px] font-semibold desk:col-span-12">
            {t.shopPlay}
          </button>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-1.5 desk:col-span-12">
          <Chip active>{t.shopCats[shop.category]}</Chip>
          {shop.kindOther?.trim() ? <Chip>{shop.kindOther}</Chip> : null}
          {(shop.kinds ?? []).map((id) => (
            <Chip key={id}>{shopKindLabel(t, id)}</Chip>
          ))}
          {shop.extraCategories.map((id) => (
            <Chip key={id}>{t.shopCats[id]}</Chip>
          ))}
        </div>

        {mine && FEATURES.pointSetupHints ? <PointChecklist shop={shop} /> : null}

        <div className="desk:col-span-12">
          <PlayBanner />
        </div>

        <div className="mt-3 flex flex-wrap gap-2 overflow-x-hidden desk:col-span-3 desk:col-start-10 desk:row-start-1 desk:mt-0 desk:flex-col">
          {callPhone ? (
            <a href={`tel:${callPhone}`} className="shadow-btn flex h-[54px] min-w-[8.5rem] flex-1 items-center justify-center gap-2 rounded-2xl bg-ink text-[15px] font-semibold text-screen">
              <IconPhone size={18} color="#FFFFFF" />
              {t.callNow}
            </a>
          ) : null}
          {callPhone && (shop.contacts.whatsapp || shop.managedFor?.phone) ? (
            <a href={`https://wa.me/${callPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-2xl bg-success text-white">
              <IconWa size={18} color="#fff" />
            </a>
          ) : null}
          {telegramHref ? (
            <a href={telegramHref} target="_blank" rel="noreferrer" aria-label="Telegram" className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-2xl border border-line bg-white">
              <IconTg size={18} color="#2A2550" />
            </a>
          ) : null}
        </div>
        <div className="desk:col-span-12">
          <TodayOnPoint shopId={shop.id} />
        </div>

        {deliveryLine || shop.hoursNote ? (
          <div className="mt-4 rounded-[16px] border border-line bg-white p-4 desk:col-span-4 desk:col-start-6 desk:row-start-1 desk:mt-0">
            {deliveryLine ? <div className="text-[12px] text-muted">{deliveryLine}</div> : null}
            {shop.hoursNote ? <div className={`${deliveryLine ? "mt-1 " : ""}text-[12px] text-muted`}>{shop.hoursNote}</div> : null}
          </div>
        ) : null}
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
                <div className="flex flex-col gap-2 desk:grid desk:grid-cols-4">
                  {group.items.map((item) => (
                    <div key={item.id} className="flex gap-3 rounded-[16px] border border-line bg-white p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={displayPhotoForProduct(item)} alt="" className="h-16 w-16 rounded-[12px] object-cover" />
                      <div className="min-w-0 flex-1">
                      <div className="font-display text-[16px] font-bold text-ink">{item.title}</div>
                      {item.description ? <p className="mt-1 text-[13px] text-muted">{item.description}</p> : null}
                      <div className="mt-1 text-[15px] font-semibold text-accent">
                        {item.price != null ? `${formatSom(item.price)} сом / ${t.shopUnits[item.unit]}` : t.shopAskPrice}
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
            <div className="mt-2 grid grid-cols-3 gap-[3px] overflow-hidden rounded-[14px] desk:grid-cols-4" data-testid="shop-grid">
              {linked.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(`/listing/${item.id}`)}
                  className="relative aspect-square overflow-hidden bg-surface [&_img]:h-full [&_img]:w-full [&_img]:object-cover"
                  aria-label={item.title}
                >
                  <ListingThumb listing={item} alt={item.title} compact className="!h-full !w-full" />
                  <span className="absolute bottom-1 left-1 rounded-md bg-[rgba(42,37,80,.72)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {formatSom(item.price)} сом
                  </span>
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
            {isDbUserId(shop.ownerId) ? <PointTransfer shop={shop} /> : null}
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
