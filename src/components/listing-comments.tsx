"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { COMMENT_MAX, type CommentRow } from "@/lib/comments";
import { setCommentCount, useCommentCount } from "@/lib/comment-counts";
import { pushOverlay, removeOverlay } from "@/lib/native-back";
import { useApp } from "@/lib/store";
import { IconChat } from "./icons";

const COMMENT_REASONS = ["spam", "abuse", "fraud", "other"] as const;

/** «💬 N» — opens the comments sheet. */
export function CommentsButton({
  listingId,
  variant = "tile",
  onOpen,
}: {
  listingId: string;
  variant?: "tile" | "reel";
  onOpen: () => void;
}) {
  const { t } = useApp();
  const count = useCommentCount(listingId);
  if (variant === "reel") {
    return (
      <button type="button" data-testid="comments-open" aria-label={t.comments} onClick={onOpen} className="flex flex-col items-center gap-0.5">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/92">
          <IconChat size={19} color="#17140F" />
        </span>
        <span className="text-[12px] font-semibold text-white tabular-nums">{count}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      data-testid="comments-open"
      aria-label={t.comments}
      onClick={onOpen}
      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] border border-line bg-white text-[14px] font-semibold text-ink"
    >
      <IconChat size={17} color="#17140F" />
      {count}
    </button>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink font-display text-[13px] font-bold text-screen">
      {(name || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

function minutesSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

/** Instagram-style comments: avatar, bold name, text; «2 ч · Ответить · ♥ N»; replies under the parent. */
export function CommentsSheet({ listingId, title, onClose }: { listingId: string; title?: string; onClose: () => void }) {
  const { t, user, setPendingPath, blockUser } = useApp();
  const router = useRouter();
  const [rows, setRows] = useState<CommentRow[] | null>(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);
  const [editing, setEditing] = useState<CommentRow | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState<CommentRow | null>(null);
  const [reportFor, setReportFor] = useState<CommentRow | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  const load = useCallback(async () => {
    const res = await api<{ comments: CommentRow[]; count: number }>(`/api/listings/${encodeURIComponent(listingId)}/comments`);
    if (!res.ok || !res.data) {
      setRows([]);
      return;
    }
    setRows(res.data.comments);
    setCommentCount(listingId, res.data.count);
  }, [listingId]);

  useEffect(() => {
    void load();
  }, [load, user?.id]);

  useEffect(() => {
    const id = `comments-${listingId}`;
    pushOverlay(id, () => closeRef.current());
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      removeOverlay(id);
      document.body.style.overflow = prev;
    };
  }, [listingId]);

  const tops = useMemo(() => (rows ?? []).filter((row) => !row.parentId), [rows]);
  const repliesOf = useMemo(() => {
    const map = new Map<string, CommentRow[]>();
    for (const row of rows ?? []) {
      if (!row.parentId) continue;
      const list = map.get(row.parentId) ?? [];
      list.push(row);
      map.set(row.parentId, list);
    }
    return map;
  }, [rows]);

  const gate = () => {
    if (user) return true;
    setPendingPath(`/listing/${listingId}`);
    router.push("/login");
    return false;
  };

  const startReply = (row: CommentRow) => {
    if (!gate()) return;
    const name = row.author || t.holdNoName;
    setEditing(null);
    setReplyTo(row);
    setText(`@${name} `);
    if (row.parentId) setOpen((cur) => ({ ...cur, [row.parentId as string]: true }));
    else setOpen((cur) => ({ ...cur, [row.id]: true }));
    window.setTimeout(() => {
      const el = input.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }, 30);
  };

  const like = async (row: CommentRow) => {
    if (!gate()) return;
    setRows((cur) =>
      cur ? cur.map((item) => (item.id === row.id ? { ...item, liked: !item.liked, likes: item.likes + (item.liked ? -1 : 1) } : item)) : cur,
    );
    const res = await api<{ liked: boolean; likes: number }>(`/api/comments/${row.id}/like`, { method: "POST" });
    if (res.ok && res.data) {
      const data = res.data;
      setRows((cur) => (cur ? cur.map((item) => (item.id === row.id ? { ...item, liked: data.liked, likes: data.likes } : item)) : cur));
    }
  };

  const submit = async () => {
    if (!gate() || busy) return;
    const body = text.trim();
    if (!body) return;
    if (body.length > COMMENT_MAX) {
      setNotice(t.commentTooLong);
      return;
    }
    setBusy(true);
    setNotice("");
    if (editing) {
      const res = await api<{ text: string; editedAt: string }>(`/api/comments/${editing.id}`, { method: "PATCH", json: { text: body } });
      setBusy(false);
      if (!res.ok || !res.data) {
        setNotice(t.commentFailed);
        return;
      }
      const data = res.data;
      setRows((cur) => (cur ? cur.map((item) => (item.id === editing.id ? { ...item, text: data.text, editedAt: data.editedAt } : item)) : cur));
      setEditing(null);
      setText("");
      return;
    }
    const res = await api<{ comment: CommentRow }>(`/api/listings/${encodeURIComponent(listingId)}/comments`, {
      method: "POST",
      json: { text: body, parentId: replyTo?.id },
    });
    setBusy(false);
    if (!res.ok || !res.data?.comment) {
      setNotice(res.status === 429 ? t.commentRate : res.error === "blocked" ? t.commentBlockedOwner : res.error === "text" ? t.commentTooLong : t.commentFailed);
      return;
    }
    const added = res.data.comment;
    setRows((cur) => [...(cur ?? []), added]);
    setCommentCount(listingId, (rows ?? []).filter((row) => !row.underReview).length + 1);
    if (added.parentId) setOpen((cur) => ({ ...cur, [added.parentId as string]: true }));
    setReplyTo(null);
    setText("");
  };

  const remove = async (row: CommentRow) => {
    const res = await api(`/api/comments/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      setNotice(t.commentFailed);
      return;
    }
    const next = (rows ?? []).filter((item) => item.id !== row.id && item.parentId !== row.id);
    setRows(next);
    setCommentCount(listingId, next.filter((item) => !item.underReview).length);
  };

  const report = async (row: CommentRow, reason: string) => {
    setReportFor(null);
    const res = await api(`/api/reports`, { method: "POST", json: { commentId: row.id, reason } });
    setNotice(res.ok ? t.reportThanks : t.commentFailed);
  };

  const block = async (row: CommentRow) => {
    await blockUser(row.authorId);
    setRows((cur) => (cur ? cur.filter((item) => item.authorId !== row.authorId) : cur));
    void load();
  };

  const line = (row: CommentRow, reply: boolean) => (
    <div key={row.id} className={`flex gap-2.5 ${reply ? "ml-10" : ""}`} data-testid="comment-row">
      <Avatar name={row.author} />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] leading-[1.4] text-ink">
          <span className="font-semibold">{row.author || t.holdNoName}</span>{" "}
          <span className="whitespace-pre-wrap break-words">{row.text}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-semibold text-muted-2">
          <span>{t.commentAgo(minutesSince(row.createdAt))}</span>
          {row.editedAt ? <span>{t.chatEdited}</span> : null}
          {row.underReview ? <span className="text-accent">{t.commentUnderReview}</span> : null}
          <button type="button" data-testid="comment-reply" onClick={() => startReply(row)}>
            {t.commentReply}
          </button>
          <button
            type="button"
            data-testid="comment-like"
            aria-label={t.commentLikeLabel}
            aria-pressed={row.liked}
            onClick={() => void like(row)}
            className="inline-flex items-center gap-1"
            style={{ color: row.liked ? "#B8452F" : undefined }}
          >
            {row.liked ? "♥" : "♡"} {row.likes}
          </button>
          {user ? (
            <button type="button" data-testid="comment-menu" aria-label={t.commentMenu} onClick={() => setMenu(row)} className="px-1 text-[15px] leading-none">
              ⋯
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-[rgba(23,20,15,.45)] desk:items-center desk:p-4" onClick={onClose} data-testid="comments-sheet">
      <div
        role="dialog"
        aria-label={t.comments}
        className="flex h-[82vh] w-full max-w-[520px] flex-col rounded-t-[24px] bg-white desk:h-[min(80vh,760px)] desk:rounded-[24px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
          <div className="min-w-0">
            <div className="font-display text-[17px] font-bold text-ink">{t.comments}</div>
            {title ? <div className="truncate text-[12px] text-muted">{title}</div> : null}
          </div>
          <button type="button" aria-label={t.cardDeleteCancel} onClick={onClose} className="h-9 w-9 rounded-full text-[18px] text-muted">
            ✕
          </button>
        </div>

        <div className="sc min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {rows === null ? null : tops.length === 0 ? (
            <p className="mt-6 text-center text-[13px] text-muted">{t.commentsEmpty}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {tops.map((row) => {
                const replies = repliesOf.get(row.id) ?? [];
                const shown = Boolean(open[row.id]);
                return (
                  <div key={row.id} className="flex flex-col gap-3">
                    {line(row, false)}
                    {replies.length ? (
                      <button
                        type="button"
                        data-testid="comment-replies-toggle"
                        onClick={() => setOpen((cur) => ({ ...cur, [row.id]: !shown }))}
                        className="ml-10 flex items-center gap-2 text-left text-[12px] font-semibold text-muted"
                      >
                        <span className="h-px w-6 bg-line" />
                        {shown ? t.commentHideReplies : t.commentViewReplies(replies.length)}
                      </button>
                    ) : null}
                    {shown ? replies.map((reply) => line(reply, true)) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {notice ? <p className="shrink-0 px-4 pb-1 text-[12px] font-semibold text-accent">{notice}</p> : null}
        {replyTo || editing ? (
          <div className="flex shrink-0 items-center gap-2 border-t border-line bg-screen px-4 py-2 text-[13px]" data-testid="comment-reply-bar">
            <span className="min-w-0 flex-1 truncate text-muted">
              {editing ? t.chatEditing : t.commentReplyingTo(replyTo?.author || t.holdNoName)}
            </span>
            <button
              type="button"
              aria-label={t.cardDeleteCancel}
              onClick={() => {
                setReplyTo(null);
                setEditing(null);
                setText("");
              }}
              className="h-7 w-7 shrink-0 rounded-full text-[14px] text-muted"
            >
              ✕
            </button>
          </div>
        ) : null}
        <div className="shrink-0 border-t border-line px-3 pt-2.5" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          {user ? (
            <div className="flex items-end gap-2">
              <textarea
                ref={input}
                rows={1}
                value={text}
                maxLength={COMMENT_MAX}
                data-testid="comment-input"
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void submit();
                  }
                }}
                placeholder={t.commentPlaceholder}
                className="max-h-28 min-h-[44px] flex-1 resize-none rounded-[22px] border border-line bg-screen px-4 py-2.5 text-[14px] text-ink outline-none placeholder:text-muted-2"
              />
              <button
                type="button"
                data-testid="comment-send"
                disabled={busy || !text.trim()}
                onClick={() => void submit()}
                className="h-11 shrink-0 rounded-[22px] bg-accent px-4 text-[14px] font-semibold text-accent-on disabled:opacity-40"
              >
                {t.commentSend}
              </button>
            </div>
          ) : (
            <button type="button" data-testid="comment-login" onClick={() => gate()} className="h-11 w-full rounded-[22px] bg-ink text-[14px] font-semibold text-screen">
              {t.commentLogin}
            </button>
          )}
        </div>
      </div>

      {menu ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[rgba(23,20,15,.35)] desk:items-center desk:p-4" onClick={(e) => { e.stopPropagation(); setMenu(null); }}>
          <div className="w-full max-w-[430px] rounded-t-[24px] bg-white px-3 pb-6 pt-3 desk:rounded-[24px]" onClick={(e) => e.stopPropagation()}>
            {menu.mine ? (
              <button
                type="button"
                data-testid="comment-edit"
                onClick={() => {
                  const row = menu;
                  setMenu(null);
                  setReplyTo(null);
                  setEditing(row);
                  setText(row.text);
                  window.setTimeout(() => input.current?.focus(), 30);
                }}
                className="block h-[52px] w-full rounded-2xl px-4 text-left text-[16px] font-semibold text-ink active:bg-chip"
              >
                {t.edit}
              </button>
            ) : null}
            {menu.canDelete ? (
              <button
                type="button"
                data-testid="comment-delete"
                onClick={() => {
                  const row = menu;
                  setMenu(null);
                  void remove(row);
                }}
                className="block h-[52px] w-full rounded-2xl px-4 text-left text-[16px] font-semibold text-accent active:bg-chip"
              >
                {t.cardDelete}
              </button>
            ) : null}
            {!menu.mine ? (
              <>
                <button
                  type="button"
                  data-testid="comment-report"
                  onClick={() => {
                    const row = menu;
                    setMenu(null);
                    setReportFor(row);
                  }}
                  className="block h-[52px] w-full rounded-2xl px-4 text-left text-[16px] font-semibold text-ink active:bg-chip"
                >
                  {t.report}
                </button>
                <button
                  type="button"
                  data-testid="comment-block"
                  onClick={() => {
                    const row = menu;
                    setMenu(null);
                    void block(row);
                  }}
                  className="block h-[52px] w-full rounded-2xl px-4 text-left text-[16px] font-semibold text-accent active:bg-chip"
                >
                  {t.blockAuthor}
                </button>
              </>
            ) : null}
            <button type="button" onClick={() => setMenu(null)} className="mt-1 block h-[48px] w-full text-center text-[15px] font-semibold text-muted">
              {t.cardDeleteCancel}
            </button>
          </div>
        </div>
      ) : null}

      {reportFor ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[rgba(23,20,15,.35)] desk:items-center desk:p-4" onClick={(e) => { e.stopPropagation(); setReportFor(null); }}>
          <div className="w-full max-w-[430px] rounded-t-[24px] bg-white px-4 pb-6 pt-4 desk:rounded-[24px]" onClick={(e) => e.stopPropagation()}>
            <div className="font-display text-[17px] font-bold text-ink">{t.commentReportTitle}</div>
            <div className="mt-3 flex flex-col gap-1.5">
              {COMMENT_REASONS.map((id) => (
                <button
                  key={id}
                  type="button"
                  data-testid={`comment-reason-${id}`}
                  onClick={() => void report(reportFor, id)}
                  className="rounded-[14px] bg-screen px-3.5 py-3 text-left text-[14px] font-semibold text-ink"
                >
                  {t.reportReasons[id] ?? id}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setReportFor(null)} className="mt-2 block h-[48px] w-full text-center text-[15px] font-semibold text-muted">
              {t.cardDeleteCancel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
