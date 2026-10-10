"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCircleList } from "@/components/neighbor-circles";
import { ReportListing } from "@/components/report-listing";
import { ShareButton } from "@/components/share-button";
import { PhoneShell } from "@/components/shell";
import { IconBack, IconLike } from "@/components/icons";
import { Photo } from "@/components/ui";
import { circleScopeFrom, listingInCircleScope, reelsFeed } from "@/lib/circles";
import { formatSom } from "@/lib/data";
import { listingHasPrice } from "@/lib/deal";
import { goBack } from "@/lib/go-back";
import { listingTitle } from "@/lib/i18n";
import { PINNED_REEL_ID, pinnedMedia, pinnedTitle, type PinnedCircle } from "@/lib/pinned-circle";
import { socialCounts } from "@/lib/reactions";
import { listingsForSearch } from "@/lib/search-browse";
import { listingPlace } from "@/lib/share";
import { useApp } from "@/lib/store";
import { usePinnedCircle } from "@/lib/use-pinned-circle";
import type { Listing } from "@/lib/types";
import { isVideoListing } from "@/lib/video-ai";
import { ReelVideo } from "@/components/reel-video";
import { CommentsButton, CommentsSheet } from "@/components/listing-comments";
import { FEATURES } from "@/lib/features";
import { reportListingView } from "@/lib/listing-view";

const BATCH = 4;

function ReelSlide({
  listing,
  active,
  preloadNext,
  onVisible,
}: {
  listing: Listing;
  active: boolean;
  preloadNext: boolean;
  onVisible: () => void;
}) {
  const { t, lang, user, setPendingPath, reactionOf, setReaction, reactions } = useApp();
  const router = useRouter();
  const rootRef = useRef<HTMLElement>(null);
  const [sound, setSound] = useState(false);
  const [comments, setComments] = useState(false);
  const video = isVideoListing(listing) && Boolean(listing.videoUrl);
  const title = listingTitle(listing, lang);
  const place = listingPlace(listing, t, lang);
  const price = listingHasPrice(listing) ? formatSom(listing.price) : t.priceNegotiable;
  const reaction = reactionOf(listing.id);
  const likes = socialCounts(listing.id, reactions, 0).likes;

  useEffect(() => {
    if (!active) setSound(false);
  }, [active]);

  useEffect(() => {
    if (active && listing.id !== PINNED_REEL_ID) void reportListingView(listing.id);
  }, [active, listing.id]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.6)) onVisible();
      },
      { root: node.parentElement, threshold: [0.6] },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [onVisible]);

  const like = () => {
    if (!user) {
      setPendingPath(`/reels?id=${encodeURIComponent(listing.id)}`);
      router.push("/login");
      return;
    }
    setReaction(listing.id, "like");
  };

  return (
    <article ref={rootRef} data-testid="reel-slide" className="relative h-full min-h-full w-full shrink-0 snap-start snap-always bg-ink">
      {video ? (
        <ReelVideo
          listing={listing}
          active={active}
          preloadNext={preloadNext}
          sound={sound}
          onToggleSound={() => {
            if (active) setSound((value) => !value);
          }}
        />
      ) : (
        <Photo src={listing.photos[0]} alt={title} className="absolute inset-0" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgba(23,20,15,.45)] via-transparent to-[rgba(23,20,15,.78)]" />
      <div className="absolute top-0 right-0 left-0 z-10 flex items-center justify-between px-3" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <button
          type="button"
          data-testid="screen-back"
          aria-label={t.backLeave}
          onClick={() => goBack(router, "/")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/92"
        >
          <IconBack size={16} color="#17140F" />
        </button>
        {video ? (
          <button
            type="button"
            onClick={() => setSound((value) => !value)}
            className="rounded-full bg-white/92 px-3 py-1.5 text-[12px] font-semibold text-ink"
          >
            {sound ? t.reelSoundOn : t.reelSoundOff}
          </button>
        ) : (
          <span />
        )}
      </div>
      <div className="absolute right-3 bottom-6 z-10 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={like}
          data-testid="react-like"
          aria-label={t.likeLabel}
          aria-pressed={reaction === "like"}
          className="flex flex-col items-center gap-0.5"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/92">
            <IconLike size={20} color={reaction === "like" ? "#2A6B57" : "#17140F"} filled={reaction === "like"} />
          </span>
          <span className="text-[12px] font-semibold text-white tabular-nums">{likes}</span>
        </button>
        {FEATURES.comments ? <CommentsButton listingId={listing.id} variant="reel" onOpen={() => setComments(true)} /> : null}
        <ShareButton listing={listing} variant="icon" />
      </div>
      {comments ? <CommentsSheet listingId={listing.id} title={title} onClose={() => setComments(false)} /> : null}
      <div className="absolute right-16 bottom-0 left-0 z-10 px-4 pb-6">
        <div className="truncate font-display text-[22px] font-bold text-white">{title}</div>
        <div className="mt-1 text-[16px] font-semibold text-white">{price}</div>
        <div className="mt-0.5 truncate text-[13px] text-white/85">{place}</div>
        <Link href={`/listing/${listing.id}`} className="mt-3 inline-flex h-11 items-center rounded-2xl bg-accent px-4 text-[15px] font-semibold text-accent-on">
          {t.reelOpen}
        </Link>
        <div className="mt-2">
          <ReportListing listing={listing} sheet returnTo={`/reels?id=${encodeURIComponent(listing.id)}`} />
        </div>
      </div>
    </article>
  );
}

function PinnedReel({
  src,
  poster,
  active,
  sound,
  videoRef,
  onToggleSound,
  onBlocked,
}: {
  src: string;
  poster: string | null;
  active: boolean;
  sound: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  onToggleSound: () => void;
  onBlocked: () => void;
}) {
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!active) {
      el.pause();
      return;
    }
    let cancelled = false;
    el.muted = !sound;
    void el.play().catch(() => {
      if (cancelled || el.muted) return;
      el.muted = true;
      onBlocked();
    });
    return () => {
      cancelled = true;
    };
  }, [active, sound, src, onBlocked, videoRef]);

  return (
    <video
      key={src}
      ref={videoRef}
      src={src}
      poster={poster ?? undefined}
      muted={!sound}
      playsInline
      loop
      autoPlay={active}
      preload="auto"
      className="absolute inset-0 h-full w-full object-cover"
      onClick={onToggleSound}
    />
  );
}

