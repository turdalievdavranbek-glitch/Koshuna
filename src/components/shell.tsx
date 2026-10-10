"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { pushOverlay, removeOverlay } from "@/lib/native-back";
import { searchRootPatch } from "@/lib/filter";
import { useApp } from "@/lib/store";
import { DesktopFooter, DesktopHeader } from "./desktop-shell";
import { PostChoices } from "./post-choice";
import { IconBag, IconHome, IconPlus, IconSearch, IconUser } from "./icons";
import { UploadStatus } from "./upload-status";
import { UnreadBadge } from "./unread-badge";
import { useChatUnread } from "@/lib/chat-unread";

type TabIcon = (p: { size?: number; color?: string }) => ReactNode;

const TAB_H = 78;

export function TabBar({ hidden }: { hidden?: boolean }) {
  const { t, user, setPendingPath, askLeave, setFilters } = useApp();
  const chatUnread = useChatUnread(user?.id ?? null);
  const path = usePathname();
  const router = useRouter();
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    if (!sheet) return;
    pushOverlay("post-sheet", () => setSheet(false));
    return () => removeOverlay("post-sheet");
  }, [sheet]);

  const go = (href: string) => {
    const run = () => {
      setSheet(false);
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
      setSheet(true);
    };
    if (askLeave(run)) return;
    run();
  };

  const item = (href: string, testId: string, label: string, Icon: TabIcon, active: boolean, badge = 0) => (
    <button
      type="button"
      onClick={() => go(href)}
      data-testid={testId}
      className="flex flex-1 flex-col items-center gap-1 pt-2"
    >
      <span className="relative flex">
        <Icon size={21} color={active ? "#B8452F" : "#A79C8C"} />
        <UnreadBadge count={badge} testId={`${testId}-badge`} className="-top-2 -right-3" />
      </span>
      <span className="text-[11px] font-semibold leading-tight" style={{ color: active ? "#B8452F" : "#A79C8C" }}>
        {label}
      </span>
    </button>
  );

  const homeOn = path === "/" || path.startsWith("/section");
  const searchOn = path === "/search" || path.startsWith("/search/");
  const favOn = path === "/favorites" || path.startsWith("/favorites/");
  const profileOn =
    path === "/profile" || path.startsWith("/profile/") || path === "/selling" || path.startsWith("/selling/");

  return (
    <nav
      className={`tabbar-nav z-30 flex shrink-0 items-center border-t border-line bg-surface px-1.5 ${hidden ? "pointer-events-none" : ""}`}
      style={{
        height: hidden ? 0 : TAB_H,
        overflow: hidden ? "hidden" : "visible",
        paddingBottom: hidden ? 0 : 8,
        borderTopWidth: hidden ? 0 : undefined,
      }}
    >
      {item("/", "tab-home", t.feed, IconHome, homeOn)}
      {item("/search", "tab-search", t.tabSearch, IconSearch, searchOn)}
      <div className="flex flex-1 justify-center">
        <button
          type="button"
          onClick={goPost}
          data-testid="tab-post"
          aria-label={t.newListing}
          className="shadow-fab -mt-6 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-accent"
        >
          <IconPlus size={26} color="#FFF7F0" />
        </button>
      </div>
      {item("/favorites", "tab-favorites", t.fav, IconBag, favOn)}
      {item("/profile", "tab-profile", t.sideDesk, IconUser, profileOn, chatUnread)}
      {sheet ? (
        <div className="absolute inset-0 z-40 flex items-end bg-[rgba(23,20,15,.45)] desk:items-center desk:justify-center desk:p-4" data-testid="post-sheet" onClick={() => setSheet(false)}>
          <div className="w-full rounded-t-[24px] bg-screen px-5 pb-8 pt-5 desk:max-w-[430px] desk:rounded-[24px]" onClick={(e) => e.stopPropagation()}>
            <div className="font-display text-[20px] font-bold text-ink">{t.postChoiceTitle}</div>
            <div className="mt-3">
              <PostChoices
                onPersonal={() => {
                  setSheet(false);
                  router.push("/post?type=personal");
                }}
                onBusiness={() => {
                  setSheet(false);
                  router.push("/post?type=business");
                }}
                onRequest={() => {
                  setSheet(false);
                  router.push("/post?type=request");
                }}
              />
            </div>
            <button type="button" className="mt-3 h-11 w-full text-[15px] font-semibold text-muted" onClick={() => setSheet(false)}>
              {t.postCancel}
            </button>
          </div>
        </div>
      ) : null}
    </nav>
  );
}

