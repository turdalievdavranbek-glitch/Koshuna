"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { groupCart } from "@/lib/cart";
import { listingTitle } from "@/lib/i18n";
import { useApp } from "@/lib/store";
import type { Listing } from "@/lib/types";
import { IconPhone } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { Photo, Price } from "@/components/ui";

export default function FavoritesPage() {
  const { t, lang, user, ready, synced, favouriteIds, allListings, shops, toggleFav, setPendingPath, isBlocked } = useApp();
  const { listings, pending } = useCartListings(favouriteIds, allListings, synced, isBlocked);
  const groups = groupCart(listings, shops, { personal: t.cartPersonal, point: t.cartPoint });
  const showEmpty = ready && !pending && listings.length === 0 && (!user || synced);

  return (
    <PhoneShell tab>
      <div className="px-5 pt-2">
        <h1 className="font-display text-[28px] font-extrabold tracking-[-0.02em] text-ink">{t.fav}</h1>
      </div>
      <div className="sc mt-4 min-h-0 flex-1 overflow-y-auto px-5 pb-6">
        {showEmpty ? (
          <div data-testid="cart-empty" className="mt-10 text-center">
            <p className="text-[15px] text-muted">{t.cartEmpty}</p>
            <Link href="/" data-testid="cart-feed" className="mt-3 inline-block text-[15px] font-semibold text-accent">
              {t.cartToFeed}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {groups.map((group) => (
              <section key={group.id} data-testid="cart-group" data-point={group.id}>
                <h2 className="px-1 text-[13px] font-bold text-ink">{group.title}</h2>
                <div className="mt-2 flex flex-col gap-2 desk:grid desk:grid-cols-2">
                  {group.listings.map((listing) => (
                    <CartRow
                      key={listing.id}
                      listing={listing}
                      title={listingTitle(listing, lang)}
                      callLabel={t.callNow}
                      removeLabel={t.cartRemove}
                      noPhoneLabel={t.cartNoPhone}
                      onRemove={() => toggleFav(listing.id)}
                      onNeedSignIn={() => setPendingPath("/favorites")}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </PhoneShell>
  );
}

function useCartListings(
  ids: string[],
  catalog: Listing[],
  synced: boolean,
  isBlocked: (ownerId?: string | null) => boolean,
) {
  const [extra, setExtra] = useState<Listing[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const missingKey = ids.filter((id) => !catalog.some((item) => item.id === id)).join("\n");

  useEffect(() => {
    if (!missingKey) {
      setExtra([]);
      setLoadedKey("");
      return;
    }
    if (!synced) return;
    let cancel = false;
    const wanted = missingKey.split("\n");
    void Promise.all(wanted.map((id) => api<{ listing?: Listing }>(`/api/listings/${encodeURIComponent(id)}`))).then((results) => {
      if (cancel) return;
      setExtra(results.flatMap((res) => (res.ok && res.data?.listing?.id ? [res.data.listing] : [])));
      setLoadedKey(missingKey);
    });
    return () => {
      cancel = true;
    };
  }, [synced, missingKey]);

  const byId = new Map<string, Listing>();
  for (const item of catalog) byId.set(item.id, item);
  for (const item of extra) {
    if (!byId.has(item.id) && !isBlocked(item.ownerId)) byId.set(item.id, item);
  }
  const listings = ids.map((id) => byId.get(id)).filter((item): item is Listing => Boolean(item));
  const pending = missingKey !== "" && loadedKey !== missingKey;
  return { listings, pending };
}

function CartRow({
  listing,
  title,
  callLabel,
  removeLabel,
  noPhoneLabel,
  onRemove,
  onNeedSignIn,
}: {
  listing: Listing;
  title: string;
  callLabel: string;
  removeLabel: string;
  noPhoneLabel: string;
  onRemove: () => void;
  onNeedSignIn: () => void;
}) {
  const { user } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);

  const call = async () => {
    if (!user) {
      onNeedSignIn();
      router.push("/login");
      return;
    }
    setBusy(true);
    setMissing(false);
    try {
      const res = await api<{ phone?: string | null }>(`/api/listings/${encodeURIComponent(listing.id)}/contact`);
      if (res.status === 401) {
        onNeedSignIn();
        router.push("/login");
        return;
      }
      const phone = res.ok ? res.data?.phone : null;
      if (!phone) {
        setMissing(true);
        return;
      }
      window.location.href = `tel:${phone}`;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="cart-row" className="flex gap-3 rounded-[16px] border border-line bg-white p-2.5">
      <Link href={`/listing/${listing.id}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[12px] bg-chip">
        {listing.photos[0] ? <Photo src={listing.photos[0]} alt="" /> : null}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/listing/${listing.id}`} className="block truncate text-[15px] font-semibold text-ink">
          {title}
        </Link>
        <div className="mt-0.5">
          <Price listing={listing} compact />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <button
            type="button"
            data-testid="cart-call"
            disabled={busy}
            onClick={() => void call()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-ink px-3 text-[13px] font-semibold text-screen disabled:opacity-60"
          >
            <IconPhone size={15} color="#F7F3EC" />
            {callLabel}
          </button>
          <button type="button" data-testid="cart-remove" onClick={onRemove} className="inline-flex h-9 items-center px-2 text-[13px] font-semibold text-muted">
            {removeLabel}
          </button>
        </div>
        {missing ? <p className="mt-1 text-[12px] text-muted">{noPhoneLabel}</p> : null}
      </div>
    </div>
  );
}