/** Owner address: sound on (the circle tap is the gesture). Share the app only. */
function PinnedReelSlide({ pinned, active, onVisible }: { pinned: PinnedCircle; active: boolean; onVisible: () => void }) {
  const { t, lang } = useApp();
  const router = useRouter();
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sound, setSound] = useState(true);
  const title = pinnedTitle(pinned, lang);
  const clip = pinnedMedia(pinned, lang);
  const blockSound = useRef(() => setSound(false));
  const toggleSound = () => {
    if (!active) return;
    const next = !sound;
    const el = videoRef.current;
    if (el) {
      el.muted = !next;
      void el.play().catch(() => undefined);
    }
    setSound(next);
  };

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.6)) onVisible();
      },
      { root: node.parentElement, threshold: [0.6] },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [onVisible]);

  return (
    <article ref={rootRef} data-testid="reel-pinned" className="relative h-full min-h-full w-full shrink-0 snap-start snap-always bg-ink">
      <PinnedReel
        src={clip.videoUrl}
        poster={clip.posterUrl}
        active={active}
        sound={sound}
        videoRef={videoRef}
        onToggleSound={toggleSound}
        onBlocked={blockSound.current}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgba(23,20,15,.45)] via-transparent to-[rgba(23,20,15,.78)]" />
      <div className="absolute top-0 right-0 left-0 z-10 flex items-center justify-between px-3" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <button
          type="button"
          data-testid="screen-back"
          aria-label={t.backLeave}
          onClick={() => goBack(router, "/")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/92"
        >
          <IconBack size={16} color="#17140F" />
        </button>
        <button type="button" onClick={toggleSound} className="rounded-full bg-white/92 px-3 py-1.5 text-[12px] font-semibold text-ink">
          {sound ? t.reelSoundOn : t.reelSoundOff}
        </button>
      </div>
      <div className="absolute right-3 bottom-6 z-10 flex flex-col items-center gap-3">
        <ShareButton variant="icon" appTitle={title} />
      </div>
      <div className="absolute right-16 bottom-0 left-0 z-10 px-4 pb-6">
        <div className="truncate font-display text-[22px] font-bold text-white">{title}</div>
      </div>
    </article>
  );
}

