"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatSom, listingById, ownerById } from "@/lib/data";
import { listingTitle } from "@/lib/i18n";
import { useApp } from "@/lib/store";
import { IconBack, IconPhone, IconVerified } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { Photo } from "@/components/ui";

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, lang, threads, addMessage, user } = useApp();
  const thread = threads.find((th) => th.id === id) ?? threads.find((th) => th.listingId === id);
  const listing = listingById(thread?.listingId ?? id);
  const owner = ownerById(thread?.ownerId ?? listing?.ownerId ?? "aida");
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages.length]);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  if (!user) return null;
  if (!thread || !listing || !owner) {
    return (
      <PhoneShell>
        <div className="p-6">{t.emptyInbox}</div>
      </PhoneShell>
    );
  }

  const send = (value = text) => {
    const v = value.trim();
    if (!v) return;
    addMessage(thread.id, v);
    setText("");
  };

  return (
    <PhoneShell>
      <div className="shrink-0 border-b border-line bg-white">
        <div className="flex items-center gap-3 px-4 pb-3 pt-1.5">
          <button type="button" onClick={() => router.back()}>
            <IconBack size={18} color="#17140F" />
          </button>
          <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-ink font-display text-base font-bold text-screen">
            {owner.initial}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-semibold text-ink">{owner.name}</span>
              {owner.verified ? <IconVerified size={14} /> : null}
            </div>
            <div className="text-xs font-semibold text-success">{t.online}</div>
          </div>
          <a href="tel:+996555123456">
            <IconPhone size={19} color="#17140F" />
          </a>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/listing/${listing.id}`)}
          className="mx-4 mb-3 flex items-center gap-2.5 rounded-[14px] border border-line bg-screen p-2 text-left"
        >
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[10px]">
            <Photo src={listing.photos[0]} alt="" />
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-medium leading-[1.3] text-ink">{listingTitle(listing, lang)}</div>
            <div className="mt-0.5 text-xs text-muted">
              {formatSom(listing.price)} KGS {listing.unit === "month" ? t.perMonthShort : ""} · {t.cities[listing.city]}
            </div>
          </div>
          <span className="text-xs font-semibold text-accent">{t.open}</span>
        </button>
      </div>

      <div className="sc flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-[18px]">
        <div className="self-center rounded-full bg-chip px-2.5 py-1 text-[11px] text-muted-2">{t.today}</div>
        {thread.messages.map((m) =>
          m.from === "system" ? (
            <div
              key={m.id}
              className="mt-1.5 max-w-[88%] self-center rounded-[14px] bg-accent-tint px-3.5 py-2.5 text-center text-xs leading-[1.5] text-safe"
            >
              {m.text}
            </div>
          ) : m.from === "me" ? (
            <div key={m.id} className="max-w-[78%] self-end rounded-[18px_18px_6px_18px] bg-ink px-3.5 py-2.5">
              <div className="text-[15px] leading-[1.45] text-screen">{m.text}</div>
              <div className="mt-1 text-right text-[11px] text-[rgba(247,243,236,.6)]">
                {m.time} · {t.read}
              </div>
            </div>
          ) : (
            <div key={m.id} className="max-w-[78%] self-start rounded-[18px_18px_18px_6px] border border-line bg-white px-3.5 py-2.5">
              <div className="text-[15px] leading-[1.45] text-ink">{m.text}</div>
              <div className="mt-1 text-right text-[11px] text-muted-2">{m.time}</div>
            </div>
          ),
        )}
        <div ref={end} />
      </div>

      <div className="sc flex gap-2 overflow-x-auto px-4 pb-2">
        {[t.qView, t.qBargain, t.qAddress, t.qGoLook].map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => send(q)}
            className="shrink-0 rounded-full border border-line bg-white px-3.5 py-2 text-[13px] font-semibold text-ink"
          >
            {q}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2.5 border-t border-line bg-white px-4 pb-[26px] pt-2.5">
        <button type="button" className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-chip text-xl text-ink">
          +
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t.msgPh}
          className="h-11 flex-1 rounded-full border border-line bg-screen px-4 text-[15px] outline-none placeholder:text-muted-2"
        />
        <button
          type="button"
          onClick={() => send()}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-accent"
        >
          <svg width="19" height="19" viewBox="0 0 18 18" fill="none" stroke="#FFF7F0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 3 2.5 8.2l4.2 1.3L15.8 3.2 8.4 11l.4 4 2.2-3 3 2.4z" />
          </svg>
        </button>
      </div>
    </PhoneShell>
  );
}