export function PhoneShell({ children, tab: _tab }: { children: ReactNode; tab?: boolean }) {
  const { t, online } = useApp();
  const path = usePathname();
  const [hidden, setHidden] = useState(false);
  const phoneRef = useRef<HTMLDivElement>(null);
  const reels = path === "/reels";
  const narrow =
    path === "/login" ||
    path === "/post" ||
    path === "/help" ||
    path === "/profile" ||
    path === "/profile/edit" ||
    path === "/shops/new" ||
    /^\/shops\/[^/]+\/edit$/.test(path);

  const hiddenRef = useRef(false);
  useEffect(() => {
    hiddenRef.current = false;
    setHidden(false);
  }, [path]);

  useEffect(() => {
    const root = phoneRef.current;
    if (!root) return;
    const tops = new WeakMap<EventTarget, number>();
    // Hiding/showing the tab bar resizes the scroll area by 78px. Near the bottom of a page the browser then
    // clamps scrollTop, which fires a scroll "up" and showed the bar again — a show/hide loop that froze and
    // jumped short pages (e.g. point products) on Android. Ignore the scroll events our own toggle causes and
    // never hide the bar on pages that barely scroll.
    let quietUntil = 0;
    const toggle = (next: boolean) => {
      if (next === hiddenRef.current) return;
      hiddenRef.current = next;
      quietUntil = performance.now() + 350;
      setHidden(next);
    };
    const onScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const room = target.scrollHeight - target.clientHeight;
      if (room <= 0) return;
      const top = target.scrollTop;
      const prev = tops.get(target) ?? 0;
      tops.set(target, top);
      if (performance.now() < quietUntil) return;
      if (top <= 24 || room < TAB_H * 3) {
        toggle(false);
        return;
      }
      // At the very bottom keep whatever is shown, so the resize can't bounce the page.
      if (room - top < TAB_H + 8) return;
      const delta = top - prev;
      if (Math.abs(delta) < 8) return;
      toggle(delta > 0);
    };
    root.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => root.removeEventListener("scroll", onScroll, true);
  }, []);

  return (
    <div className="flex h-[100%] max-h-[100dvh] min-h-0 justify-center overflow-hidden bg-canvas md:h-[100dvh] md:items-center md:py-6 desk:h-[100dvh] desk:items-stretch desk:bg-screen desk:py-0">
      <div
        ref={phoneRef}
        id="konshu-phone"
        className="relative flex h-full max-h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-screen md:h-[min(844px,calc(100dvh-48px))] md:max-h-[min(844px,calc(100dvh-48px))] md:max-w-[390px] md:rounded-[42px] md:border md:border-line md:shadow-[0_26px_64px_rgba(23,20,15,.14)] desk:h-full desk:max-h-[100dvh] desk:w-full desk:max-w-none desk:rounded-none desk:border-0 desk:shadow-none"
        style={{ "--tabbar-h": hidden ? "0px" : "78px" } as CSSProperties}
      >
        <DesktopHeader />
        {!online ? (
          <div className="flex h-7 shrink-0 items-center justify-center bg-ink text-[12px] text-screen">{t.offlineTitle}</div>
        ) : null}
        <div className={reels ? "flex min-h-0 flex-1 flex-col overflow-hidden desk:bg-ink" : "flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden"}>
          <div
            className={
              reels
                ? "contents"
                : `contents desk:mx-auto desk:flex desk:min-h-0 desk:w-full desk:flex-1 desk:flex-col ${
                    narrow
                      ? "desk:my-6 desk:max-w-[720px] desk:rounded-[28px] desk:border desk:border-line desk:bg-surface"
                      : "desk:max-w-[1280px] desk:px-6"
                  }`
            }
          >
            {children}
          </div>
          {reels ? null : <DesktopFooter />}
        </div>
        {reels ? null : (
          <div className="z-30 shrink-0 bg-surface desk:contents">
            <div className="desk:pointer-events-auto desk:fixed desk:right-6 desk:bottom-4 desk:z-50 desk:w-[min(100%-2rem,360px)]">
              <UploadStatus />
            </div>
            <div className="desk:hidden">
              <TabBar hidden={hidden} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
