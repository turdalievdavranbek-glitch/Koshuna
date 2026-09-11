"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { socialCounts } from "@/lib/reactions";
import { useApp } from "@/lib/store";
import type { Listing } from "@/lib/types";
import { IconChat, IconDislike, IconLike } from "@/components/icons";
import { Eyebrow } from "@/components/ui";

export function ListingSocialMeta({
  listingId,
  size = "md",
  align = "start",
}: {
  listingId: string;
  size?: "sm" | "md" | "lg";
  align?: "start" | "center";
}) {
  const { commentsOf, reactions } = useApp();
  const { likes, dislikes, comments } = socialCounts(listingId, reactions, commentsOf(listingId).length);
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
      <span className="inline-flex min-w-0 items-center gap-0.5">
        <IconChat size={icon} color="#6E6558" />
        <span className="tabular-nums">{comments}</span>
      </span>
    </div>
  );
}

export function ListingSocial({ listing }: { listing: Listing }) {
  const { t, user, setPendingPath, reactionOf, setReaction, commentsOf, addComment, reactions } = useApp();
  const router = useRouter();
  const [text, setText] = useState("");

  const reaction = reactionOf(listing.id);
  const locked = Boolean(reaction);
  const comments = commentsOf(listing.id);
  const { likes, dislikes } = socialCounts(listing.id, reactions, comments.length);

  const gate = () => {
    if (!user) {
      setPendingPath(`/listing/${listing.id}`);
      router.push("/login");
      return false;
    }
    return true;
  };

  const react = (value: "like" | "dislike") => {
    if (locked) return;
    if (!gate()) return;
    setReaction(listing.id, value);
  };

  const submit = () => {
    if (!gate()) return;
    if (addComment(listing.id, text)) setText("");
  };

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => react("like")}
          aria-label={t.likeLabel}
          aria-pressed={reaction === "like"}
          aria-disabled={locked}
          title={locked ? t.alreadyReacted : t.likeLabel}
          className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] border text-[14px] font-semibold ${
            locked ? "cursor-default" : ""
          } ${
            reaction === "like" ? "border-success bg-success-tint text-success" : "border-line bg-white text-ink"
          }`}
        >
          <IconLike size={18} color={reaction === "like" ? "#2A6B57" : "#17140F"} filled={reaction === "like"} />
          {likes}
        </button>
        <button
          type="button"
          onClick={() => react("dislike")}
          aria-label={t.dislikeLabel}
          aria-pressed={reaction === "dislike"}
          aria-disabled={locked}
          title={locked ? t.alreadyReacted : t.dislikeLabel}
          className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] border text-[14px] font-semibold ${
            locked ? "cursor-default" : ""
          } ${
            reaction === "dislike" ? "border-accent bg-accent-tint text-accent" : "border-line bg-white text-ink"
          }`}
        >
          <IconDislike size={18} color={reaction === "dislike" ? "#B8452F" : "#17140F"} filled={reaction === "dislike"} />
          {dislikes}
        </button>
        <div className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] border border-line bg-white text-[14px] font-semibold text-ink">
          <IconChat size={17} color="#17140F" />
          {comments.length}
        </div>
      </div>

      <div className="mt-5">
        <Eyebrow>{t.comments}</Eyebrow>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder={t.commentPlaceholder}
            className="h-11 flex-1 rounded-[14px] border border-line bg-surface px-4 text-[14px] text-ink outline-none placeholder:text-muted-2"
          />
          <button
            type="button"
            onClick={submit}
            className="h-11 shrink-0 rounded-[14px] bg-accent px-4 text-[14px] font-semibold text-accent-on"
          >
            {t.commentSend}
          </button>
        </div>

        {comments.length ? (
          <div className="mt-4 flex flex-col gap-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink font-display text-[15px] font-bold text-screen">
                  {comment.author.slice(0, 1)}
                </div>
                <div className="flex-1 rounded-[14px] border border-line bg-white px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[14px] font-semibold text-ink">{comment.author}</span>
                    <span className="shrink-0 text-[11px] text-muted-2">{comment.time}</span>
                  </div>
                  <p className="mt-1 text-[14px] leading-[1.45] text-ink-2">{comment.text}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[13px] text-muted">{t.commentsEmpty}</p>
        )}
      </div>
    </div>
  );
}
