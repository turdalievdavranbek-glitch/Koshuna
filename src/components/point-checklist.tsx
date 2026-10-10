"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasShopHours, shopHasPointPlace } from "@/lib/shops";
import { useApp } from "@/lib/store";
import type { Shop } from "@/lib/types";
import { POINT_NEW_KEY } from "./point-quick-form";

/** Owner-only, non-blocking hints for what a fresh point still lacks. */
export function PointChecklist({ shop }: { shop: Shop }) {
  const { t, allListings } = useApp();
  const router = useRouter();
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(POINT_NEW_KEY) === shop.id) {
        setFresh(true);
        sessionStorage.removeItem(POINT_NEW_KEY);
      }
    } catch {
      /* private mode */
    }
  }, [shop.id]);

  const edit = `/shops/${shop.id}/edit`;
  const kind = shop.venueKind ?? "shop";
  const hasCard = (section: string) =>
    allListings.some((item) => item.ownerId === shop.ownerId && item.section === section && item.status !== "hidden" && item.status !== "withdrawn");
  const openCard = (card: "service" | "cafe") => {
    const carry = {
      title: shop.name || undefined,
      phone: shop.contacts.phone || undefined,
      photo: shop.coverUrl || undefined,
      photos: shop.coverUrl ? [shop.coverUrl] : undefined,
      address: shop.address || undefined,
      hours: shop.hours,
      city: shop.city && shop.city !== "all" ? shop.city : undefined,
      lat: shop.lat,
      lng: shop.lng,
      mediaKind: shop.coverUrl ? ("photos" as const) : undefined,
    };
    try {
      sessionStorage.setItem("konshu-service-carry", JSON.stringify(carry));
    } catch {
      /* private mode */
    }
    router.push(`/post?card=${card}`);
  };
  const items = [
    { id: "photo", done: Boolean(shop.coverUrl || shop.videoUrl), label: t.pointTodoPhoto, href: edit },
    { id: "hours", done: hasShopHours(shop.hours) || Boolean(shop.hoursNote?.trim()), label: t.pointTodoHours, href: edit },
    { id: "desc", done: Boolean(shop.description?.trim()), label: t.pointTodoDesc, href: edit },
    { id: "place", done: shopHasPointPlace(shop) || Boolean(shop.address?.trim()), label: t.pointTodoPlace, href: edit },
    kind === "service"
      ? { id: "services", done: hasCard("services"), label: t.pointTodoServices, href: "", run: () => openCard("service") }
      : kind === "cafe"
        ? { id: "menu", done: hasCard("restaurants"), label: t.pointTodoMenu, href: "", run: () => openCard("cafe") }
        : { id: "product", done: (shop.products ?? []).length > 0, label: t.pointTodoProduct, href: `/shops/quick?shop=${shop.id}` },
  ] as Array<{ id: string; done: boolean; label: string; href: string; run?: () => void }>;
  const left = items.filter((item) => !item.done);
  if (!left.length && !fresh) return null;

  return (
    <div data-testid="point-checklist" className="mt-3 rounded-[16px] border border-accent bg-white p-4 desk:col-span-12">
      {fresh ? <div className="font-display text-[17px] font-bold text-ink">✓ {t.pointNewDone}</div> : null}
      {left.length ? (
        <>
          <p className={`${fresh ? "mt-1 " : ""}text-[13px] font-semibold leading-[1.4] text-ink`}>{t.pointTodoTitle}</p>
          <div className="mt-2 flex flex-col gap-1.5">
            {left.map((item) => (
              <button
                key={item.id}
                type="button"
                data-testid={`point-todo-${item.id}`}
                onClick={() => (item.run ? item.run() : router.push(item.href))}
                className="flex h-10 items-center justify-between rounded-xl border border-line bg-surface px-3 text-left text-[13px] font-semibold text-ink"
              >
                <span className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 rounded-full border border-line bg-white" />
                  {item.label}
                </span>
                <span className="text-accent">+</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-muted">{t.pointTodoLater}</p>
        </>
      ) : null}
    </div>
  );
}
