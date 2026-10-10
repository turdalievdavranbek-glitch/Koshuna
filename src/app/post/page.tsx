"use client";

import { FEATURES } from "@/lib/features";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { pendingOps, subscribeOutbox } from "@/lib/api/outbox";
import { useApp } from "@/lib/store";
import { GisOnMapCard } from "@/components/gis-on-map";
import { ShareButton } from "@/components/share-button";
import { ScreenBack } from "@/components/back-button";
import { PhoneShell } from "@/components/shell";
import { Price } from "@/components/ui";
import { BusinessPost } from "@/components/post-business";
import { CardPost } from "@/components/post-card-flow";
import { ChoicePage } from "@/components/post-choice";
import { PersonalPost } from "@/components/personal-post";
import { BuyRequestForm } from "@/components/buy-request-form";

export default function PostPage() {
  const params = useSearchParams();
  const { user, ready, side, setPendingPath, setSide } = useApp();
  const router = useRouter();
  const type = params.get("type");
  const card = params.get("card");
  const published = params.get("published");

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setPendingPath(type === "request" ? "/post?type=request" : "/post");
      router.replace("/login");
      return;
    }
    if (side !== "sell") setSide("sell");
    // setPendingPath and setSide are new every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, side, router]);

  if (!ready || !user) return null;
  if (published) return <Published id={published} />;
  if (card === "cafe" || card === "developer" || card === "dealer" || card === "service") return <CardPost card={card} />;
  if (type === "request" && FEATURES.purchaseRequests) return <BuyRequestForm />;
  if (type === "personal") return <PersonalPost />;
  if (type === "business") return <BusinessPost />;
  return (
    <PhoneShell>
      <ChoicePage />
    </PhoneShell>
  );
}

function Published({ id }: { id: string }) {
  const { t, allListings, setPendingPath, pendingPath } = useApp();
  const router = useRouter();
  const published = allListings.find((item) => item.id === id);
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  useEffect(() => {
    if (!pendingPath?.startsWith("/restaurants/quick")) return;
    const next = pendingPath;
    setPendingPath(null);
    router.push(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return subscribeOutbox((snap) => {
      const mine = pendingOps().some((op) => op.kind !== "putShop" && op.listingId === id && !op.failed);
      const localMedia = Boolean(
        published &&
          [published.videoUrl, published.voiceUrl, ...published.photos].some(
            (url) => !!url && (url.startsWith("blob:") || url.startsWith("data:") || url.startsWith("kmedia:")),
          ),
      );
      setUploadPending(mine || localMedia);
      const total = snap.sending?.total ?? 0;
      setUploadPct(total > 0 ? Math.min(100, Math.round(((snap.sending?.sent ?? 0) / total) * 100)) : 0);
    });
  }, [id, published]);

  return (
    <PhoneShell>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-2">
        <ScreenBack fallback="/" />
        <div className="mt-4 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-tint text-2xl text-success">✓</div>
          <h2 className="mt-5 font-display text-[26px] font-bold text-ink">{t.published}</h2>
          <p className="mt-2 text-[15px] leading-[1.5] text-muted">{uploadPending ? t.publishedPendingHint : t.publishedHint}</p>
          {uploadPending ? (
            <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-chip">
              <div className="h-full bg-accent" style={{ width: `${uploadPct}%` }} />
            </div>
          ) : null}
        </div>
        {published?.lat != null && published.lng != null ? (
          <div className="mt-6">
            <GisOnMapCard city={published.city} lat={published.lat} lng={published.lng} listingId={published.id} label={`${published.price} KGS`} showHint />
          </div>
        ) : null}
        {published ? (
          <div className="mt-6 rounded-[18px] border border-line bg-white p-4">
            <div className="flex">
              <ShareButton listing={published} />
            </div>
            <div className="mt-3">
              <Price listing={published} large />
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => router.push(`/listing/${id}`)}
          className="shadow-btn mt-6 h-[54px] w-full rounded-2xl bg-accent text-base font-semibold text-accent-on"
        >
          {t.viewListing}
        </button>
      </div>
    </PhoneShell>
  );
}

