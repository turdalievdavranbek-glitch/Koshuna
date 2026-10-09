"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand";
import { IconBell, IconBag, IconChat, IconPin, IconSearch, IconUser } from "@/components/icons";
import { PostChoices } from "@/components/post-choice";
import { PLAY } from "@/components/play-banner";
import { LangSwitch } from "@/components/ui";
import { openLocationPicker, shownLocationLabel } from "@/components/location-line";
import { FEATURES } from "@/lib/features";
import { searchRootPatch } from "@/lib/filter";
import { helpWhatsAppUrl } from "@/lib/help";
import { pushOverlay, removeOverlay } from "@/lib/native-back";
import { useNotices } from "@/lib/notices";
import { useApp } from "@/lib/store";

export function DesktopHeader() {
  const { t, lang, city, filters, setFilters, user, setPendingPath, askLeave } = useApp();
  const { unread } = useNotices(user?.id ?? null);
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const hasUnread = unread > 0;

  useEffect(() => {
    if (!open) return;
    pushOverlay("post-sheet", () => setOpen(false));
    return () => removeOverlay("post-sheet");
  }, [open]);

  const go = (href: string) => {
    const run = () => {
      setOpen(false);
      if (href === "/profile" && !user) {
        setPendingPath(href);
        router.push("/login");
        return;
      }
      if (href === "/search" && path !== "/search" && path !== "/filters") {
        setFilters(searchRootPatch());
      }
      router.push(href);
    };
    if (askLeave(run)) return;
    run();
  };

  const goPost = () => {
    const run = () => {
      if (!user) {
        setPendingPath("/post");
        router.push("/login");
        return;
      }
      setOpen(true);
    };
    if (askLeave(run)) return;
    run();
  };

  const submitSearch = () => {
    const run = () => {
      if (path !== "/search" && path !== "/filters") setFilters(searchRootPatch());
      if (path !== "/search") router.push("/search");
    };
    if (askLeave(run)) return;
    run();
  };

  const icon = (href: string, label: string, node: ReactNode, testId: string) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-testid={testId}
      onClick={() => go(href)}
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface"
    >
      {node}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 hidden h-16 shrink-0 border-b border-line bg-screen desk:block">
      <div className="mx-auto flex h-full max-w-[1280px] items-center gap-3 px-6">
        <Link href="/" className="shrink-0" aria-label={t.feed}>
          <BrandMark size={32} wordClass="text-[22px] text-ink" />
        </Link>
        <form
          className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-line bg-surface px-3"
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch();
          }}
        >
          <IconSearch size={17} color="#A79C8C" />
          <input
            type="search"
            value={filters.query}
            onChange={(event) => setFilters({ query: event.target.value })}
            placeholder={t.tabSearch}
            aria-label={t.tabSearch}
            data-testid="desk-search"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted-2"
          />
          <button type="submit" className="shrink-0 text-[13px] font-semibold text-accent" aria-label={t.tabSearch}>
            {t.tabSearch}
          </button>
        </form>
        <button
          type="button"
          data-testid="desk-location"
          onClick={() => openLocationPicker(router, path || "/")}
          className="flex h-10 max-w-[220px] shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[13px] font-semibold text-ink"
        >
          <IconPin size={14} color="#B8452F" />
          <span className="truncate">{shownLocationLabel(lang, city, filters, t)}</span>
        </button>
        <LangSwitch size="sm" />
        <Link
          href="/notifications"
          data-testid="desk-bell"
          aria-label={t.notifications}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface"
        >
          <IconBell size={18} color="#17140F" />
          {hasUnread ? (
            <span className="absolute top-1.5 right-1.5 h-[7px] w-[7px] rounded-full border-[1.5px] border-white bg-accent" />
          ) : null}
        </Link>
        {icon("/messages", t.inbox, <IconChat size={18} color="#17140F" />, "desk-messages")}
        {icon("/favorites", t.fav, <IconBag size={18} color="#17140F" />, "desk-cart")}
        {icon("/profile", t.sideDesk, <IconUser size={18} color="#17140F" />, "desk-profile")}
        <button
          type="button"
          data-testid="desk-post"
          onClick={goPost}
          className="shadow-btn h-10 shrink-0 rounded-full bg-accent px-4 text-[14px] font-semibold text-accent-on"
        >
          {t.deskPost}
        </button>
      </div>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,20,15,.45)] p-4"
          data-testid="post-sheet"
          onClick={() => setOpen(false)}
        >
          <div className="w-full max-w-[430px] rounded-[24px] bg-screen px-5 pb-8 pt-5" onClick={(event) => event.stopPropagation()}>
            <div className="font-display text-[20px] font-bold text-ink">{t.postChoiceTitle}</div>
            <div className="mt-3">
              <PostChoices
                onPersonal={() => {
                  setOpen(false);
                  router.push("/post?type=personal");
                }}
                onBusiness={() => {
                  setOpen(false);
                  router.push("/post?type=business");
                }}
                onRequest={() => {
                  setOpen(false);
                  router.push("/post?type=request");
                }}
              />
            </div>
            <button type="button" className="mt-3 h-11 w-full text-[15px] font-semibold text-muted" onClick={() => setOpen(false)}>
              {t.postCancel}
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function DesktopFooter() {
  const { t } = useApp();
  const play = FEATURES.playBanner;
  return (
    <footer className="hidden shrink-0 border-t border-line bg-screen desk:block">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-2 px-6 py-6 text-[14px] text-muted">
        <Link href="/privacy" className="font-semibold text-ink">
          {t.privacyPolicy}
        </Link>
        <Link href="/terms" className="font-semibold text-ink">
          {t.deskTerms}
        </Link>
        <a href={helpWhatsAppUrl()} target="_blank" rel="noreferrer" className="font-semibold text-ink">
          {t.deskHelp}
        </a>
        {play ? (
          <a href={PLAY} target="_blank" rel="noreferrer" className="font-semibold text-accent">
            {t.deskDownload}
          </a>
        ) : (
          <span>
            {t.deskDownload}: {t.deskPlaySoon}
          </span>
        )}
        <span className="ml-auto">© Коңшу</span>
      </div>
    </footer>
  );
}