type FeedRow = { kind: "pinned"; pinned: PinnedCircle } | { kind: "listing"; listing: Listing };

export default function ReelsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const startId = params.get("id") || "";
  const { t, city, filters, allListings, shops } = useApp();
  const circles = useCircleList();
  const { pinned } = usePinnedCircle();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(BATCH);
  const [current, setCurrent] = useState(0);
  const scope = useMemo(
    () => circleScopeFrom(city, filters.city, filters.oblast),
    [city, filters.city, filters.oblast],
  );

  const feed = useMemo(() => {
    const region = listingsForSearch(allListings, shops).filter((item) => listingInCircleScope(item, scope));
    const openedPin = startId === PINNED_REEL_ID;
    const listings = reelsFeed(openedPin ? "" : startId, circles, region);
    const rows: FeedRow[] = listings.map((listing) => ({ kind: "listing", listing }));
    if (pinned && openedPin) return [{ kind: "pinned" as const, pinned }, ...rows];
    return rows;
  }, [allListings, circles, pinned, scope, shops, startId]);

  useEffect(() => {
    setShown(BATCH);
    setCurrent(0);
    const node = scrollerRef.current;
    if (node) node.scrollTop = 0;
  }, [startId]);

  useEffect(() => {
    if (startId !== PINNED_REEL_ID) return;
    setCurrent(0);
    const node = scrollerRef.current;
    if (node) node.scrollTop = 0;
  }, [startId, pinned?.videoUrl]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || shown >= feed.length) return;
    const sentinel = root.querySelector("[data-reel-more]");
    if (!(sentinel instanceof Element)) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setShown((count) => Math.min(feed.length, count + BATCH));
      },
      { root, rootMargin: "120px" },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [shown, feed.length]);

  const visible = feed.slice(0, shown);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const wide = () => window.matchMedia("(min-width: 1024px)").matches && !document.documentElement.classList.contains("native");
    let lock = false;
    const step = (dir: number) => {
      if (!wide() || lock || !feed.length) return;
      const height = root.clientHeight || 1;
      const index = Math.round(root.scrollTop / height);
      const next = Math.min(feed.length - 1, Math.max(0, index + dir));
      lock = true;
      root.scrollTo({ top: next * height, behavior: "smooth" });
      window.setTimeout(() => {
        lock = false;
      }, 450);
    };
    const onWheel = (event: WheelEvent) => {
      if (!wide() || Math.abs(event.deltaY) < 8) return;
      event.preventDefault();
      step(event.deltaY > 0 ? 1 : -1);
    };
    const onKey = (event: KeyboardEvent) => {
      if (!wide()) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      step(event.key === "ArrowDown" ? 1 : -1);
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [feed.length]);

  return (
    <PhoneShell>
      <div className="contents desk:flex desk:h-full desk:items-center desk:justify-center desk:bg-ink">
      <div ref={scrollerRef} data-testid="reels" className="h-full min-h-0 snap-y snap-mandatory overflow-y-auto overscroll-y-contain desk:aspect-[9/16] desk:h-full desk:max-h-full desk:w-auto desk:max-w-[420px] desk:shrink-0 desk:overflow-x-hidden">
        {visible.length === 0 ? (
          <div className="flex h-full flex-col bg-ink px-5 text-white" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
            <button
              type="button"
              data-testid="screen-back"
              aria-label={t.backLeave}
              onClick={() => goBack(router, "/")}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/92"
            >
              <IconBack size={16} color="#17140F" />
            </button>
            <p className="mt-6 text-[15px] leading-[1.4]">{t.homeCirclesEmpty}</p>
          </div>
        ) : (
          visible.map((item, index) =>
            item.kind === "pinned" ? (
              <PinnedReelSlide key={item.pinned.id} pinned={item.pinned} active={index === current} onVisible={() => setCurrent(index)} />
            ) : (
              <ReelSlide
                key={item.listing.id}
                listing={item.listing}
                active={index === current}
                preloadNext={index === current + 1}
                onVisible={() => setCurrent(index)}
              />
            ),
          )
        )}
        {shown < feed.length ? <div data-reel-more className="h-px w-full shrink-0" /> : null}
      </div>
      </div>
    </PhoneShell>
  );
}
