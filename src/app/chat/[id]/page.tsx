"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { takeChatDraft } from "@/lib/chat-draft";
import { buyRequestChatTitle } from "@/lib/buy-request";
import type { ChatDetail, ChatLine } from "@/lib/chat";
import { formatWhen } from "@/lib/dates";
import { goBack } from "@/lib/go-back";
import { isDbUserId } from "@/lib/phone";
import { enableNativePush } from "@/lib/native-push";
import { useApp } from "@/lib/store";
import { IconBack } from "@/components/icons";
import { MessageInbox } from "@/components/message-inbox";
import { PhoneShell } from "@/components/shell";
import { Photo } from "@/components/ui";
import { useDesk } from "@/lib/desk";
import { pushOverlay, removeOverlay } from "@/lib/native-back";

const HOLD_MS = 500;

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, lang, user, ready, setPendingPath } = useApp();
  const desk = useDesk();
  const [detail, setDetail] = useState<ChatDetail | null>(null);
  const [missing, setMissing] = useState(false);
  // «Записаться» on a service listing leaves a one-time draft for this thread.
  const [text, setText] = useState(() => (typeof window === "undefined" || !id ? "" : takeChatDraft(id)));
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const seen = useRef(0);
  // Own message actions: long-press (phone) or «⋯» on hover (desktop) opens a sheet.
  const [menuFor, setMenuFor] = useState<ChatLine | null>(null);
  const [editing, setEditing] = useState<ChatLine | null>(null);
  const hold = useRef<number | null>(null);

  useEffect(() => {
    if (!menuFor) return;
    pushOverlay("chat-msg-menu", () => setMenuFor(null));
    return () => removeOverlay("chat-msg-menu");
  }, [menuFor]);

  const load = useCallback(async () => {
    if (!id) return;
    const res = await api<ChatDetail>(`/api/threads/${encodeURIComponent(id)}`);
    if (!res.ok || !res.data?.id) {
      if (res.status === 404) setMissing(true);
      return;
    }
    setMissing(false);
    setDetail((cur) => {
      const next = res.data;
      if (!next) return cur;
      if (!cur || cur.id !== next.id) return next;
      const ids = new Set(next.messages.map((row) => row.id));
      const extra = cur.messages.filter((row) => !ids.has(row.id));
      return extra.length ? { ...next, messages: [...next.messages, ...extra] } : next;
    });
  }, [id]);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setPendingPath(`/chat/${id}`);
      router.replace("/login");
      return;
    }
    void enableNativePush();
    void load();
    const timer = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(timer);
    // Redirect once per account. setPendingPath is a new function every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user?.id, id, load]);

  useEffect(() => {
    const n = detail?.messages.length ?? 0;
    if (n !== seen.current) {
      seen.current = n;
      end.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [detail?.messages.length]);

  if (!ready || !user) return null;

  if (missing || !detail) {
    return (
      <PhoneShell focus>
        <div className="p-6">
          <button type="button" aria-label={t.backLeave} onClick={() => goBack(router, "/messages")}>
            <IconBack size={18} color="#17140F" />
          </button>
          <p className="mt-4">{missing ? t.emptyInbox : ""}</p>
        </div>
      </PhoneShell>
    );
  }

  const putLine = (line: ChatLine) =>
    setDetail((cur) => (cur ? { ...cur, messages: cur.messages.map((row) => (row.id === line.id ? line : row)) } : cur));

  const msgPath = (messageId: string) =>
    `/api/threads/${encodeURIComponent(detail.id)}/messages/${encodeURIComponent(messageId)}`;

  const saveEdit = async () => {
    const target = editing;
    const body = text.trim();
    if (!target || !body || sending) return;
    if (body === target.text) {
      setEditing(null);
      setText("");
      return;
    }
    setSending(true);
    setSendError("");
    const res = await api<{ message?: ChatLine }>(msgPath(target.id), { method: "PATCH", json: { text: body } });
    setSending(false);
    if (!res.ok || !res.data?.message) {
      setSendError(t.chatEditFailed);
      return;
    }
    putLine(res.data.message);
    setEditing(null);
    setText("");
  };

  const removeLine = async (line: ChatLine) => {
    setSendError("");
    const res = await api<{ message?: ChatLine }>(msgPath(line.id), { method: "DELETE" });
    if (!res.ok || !res.data?.message) {
      setSendError(t.chatEditFailed);
      return;
    }
    putLine(res.data.message);
    if (editing?.id === line.id) {
      setEditing(null);
      setText("");
    }
  };

  const holdStart = (line: ChatLine) => {
    if (line.deleted) return;
    if (hold.current) window.clearTimeout(hold.current);
    hold.current = window.setTimeout(() => {
      hold.current = null;
      setMenuFor(line);
    }, HOLD_MS);
  };
  const holdStop = () => {
    if (hold.current) window.clearTimeout(hold.current);
    hold.current = null;
  };

  const send = async (value = text) => {
    if (editing && value === text) {
      await saveEdit();
      return;
    }
    const body = value.trim();
    if (!body || sending || detail.blocked) return;
    void enableNativePush();
    setSending(true);
    setSendError("");
    const res = await api<{ message?: ChatLine }>(`/api/threads/${encodeURIComponent(detail.id)}`, {
      method: "POST",
      json: { text: body },
    });
    setSending(false);
    if (!res.ok || !res.data?.message) {
      if (res.error === "blocked") {
        setDetail({ ...detail, blocked: true });
        setSendError(t.chatBlocked);
        return;
      }
      setSendError(t.chatSendFailed);
      return;
    }
    const message = res.data.message;
    setText("");
    setDetail((cur) => {
      if (!cur) return cur;
      if (cur.messages.some((row) => row.id === message.id)) return cur;
      return { ...cur, messages: [...cur.messages, message] };
    });
  };

  const title = buyRequestChatTitle(detail.title, detail.requestQuantity, detail.requestUnit, t.buyUnits) || t.chatListingGone;
  const peer = detail.peerName || t.holdNoName;

  return (
    <PhoneShell focus>
      <div className="contents desk:grid desk:min-h-0 desk:flex-1 desk:grid-cols-[360px_minmax(0,1fr)]">
      {desk ? (
        <div className="hidden min-h-0 overflow-y-auto border-line desk:block desk:border-r">
          <MessageInbox />
        </div>
      ) : null}
      <div className="contents desk:flex desk:min-h-0 desk:min-w-0 desk:flex-col">
      <div className="shrink-0 border-b border-line bg-white">
        <div className="flex items-center gap-3 px-4 pb-3 pt-1.5">
          <button type="button" aria-label={t.backLeave} onClick={() => goBack(router, "/messages")}>
            <IconBack size={18} color="#17140F" />
          </button>
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => {
              if (isDbUserId(detail.peerId)) router.push(`/owner/${detail.peerId}`);
            }}
          >
            <span className="block truncate text-base font-semibold text-ink">{peer}</span>
          </button>
        </div>
        <button
          type="button"
          data-testid="chat-listing"
          onClick={() => {
            if (detail.listingId) router.push(`/listing/${detail.listingId}`);
          }}
          className="mx-4 mb-3 flex items-center gap-2.5 rounded-[14px] border border-line bg-screen p-2 text-left"
        >
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-chip">
            {detail.photo ? <Photo src={detail.photo} alt="" /> : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium leading-[1.3] text-ink">{title}</div>
          </div>
          {detail.listingId ? <span className="text-xs font-semibold text-accent">{t.open}</span> : null}
        </button>
      </div>

      <div className="sc flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-[18px]">
        {detail.messages.length === 0 ? <p className="text-center text-[13px] text-muted">{t.chatStart}</p> : null}
        {detail.messages.map((m) => {
          const when = `${m.editedAt && !m.deleted ? `${t.chatEdited} · ` : ""}${formatWhen(m.createdAt, lang)}`;
          if (m.deleted) {
            return (
              <div
                key={m.id}
                data-testid="chat-msg-deleted"
                className={`max-w-[78%] rounded-[18px] border border-dashed border-line px-3.5 py-2 ${m.mine ? "self-end" : "self-start"}`}
              >
                <div className="text-[14px] italic leading-[1.45] text-muted">{t.chatDeleted}</div>
                <div className="mt-0.5 text-right text-[11px] text-muted-2">{formatWhen(m.createdAt, lang)}</div>
              </div>
            );
          }
          return m.mine ? (
            <div key={m.id} className="group flex max-w-[86%] items-center gap-1 self-end">
              <button
                type="button"
                data-testid="chat-msg-more"
                aria-label={t.chatMsgActions}
                onClick={() => setMenuFor(m)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[18px] font-bold leading-none text-muted opacity-0 focus:opacity-100 group-hover:opacity-100"
              >
                ⋯
              </button>
              <div
                data-testid="chat-msg-mine"
                className="min-w-0 select-none rounded-[18px_18px_6px_18px] bg-ink px-3.5 py-2.5"
                style={{ WebkitTouchCallout: "none" }}
                onPointerDown={() => holdStart(m)}
                onPointerUp={holdStop}
                onPointerLeave={holdStop}
                onPointerCancel={holdStop}
                onPointerMove={(e) => {
                  if (Math.abs(e.movementX) + Math.abs(e.movementY) > 6) holdStop();
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  holdStop();
                  setMenuFor(m);
                }}
              >
                <div className="whitespace-pre-wrap break-words text-[15px] leading-[1.45] text-screen">{m.text}</div>
                <div className="mt-1 text-right text-[11px] text-[rgba(247,243,236,.6)]">{when}</div>
              </div>
            </div>
          ) : (
            <div key={m.id} className="max-w-[78%] self-start rounded-[18px_18px_18px_6px] border border-line bg-white px-3.5 py-2.5">
              <div className="whitespace-pre-wrap break-words text-[15px] leading-[1.45] text-ink">{m.text}</div>
              <div className="mt-1 text-right text-[11px] text-muted-2">{when}</div>
            </div>
          );
        })}
        <div ref={end} />
      </div>

      {detail.blocked ? <p className="px-4 pb-2 text-[13px] text-accent">{t.chatBlocked}</p> : null}
      {sendError && !detail.blocked ? <p className="px-4 pb-2 text-[13px] text-accent">{sendError}</p> : null}
      {detail.blocked ? null : (
        <>
          <div className="sc flex gap-2 overflow-x-auto px-4 pb-2">
            {(detail.section === "services" ? [t.qWhen, t.qPrice, t.qWhere] : [t.qView, t.qBargain, t.qAddress]).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void send(q)}
                className="shrink-0 rounded-full border border-line bg-white px-3.5 py-2 text-[13px] font-semibold text-ink"
              >
                {q}
              </button>
            ))}
          </div>
          {editing ? (
            <div className="flex items-center gap-2 border-t border-line bg-white px-4 pt-2 text-[13px]" data-testid="chat-editing">
              <span className="min-w-0 flex-1 truncate font-semibold text-accent">
                {t.chatEditing}: <span className="font-normal text-muted">{editing.text}</span>
              </span>
              <button
                type="button"
                aria-label={t.cardDeleteCancel}
                onClick={() => {
                  setEditing(null);
                  setText("");
                }}
                className="h-8 w-8 shrink-0 rounded-full text-[16px] text-muted"
              >
                ✕
              </button>
            </div>
          ) : null}
          <div className="flex items-center gap-2.5 border-t border-line bg-white px-4 pb-[26px] pt-2.5">
            <input
              value={text}
              data-testid="chat-input"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void send();
              }}
              placeholder={t.msgPh}
              className="h-11 flex-1 rounded-full border border-line bg-screen px-4 text-[15px] outline-none placeholder:text-muted-2"
            />
            <button
              type="button"
              data-testid="chat-send"
              disabled={sending}
              onClick={() => void send()}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-accent disabled:opacity-60"
            >
              <svg width="19" height="19" viewBox="0 0 18 18" fill="none" stroke="#FFF7F0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 3 2.5 8.2l4.2 1.3L15.8 3.2 8.4 11l.4 4 2.2-3 3 2.4z" />
              </svg>
            </button>
          </div>
        </>
      )}
      </div>
      </div>
      {menuFor ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(23,20,15,.45)] desk:items-center desk:p-4"
          onClick={() => setMenuFor(null)}
          data-testid="chat-msg-sheet"
        >
          <div
            role="dialog"
            aria-label={t.chatMsgActions}
            className="w-full max-w-[430px] rounded-t-[24px] bg-white px-3 pb-6 pt-3 desk:rounded-[24px]"
            style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom, 0px))" }}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="truncate px-4 pb-2 text-[13px] text-muted">{menuFor.text}</p>
            <button
              type="button"
              data-testid="chat-msg-edit"
              onClick={() => {
                const line = menuFor;
                setMenuFor(null);
                setEditing(line);
                setText(line.text);
              }}
              className="block h-[52px] w-full rounded-2xl px-4 text-left text-[16px] font-semibold text-ink active:bg-chip"
            >
              {t.edit}
            </button>
            <button
              type="button"
              data-testid="chat-msg-delete"
              onClick={() => {
                const line = menuFor;
                setMenuFor(null);
                void removeLine(line);
              }}
              className="block h-[52px] w-full rounded-2xl px-4 text-left text-[16px] font-semibold text-accent active:bg-chip"
            >
              {t.cardDelete}
            </button>
            <button
              type="button"
              onClick={() => setMenuFor(null)}
              className="mt-1 block h-[48px] w-full text-center text-[15px] font-semibold text-muted"
            >
              {t.cardDeleteCancel}
            </button>
          </div>
        </div>
      ) : null}
    </PhoneShell>
  );
}
