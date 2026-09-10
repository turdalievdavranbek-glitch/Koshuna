"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BrandFacebook, BrandInstagram, BrandTelegram, BrandWhatsApp } from "@/components/auth-brands";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { CHANNEL_DEMO_POST, hasChannel, parseSellerChannel } from "@/lib/channels";
import { MY_LISTING_IDS } from "@/lib/data";
import { socialShareHref } from "@/lib/share";
import { useApp } from "@/lib/store";
import { aiToDraftPatch, classifyListingSpeech } from "@/lib/video-ai";
import type { SellerChannel } from "@/lib/types";
import type { ReactNode } from "react";

const ICONS: Record<SellerChannel, ReactNode> = {
  instagram: <BrandInstagram size={28} />,
  facebook: <BrandFacebook size={28} />,
  telegram: <BrandTelegram size={28} />,
  whatsapp: <BrandWhatsApp size={28} />,
};

export default function FromChannelPage() {
  const raw = useParams<{ channel: string }>().channel;
  const channel = parseSellerChannel(raw);
  const { t, lang, user, setPendingPath, setDraft, linkChannel, extraListings, allListings } = useApp();
  const router = useRouter();
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState("");

  const title =
    channel === "facebook"
      ? t.bridgeFb
      : channel === "telegram"
        ? t.bridgeTg
        : channel === "whatsapp"
          ? t.bridgeWa
          : t.bridgeIg;
  const linked = channel ? hasChannel(user, channel) : false;
  const mine = useMemo(() => {
    const extras = extraListings;
    const seeded = MY_LISTING_IDS.map((id) => allListings.find((item) => item.id === id)).filter(Boolean);
    return [...extras, ...seeded].filter((item, i, all) => all.findIndex((row) => row && row.id === item?.id) === i);
  }, [allListings, extraListings]);
  const listing = mine[0];

  if (!channel) {
    return (
      <PhoneShell>
        <div className="px-5 pt-4">
          <button type="button" onClick={() => router.push("/")} className="text-[15px] font-semibold text-accent">
            {t.feed}
          </button>
        </div>
      </PhoneShell>
    );
  }

  const goLogin = (next: string) => {
    setPendingPath(next);
    router.push("/login");
  };

  const attach = () => {
    if (!user) {
      goLogin(`/from/${channel}`);
      return;
    }
    linkChannel(channel);
    setBusy(t.channelLinked);
  };

  const importPost = (text: string) => {
    const rawText = text.trim();
    if (!rawText) {
      setBusy(t.channelNeedPaste);
      return;
    }
    const guess = classifyListingSpeech(rawText);
    setDraft({
      transcript: rawText,
      photo: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=70",
      mediaKind: "photos",
      aiConfirmed: false,
      ...aiToDraftPatch(guess),
    });
    if (!user) {
      goLogin("/post");
      return;
    }
    router.push("/post");
  };

  const sendOut = () => {
    if (!listing) {
      router.push(user ? "/post" : "/login");
      return;
    }
    if (channel === "instagram") {
      router.push(`/story/${listing.id}`);
      return;
    }
    window.open(socialShareHref(channel, listing, t, lang), "_blank", "noreferrer");
  };

  return (
    <PhoneShell>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface"
        >
          <IconBack size={16} color="#17140F" />
        </button>
        <div className="mt-5 flex items-center gap-2.5">
          {ICONS[channel]}
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{title}</div>
        </div>
        <h1 className="mt-2 font-display text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-ink">
          {t.channelTitle}
        </h1>
        <p className="mt-3 text-[15px] leading-[1.55] text-muted">{t.channelLead}</p>

        <ol className="mt-5 flex flex-col gap-3">
          {[t.channelStep1, t.channelStep2, t.channelStep3].map((step, i) => (
            <li key={step} className="flex gap-3 rounded-[16px] border border-line bg-white p-3.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink font-display text-sm font-bold text-screen">
                {i + 1}
              </span>
              <span className="text-[14px] leading-[1.45] text-ink">{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-5 rounded-[18px] bg-accent-tint p-4">
          <div className="font-display text-[16px] font-bold text-accent-dark">{t.channelWhyTitle}</div>
          <p className="mt-1.5 text-[13px] leading-[1.5] text-safe">{t.channelWhy}</p>
        </div>

        <button
          type="button"
          onClick={attach}
          className="shadow-btn mt-6 flex h-[54px] w-full items-center justify-center rounded-2xl bg-accent text-base font-semibold text-accent-on"
        >
          {linked ? t.channelLinked : t.channelLink}
        </button>

        <label className="mt-5 block">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t.channelPaste}</span>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={t.channelPastePh}
            className="mt-1.5 min-h-[96px] w-full rounded-[14px] border border-line bg-white px-[15px] py-[13px] text-[15px] leading-[1.45] outline-none placeholder:text-muted-2"
          />
        </label>
        <button
          type="button"
          onClick={() => setPaste(CHANNEL_DEMO_POST[channel])}
          className="mt-2 h-11 w-full rounded-[12px] border border-line bg-accent-tint text-[13px] font-semibold text-accent-dark"
        >
          {t.channelDemo}
        </button>
        <button
          type="button"
          onClick={() => importPost(paste || CHANNEL_DEMO_POST[channel])}
          className="mt-2 flex h-[54px] w-full items-center justify-center rounded-2xl border border-line bg-white text-[15px] font-semibold text-ink"
        >
          {t.channelImport}
        </button>
        <button
          type="button"
          onClick={sendOut}
          className="mt-2 flex h-[54px] w-full items-center justify-center rounded-2xl border border-line bg-white text-[15px] font-semibold text-ink"
        >
          {t.channelSend}
        </button>
        {channel === "instagram" ? (
          <button
            type="button"
            onClick={() => router.push("/story/apt-sunny")}
            className="mt-2 flex h-[54px] w-full items-center justify-center rounded-2xl border border-line bg-white text-[15px] font-semibold text-ink"
          >
            {t.igExample}
          </button>
        ) : null}
        {busy ? <p className="mt-3 text-[13px] font-semibold text-success-ink">{busy}</p> : null}
      </div>
    </PhoneShell>
  );
}
