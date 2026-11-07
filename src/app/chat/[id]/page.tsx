"use client";

import { MasterBadge } from "@/components/master-badge";
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { takeChatDraft } from "@/lib/chat-draft";
import { buyRequestChatTitle } from "@/lib/buy-request";
import { CHAT_REACTIONS, type ChatDetail, type ChatLine } from "@/lib/chat";
import { lineTop, readChatScroll, saveChatScroll } from "@/lib/chat-scroll";
import { ChatMic, PhotoStrip, PhotoViewer, QuoteChip, VoiceBubble, quoteSnippet } from "@/components/chat-voice";
import { jpegDataUrl } from "@/lib/photo-price";
import { NativePhotoInputs, openFileInput } from "@/components/native-photo";
import { materializeMedia } from "@/lib/api/upload";
import { EmojiPanel } from "@/components/emoji-panel";
import { presenceLabel, replyBucket } from "@/lib/presence";
import { formatWhen } from "@/lib/dates";
import { goBack } from "@/lib/go-back";
import { isDbUserId } from "@/lib/phone";
import { enableNativePush } from "@/lib/native-push";
import { useApp } from "@/lib/store";
import { IconBack } from "@/components/icons";
import { MessageInbox } from "@/components/message-inbox";
import { ChatDeleteFlow } from "@/components/chat-delete";
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const awayRef = useRef(false);
  const placedFor = useRef("");
  const openFor = useRef("");
  const unreadLocked = useRef(false);
  const unreadFromRef = useRef<string | null>(null);
  const [unreadFrom, setUnreadFrom] = useState<string | null>(null);
  const [shownThread, setShownThread] = useState<string | null>(null);
  const [away, setAway] = useState(false);
  // Own message actions: long-press (phone) or «⋯» on hover (desktop) opens a sheet.
  const [menuFor, setMenuFor] = useState<ChatLine | null>(null);
  const [threadMenu, setThreadMenu] = useState(false);
  const closeThreadMenu = useCallback(() => setThreadMenu(false), []);
  const [editing, setEditing] = useState<ChatLine | null>(null);
  const hold = useRef<number | null>(null);
  const swipeX = useRef(0);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [quoting, setQuoting] = useState<ChatLine | null>(null);
  const [highlight, setHighlight] = useState("");
  const [micLive, setMicLive] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [viewer, setViewer] = useState<{ urls: string[]; index: number } | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingSent = useRef(0);
  const signalTyping = useCallback(() => {
    const now = Date.now();
    if (!id || now - typingSent.current < 3000) return;
    typingSent.current = now;
    void api(`/api/threads/${encodeURIComponent(id)}/typing`, { method: "POST" });
  }, [id]);

  useEffect(() => {
    if (!menuFor) return;
    pushOverlay("chat-msg-menu", () => setMenuFor(null));
    return () => removeOverlay("chat-msg-menu");
  }, [menuFor]);

  const idRef = useRef(id);
  idRef.current = id;

  const load = useCallback(async () => {
    if (!id) return;
    const res = await api<ChatDetail>(`/api/threads/${encodeURIComponent(id)}`);
    if (!res.ok || !res.data?.id) {
      if (res.status === 404 && idRef.current === id) setMissing(true);
      return;
    }
    if (res.data.id !== idRef.current) return;
    setMissing(false);
    const next = res.data;
    if (next.id === idRef.current && !unreadLocked.current) {
      unreadLocked.current = true;
      unreadFromRef.current = next.firstUnreadId || null;
      setUnreadFrom(unreadFromRef.current);
    }
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

  const placeScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !id) return;
    const gap = () => el.scrollHeight - el.scrollTop - el.clientHeight;
    const pin = (next: boolean) => {
      stickRef.current = next;
      const up = !next && gap() >= 80;
      if (up !== awayRef.current) {
        awayRef.current = up;
        setAway(up);
      }
    };
    if (placedFor.current !== id) {
      placedFor.current = id;
      const unreadNode = unreadFromRef.current ? document.getElementById("chat-unread") : null;
      if (unreadNode) {
        el.scrollTop = Math.max(0, lineTop(unreadNode, el) - 8);
        pin(gap() < 48);
      } else {
        const saved = readChatScroll(id);
        const node = saved?.anchorId
          ? el.querySelector<HTMLElement>(`[data-chat-line="${CSS.escape(saved.anchorId)}"]`)
          : null;
        if (saved && !saved.atBottom && node) {
          el.scrollTop = Math.max(0, lineTop(node, el) - saved.offset);
          pin(false);
        } else if (saved && !saved.atBottom) {
          el.scrollTop = saved.top;
          pin(false);
        } else {
          el.scrollTop = el.scrollHeight;
          pin(true);
        }
      }
    } else if (stickRef.current) {
      el.scrollTop = el.scrollHeight;
    }
    saveChatScroll(id, el);
  }, [id]);

  useLayoutEffect(() => {
    if (openFor.current !== (id || "")) {
      openFor.current = id || "";
      placedFor.current = "";
      unreadLocked.current = false;
      unreadFromRef.current = null;
      setUnreadFrom(null);
      setShownThread(null);
    }
    if (!detail || detail.id !== id) return;
    placeScroll();
    if (shownThread !== detail.id) setShownThread(detail.id);
  }, [id, detail, unreadFrom, placeScroll, shownThread]);

  const onListScroll = () => {
    const el = scrollerRef.current;
    if (!el || !detail || detail.id !== id || shownThread !== detail.id) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickRef.current = gap < 48;
    const up = gap >= 80;
    if (up !== awayRef.current) {
      awayRef.current = up;
      setAway(up);
    }
    saveChatScroll(detail.id, el);
  };

  const jumpLatest = () => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    stickRef.current = true;
    awayRef.current = false;
    setAway(false);
    if (detail) saveChatScroll(detail.id, el);
  };

  if (!ready || !user) return null;

  if (missing || !detail) {
    return (
      <PhoneShell focus>
        <div className="p-6">
          <button type="button" aria-label={t.backLeave} onClick={() => goBack(router, "/messages")}>
            <IconBack size={18} color="#18181B" />
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

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? text.length;
    const stop = el?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(stop);
    setText(next);
    const caret = start + emoji.length;
    window.requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
  };

  const react = async (line: ChatLine, emoji: string) => {
    const prev = line.myReaction ?? null;
    const next = prev === emoji ? null : emoji;
    putLine({ ...line, myReaction: next });
    const res = await api<{ messageId: string; myReaction: string | null }>(`${msgPath(line.id)}/reaction`, {
      method: "PUT",
      json: { emoji: next },
    });
    if (!res.ok || !res.data) {
      putLine({ ...line, myReaction: prev });
      setSendError(t.chatEditFailed);
      return;
    }
    putLine({ ...line, myReaction: res.data.myReaction });
  };

  const badge = (m: ChatLine) => {
    const list = [m.peerReaction, m.myReaction].filter((x): x is string => Boolean(x));
    if (!list.length) return null;
    return (
      <button
        type="button"
        data-testid="chat-reaction-badge"
        aria-label={t.chatReact}
        onClick={() => setMenuFor(m)}
        className={`relative z-[1] -mt-2 flex items-center gap-0.5 rounded-full border border-line bg-white px-1.5 py-0.5 text-[13px] leading-none shadow-[0_2px_6px_rgba(176,20,26,.18)] ${m.mine ? "mr-2" : "ml-2"}`}
      >
        {list[0] === list[1] ? (
          <>
            {list[0]}
            <span className="text-[11px] font-semibold text-muted">2</span>
          </>
        ) : (
          list.join("")
        )}
      </button>
    );
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
      json: { text: body, replyToId: quoting?.id },
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
    setQuoting(null);
    setDetail((cur) => {
      if (!cur) return cur;
      if (cur.messages.some((row) => row.id === message.id)) return cur;
      return { ...cur, messages: [...cur.messages, message] };
    });
  };

  const sendVoice = async (blob: Blob, seconds: number) => {
    if (sending || detail.blocked) return;
    void enableNativePush();
    setSending(true);
    setSendError("");
    try {
      const local = URL.createObjectURL(blob);
      const voiceUrl = await materializeMedia(local, "voice", seconds);
      URL.revokeObjectURL(local);
      const res = await api<{ message?: ChatLine }>(`/api/threads/${encodeURIComponent(detail.id)}`, {
        method: "POST",
        json: { voiceUrl, voiceSec: seconds, replyToId: quoting?.id },
      });
      if (!res.ok || !res.data?.message) {
        setSendError(res.error === "blocked" ? t.chatBlocked : t.chatSendFailed);
        if (res.error === "blocked") setDetail({ ...detail, blocked: true });
        return;
      }
      const message = res.data.message;
      setQuoting(null);
      setDetail((cur) => {
        if (!cur) return cur;
        if (cur.messages.some((row) => row.id === message.id)) return cur;
        return { ...cur, messages: [...cur.messages, message] };
      });
    } catch {
      setSendError(t.chatSendFailed);
    } finally {
      setSending(false);
    }
  };

  const takePhotos = async (files: File[]) => {
    const images = files.filter((file) => file.type.startsWith("image/"));
    const room = Math.max(0, 5 - pendingPhotos.length);
    const picked = images.slice(0, room);
    setAttachOpen(false);
    if (!images.length) return;
    if (images.length > room) setSendError(t.chatPhotoLimit);
    if (!picked.length) return;
    const urls: string[] = [];
    for (const file of picked) {
      const raw = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      urls.push(await jpegDataUrl(raw, 1280, 0.72));
    }
    setPendingPhotos((cur) => [...cur, ...urls].slice(0, 5));
  };

  const sendPhotos = async () => {
    if (!pendingPhotos.length || sending || detail.blocked) return;
    void enableNativePush();
    setSending(true);
    setSendError("");
    setUploadPct(0);
    try {
      const urls: string[] = [];
      for (let i = 0; i < pendingPhotos.length; i += 1) {
        const url = await materializeMedia(pendingPhotos[i], "photo", undefined, (ratio) => {
          setUploadPct(Math.round(((i + ratio) / pendingPhotos.length) * 100));
        });
        urls.push(url);
      }
      const res = await api<{ message?: ChatLine }>(`/api/threads/${encodeURIComponent(detail.id)}`, {
        method: "POST",
        json: { photos: urls, text, replyToId: quoting?.id },
      });
      if (!res.ok || !res.data?.message) {
        setSendError(t.chatSendFailed);
        return;
      }
      const message = res.data.message;
      setText("");
      setQuoting(null);
      setPendingPhotos([]);
      setDetail((cur) => {
        if (!cur) return cur;
        if (cur.messages.some((row) => row.id === message.id)) return cur;
        return { ...cur, messages: [...cur.messages, message] };
      });
    } catch {
      setSendError(t.chatSendFailed);
    } finally {
      setSending(false);
      setUploadPct(null);
    }
  };

  const jumpTo = (messageId: string) => {
    const root = scrollerRef.current;
    const node = document.getElementById(`chat-line-${messageId}`);
    if (root && node) root.scrollTo({ top: Math.max(0, lineTop(node, root) - 24), behavior: "smooth" });
    setHighlight(messageId);
    window.setTimeout(() => setHighlight((cur) => (cur === messageId ? "" : cur)), 1400);
  };

  const quoteLabels = { deleted: t.chatDeleted, voice: t.chatVoiceQuote, photo: t.chatPhotoQuote };

  const title = buyRequestChatTitle(detail.title, detail.requestQuantity, detail.requestUnit, t.buyUnits) || t.chatListingGone;
  const peer = detail.peerName || t.holdNoName;
  const presence = presenceLabel(detail.peerLastSeenAt, t);
  const bucket = replyBucket(detail.peerReplyMs);
  const reply = bucket ? t.replyBuckets[bucket] : "";

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
            <IconBack size={18} color="#18181B" />
          </button>
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => {
              if (isDbUserId(detail.peerId)) router.push(`/owner/${detail.peerId}`);
            }}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-base font-semibold text-ink">{peer}</span>
              <MasterBadge userId={detail.peerId} />
            </span>
            {detail.peerTyping ? (
              <span data-testid="chat-typing" className="block truncate text-[12px] font-semibold text-accent">{t.typingNow}</span>
            ) : presence ? (
              <span data-testid="chat-presence" className={`block truncate text-[12px] ${presence === t.presenceOnline ? "font-semibold text-success" : "text-muted"}`}>
                {presence}
              </span>
            ) : null}
            {reply ? <span data-testid="chat-reply-time" className="block truncate text-[11px] text-muted-2">{t.replyUsually(reply)}</span> : null}
          </button>
          <button
            type="button"
            aria-label={t.chatMenu}
            data-testid="chat-header-menu"
            onClick={() => setThreadMenu(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[20px] font-bold leading-none text-ink"
          >
            ⋯
          </button>
          <ChatDeleteFlow threadId={detail.id} open={threadMenu} onClose={closeThreadMenu} onDone={() => router.replace("/messages")} />
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

      <div className="relative min-h-0 flex-1">
      <div
        ref={scrollerRef}
        onScroll={onListScroll}
        data-testid="chat-log"
        className={`sc flex h-full flex-col gap-2.5 overflow-y-auto px-4 py-[18px] ${shownThread === detail.id ? "" : "invisible"}`}
        style={{ overflowAnchor: "none" }}
      >
        {detail.messages.length === 0 ? <p className="text-center text-[13px] text-muted">{t.chatStart}</p> : null}
        {detail.messages.map((m) => {
          const when = `${m.editedAt && !m.deleted ? `${t.chatEdited} · ` : ""}${formatWhen(m.createdAt, lang)}`;
          const divider = unreadFrom === m.id ? (
            <div id="chat-unread" data-testid="chat-unread" className="flex items-center gap-2 py-1">
              <span className="h-px flex-1 bg-line" />
              <span className="rounded-full bg-chip px-2.5 py-0.5 text-[11px] font-semibold text-muted">{t.chatUnreadDivider}</span>
              <span className="h-px flex-1 bg-line" />
            </div>
          ) : null;
          if (m.deleted) {
            return (
              <Fragment key={m.id}>
                {divider}
              <div
                data-testid="chat-msg-deleted"
                data-chat-line={m.id}
                id={`chat-line-${m.id}`}
                className={`max-w-[78%] rounded-[18px] border border-dashed border-line px-3.5 py-2 ${m.mine ? "self-end" : "self-start"}`}
              >
                <div className="text-[14px] italic leading-[1.45] text-muted">{t.chatDeleted}</div>
                <div className="mt-0.5 text-right text-[11px] text-muted-2">{formatWhen(m.createdAt, lang)}</div>
              </div>
              </Fragment>
            );
          }
          return (
            <Fragment key={m.id}>
            {divider}
            {m.mine ? (
            <div className="group flex max-w-[86%] items-center gap-1 self-end">
              <button
                type="button"
                data-testid="chat-msg-more"
                aria-label={t.chatMsgActions}
                onClick={() => setMenuFor(m)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[18px] font-bold leading-none text-muted opacity-0 focus:opacity-100 group-hover:opacity-100"
              >
                ⋯
              </button>
              <div className="flex min-w-0 flex-col items-end">
              <div
                data-testid="chat-msg-mine"
                id={`chat-line-${m.id}`}
                data-chat-line={m.id}
                className={`min-w-0 select-none rounded-[18px_18px_6px_18px] bg-ink px-3.5 py-2.5 ${highlight === m.id ? "ring-2 ring-[#FFE600]" : ""}`}
                style={{ WebkitTouchCallout: "none" }}
                onPointerDown={(event) => {
                  swipeX.current = event.clientX;
                  holdStart(m);
                }}
                onPointerUp={(event) => {
                  holdStop();
                  if (!m.deleted && event.clientX - swipeX.current > 64) setQuoting(m);
                }}
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
                {m.replyTo ? (
                  <QuoteChip quote={m.replyTo} mine you={t.chatReplyYou} peer={peer} labels={quoteLabels} onJump={() => jumpTo(m.replyTo!.id)} />
                ) : null}
                {m.kind === "voice" && m.voiceUrl ? (
                  <VoiceBubble src={m.voiceUrl} seconds={m.voiceSec} mine />
                ) : m.kind === "photo" && m.photos?.length ? (
                  <div>
                    <PhotoStrip urls={m.photos} mine onOpen={(index) => setViewer({ urls: m.photos || [], index })} />
                    {m.text ? <div className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-[1.45] text-screen">{m.text}</div> : null}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap break-words text-[15px] leading-[1.45] text-screen">{m.text}</div>
                )}
                <div className="mt-1 text-right text-[11px] text-[rgba(245,245,247,.6)]">{when}</div>
              </div>
              {badge(m)}
              </div>
            </div>
          ) : (
            <div className="flex max-w-[78%] flex-col items-start self-start">
              <div
                data-testid="chat-msg-peer"
                id={`chat-line-${m.id}`}
                data-chat-line={m.id}
                className={`select-none rounded-[18px_18px_18px_6px] border border-line bg-white px-3.5 py-2.5 ${highlight === m.id ? "ring-2 ring-[#FFE600]" : ""}`}
                style={{ WebkitTouchCallout: "none" }}
                onPointerDown={(event) => {
                  swipeX.current = event.clientX;
                  holdStart(m);
                }}
                onPointerUp={(event) => {
                  holdStop();
                  if (!m.deleted && event.clientX - swipeX.current > 64) setQuoting(m);
                }}
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
                onDoubleClick={() => void react(m, "❤️")}
              >
                {m.replyTo ? (
                  <QuoteChip quote={m.replyTo} mine={false} you={t.chatReplyYou} peer={peer} labels={quoteLabels} onJump={() => jumpTo(m.replyTo!.id)} />
                ) : null}
                {m.kind === "voice" && m.voiceUrl ? (
                  <VoiceBubble src={m.voiceUrl} seconds={m.voiceSec} mine={false} />
                ) : m.kind === "photo" && m.photos?.length ? (
                  <div>
                    <PhotoStrip urls={m.photos} mine={false} onOpen={(index) => setViewer({ urls: m.photos || [], index })} />
                    {m.text ? <div className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-[1.45] text-ink">{m.text}</div> : null}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap break-words text-[15px] leading-[1.45] text-ink">{m.text}</div>
                )}
                <div className="mt-1 text-right text-[11px] text-muted-2">{when}</div>
              </div>
              {badge(m)}
            </div>
            )}
            </Fragment>
          );
        })}
      </div>
      {away ? (
        <button
          type="button"
          data-testid="chat-jump-latest"
          aria-label={t.chatJumpLatest}
          onClick={jumpLatest}
          className="absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-ink text-[18px] text-white shadow-lg"
        >
          ↓
        </button>
      ) : null}
      </div>

      {detail.blocked ? <p className="px-4 pb-2 text-[13px] text-accent">{t.chatBlocked}</p> : null}
      {sendError && !detail.blocked ? <p className="px-4 pb-2 text-[13px] text-accent">{sendError}</p> : null}
      {detail.blocked ? null : (
        <>
          <div className="sc flex w-full min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain px-3 pb-2">
            {(detail.section === "services" ? [t.qWhen, t.qPrice, t.qWhere] : [t.qView, t.qBargain, t.qAddress]).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void send(q)}
                className="shrink-0 whitespace-nowrap rounded-full border border-line bg-white px-3.5 py-2 text-[13px] font-semibold text-ink"
              >
                {q}
              </button>
            ))}
          </div>
          {quoting ? (
            <div className="flex items-center gap-2 border-t border-line bg-white px-4 pt-2" data-testid="chat-replying">
              <div className="min-w-0 flex-1 border-l-2 border-accent pl-2">
                <div className="text-[12px] font-bold text-accent">{quoting.mine ? t.chatReplyYou : peer}</div>
                <div className="truncate text-[13px] text-muted">{quoteSnippet(quoting, quoteLabels)}</div>
              </div>
              <button type="button" aria-label={t.cardDeleteCancel} onClick={() => setQuoting(null)} className="h-8 w-8 shrink-0 rounded-full text-[16px] text-muted">
                ✕
              </button>
            </div>
          ) : null}
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
          {emojiOpen ? <EmojiPanel onPick={insertEmoji} /> : null}
          {pendingPhotos.length && !micLive ? (
            <div className="flex gap-2 overflow-x-auto border-t border-line bg-white px-3 py-2">
              {pendingPhotos.map((url, index) => (
                <div key={`${index}-${url.slice(-16)}`} className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-14 w-14 rounded-[10px] object-cover" />
                  <button
                    type="button"
                    aria-label={t.cardDeleteCancel}
                    onClick={() => setPendingPhotos((cur) => cur.filter((_, i) => i !== index))}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {uploadPct != null ? (
            <div className="h-1 bg-chip" data-testid="chat-upload-progress">
              <div className="h-full bg-accent" style={{ width: `${uploadPct}%` }} />
            </div>
          ) : null}
          <div className="flex w-full min-w-0 max-w-full items-center gap-2 border-t border-line bg-white px-3 pb-[26px] pt-2.5">
            {micLive ? null : (
            <button
              type="button"
              data-testid="chat-attach"
              aria-label={t.chatAttach}
              onClick={() => setAttachOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[20px]"
            >
              📎
            </button>
            )}
            <button
              type="button"
              data-testid="chat-emoji"
              aria-label={t.emojiOpen}
              aria-pressed={emojiOpen}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setEmojiOpen((v) => !v)}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[22px] leading-none ${emojiOpen ? "bg-accent-tint" : ""}`}
            >
              😊
            </button>
            <input
              ref={inputRef}
              value={text}
              data-testid="chat-input"
              onChange={(e) => {
                setText(e.target.value);
                if (e.target.value.trim() && !editing) signalTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void (pendingPhotos.length ? sendPhotos() : send());
              }}
              placeholder={pendingPhotos.length ? t.chatPhotoCaption : t.msgPh}
              size={1}
              className={`h-11 min-w-0 flex-1 rounded-full border border-line bg-screen px-3.5 text-[15px] outline-none placeholder:text-muted-2 ${micLive ? "hidden" : ""}`}
            />
            {text.trim() || editing || pendingPhotos.length ? (
            <button
              type="button"
              data-testid="chat-send"
              disabled={sending}
              onClick={() => void (pendingPhotos.length ? sendPhotos() : send())}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent disabled:opacity-60"
            >
              <svg width="19" height="19" viewBox="0 0 18 18" fill="none" stroke="#FFFFFF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 3 2.5 8.2l4.2 1.3L15.8 3.2 8.4 11l.4 4 2.2-3 3 2.4z" />
              </svg>
            </button>
            ) : (
              <ChatMic
                disabled={sending}
                cancelLabel={t.chatVoiceCancel}
                onDenied={() => setSendError(t.chatMicDenied)}
                onShort={() => setSendError(t.chatVoiceShort)}
                onLive={setMicLive}
                onSend={(blob, seconds) => void sendVoice(blob, seconds)}
              />
            )}
          </div>
          <NativePhotoInputs
            cameraRef={cameraRef}
            galleryRef={galleryRef}
            galleryMultiple
            galleryTestId="chat-photo-file"
            onFile={(file) => void takePhotos([file])}
            onGalleryFiles={(files) => void takePhotos(files)}
          />
        </>
      )}
      </div>
      </div>
      {menuFor ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(24,24,27,.45)] desk:items-center desk:p-4"
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
            <div className="mx-1 mb-2 flex items-center justify-between rounded-full border border-line bg-screen px-2 py-1.5" data-testid="chat-react-bar" aria-label={t.chatReact}>
              {CHAT_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-pressed={menuFor.myReaction === emoji}
                  onClick={() => {
                    const line = menuFor;
                    setMenuFor(null);
                    void react(line, emoji);
                  }}
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-[26px] leading-none transition-transform active:scale-125 ${
                    menuFor.myReaction === emoji ? "bg-accent-tint ring-2 ring-accent" : ""
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <p className="truncate px-4 pb-2 text-[13px] text-muted">
              {menuFor.kind === "voice" ? t.chatVoiceQuote : menuFor.kind === "photo" ? t.chatPhotoQuote : menuFor.text}
            </p>
            {!menuFor.deleted ? (
              <button
                type="button"
                data-testid="chat-msg-reply"
                onClick={() => {
                  const line = menuFor;
                  setMenuFor(null);
                  setQuoting(line);
                }}
                className="block h-[52px] w-full rounded-2xl px-4 text-left text-[16px] font-semibold text-ink active:bg-chip"
              >
                {t.chatReply}
              </button>
            ) : null}
            {menuFor.mine && menuFor.kind !== "voice" && menuFor.kind !== "photo" ? (
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
            ) : null}
            {menuFor.mine ? (
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
            ) : null}
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
      {viewer ? (
        <PhotoViewer urls={viewer.urls} index={viewer.index} onClose={() => setViewer(null)} onIndex={(index) => setViewer({ urls: viewer.urls, index })} />
      ) : null}
      {attachOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(24,24,27,.45)]" onClick={() => setAttachOpen(false)}>
          <div className="w-full max-w-[430px] rounded-t-[24px] bg-white px-3 pb-6 pt-3" onClick={(event) => event.stopPropagation()}>
            <button type="button" data-testid="chat-camera" onClick={() => { setAttachOpen(false); openFileInput(cameraRef.current); }} className="block h-[52px] w-full rounded-2xl px-4 text-left text-[16px] font-semibold">
              {t.chatCamera}
            </button>
            <button type="button" data-testid="chat-gallery" onClick={() => { setAttachOpen(false); openFileInput(galleryRef.current); }} className="block h-[52px] w-full rounded-2xl px-4 text-left text-[16px] font-semibold">
              {t.postGallery}
            </button>
            <button type="button" onClick={() => setAttachOpen(false)} className="mt-1 block h-[48px] w-full text-[15px] font-semibold text-muted">
              {t.cardDeleteCancel}
            </button>
          </div>
        </div>
      ) : null}
    </PhoneShell>
  );
}
