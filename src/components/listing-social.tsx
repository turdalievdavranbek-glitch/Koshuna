"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FEATURES } from "@/lib/features";
import { socialCounts } from "@/lib/reactions";
import { useApp } from "@/lib/store";
import type { Listing } from "@/lib/types";
import { useCommentCount } from "@/lib/comment-counts";
import { IconChat, IconDislike, IconLike } from "@/components/icons";
import { CommentsButton, CommentsSheet } from "@/components/listing-comments";

export function ListingSocialMeta({
  listingId,
  size = "md",
  align = "start",
}: {
  listingId: string;
  size?: "sm" | "md" | "lg";
  align?: "start" | "center";
}) {
  const { reactions } = useApp();
  const commentCount = useCommentCount(listingId);
  const { likes, dislikes, comments } = socialCounts(listingId, reactions, FEATURES.comments ? commentCount : 0);
  const icon = size === "sm" ? 11 : size === "lg" ? 14 : 12;
  const text = size === "sm" ? "text-[9px]" : size === "lg" ? "text-[12px]" : "text-[11px]";
  const gap = size === "sm" ? "gap-1.5" : "gap-2.5";

  return (
    <div
      aria-hidden
      className={`pointer-events-none mt-1 flex flex-wrap items-center select-none ${gap} ${text} font-semibold text-muted-2 ${
        align === "center" ? "justify-center" : ""
      }`}
    >
      <span className="inline-flex min-w-0 items-center gap-0.5">
        <IconLike size={icon} color="#6E6558" />
        <span className="tabular-nums">{likes}</span>
      </span>
      <span className="inline-flex min-w-0 items-center gap-0.5">
        <IconDislike size={icon} color="#6E6558" />
        <span className="tabular-nums">{dislikes}</span>
      </span>
      {FEATURES.comments ? (
        <span className="inline-flex min-w-0 items-center gap-0.5">
          <IconChat size={icon} color="#6E6558" />
          <span className="tabular-nums">{comments}</span>
        </span>
      ) : null}
    </div>
  );
}

export function ListingSocial({ listing }: { listing: Listing }) {
  const { t, user, setPendingPath, reactionOf, setReaction, reactions, lang } = useApp();
  const router = useRouter();
  const [sheet, setSheet] = useState(false);

  const reaction = reactionOf(listing.id);
  const { likes, dislikes } = socialCounts(listing.id, reactions, 0);

  const gate = () => {
    if (!user) {
      setPendingPath(`/listing/${listing.id}`);
      router.push("/login");
      return false;
    }
    return true;
  };

  const react = (value: "like" | "dislike") => {
    if (!gate()) return;
    setReaction(listing.id, value);
  };

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => react("like")}
          data-testid="react-like"
          aria-label={t.likeLabel}
          aria-pressed={reaction === "like"}
          title={t.likeLabel}
          className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] border text-[14px] font-semibold ${
            reaction === "like" ? "border-success bg-success-tint text-success" : "border-line bg-white text-ink"
          }`}
        >
          <IconLike size={18} color={reaction === "like" ? "#2A6B57" : "#17140F"} filled={reaction === "like"} />
          {likes}
        </button>
        <button
          type="button"
          onClick={() => react("dislike")}
          data-testid="react-dislike"
          aria-label={t.dislikeLabel}
          aria-pressed={reaction === "dislike"}
          title={t.dislikeLabel}
          className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] border text-[14px] font-semibold ${
            reaction === "dislike" ? "border-accent bg-accent-tint text-accent" : "border-line bg-white text-ink"
          }`}
        >
          <IconDislike size={18} color={reaction === "dislike" ? "#B8452F" : "#17140F"} filled={reaction === "dislike"} />
          {dislikes}
        </button>
        {FEATURES.comments ? <CommentsButton listingId={listing.id} onOpen={() => setSheet(true)} /> : null}
      </div>
      {FEATURES.comments && sheet ? (
        <CommentsSheet listingId={listing.id} title={lang === "ky" ? listing.titleKy || listing.title : listing.title} onClose={() => setSheet(false)} />
      ) : null}
    </div>
  );
}
