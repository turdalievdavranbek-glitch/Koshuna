"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { IconBag, IconHome, IconPlus, IconSearch, IconUser } from "./icons";
import { UploadStatus } from "./upload-status";

type TabIcon = (p: { size?: number; color?: string }) => ReactNode;

const TAB_H = 78;

export function TabBar({ hidden }: { hidden?: boolean }) {
  const { t, user, setPendingPath } = useApp();
  const path = usePathname();
  const router = useRouter();

  const go = (href: string) => {
    if ((href === "/profile" || href === "/favorites") && !user) {
      setPendingPath(href);
      router.push("/login");
      return;
    }
    router.push(href);
  };

  const goPost = () => {
    if (!user) {
      setPendingPath("/post");
      router.push("/login");
      return;
    }
    router.push("/post");
  };

  const item = (href: string, testId: string, label: string, Icon: TabIcon, active: boolean) => (
    <button
      type="button"
      onClick={() => go(href)}
      data-testid={testId}
      className="flex flex-1 flex-col items-center gap-1 pt-2"
    >
      <Icon size={21} color={active ? "#B8452F" : "#A79C8C"} />
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
      {item("/profile", "tab-profile", t.sideDesk, IconUser, profileOn)}
    </nav>
  );
}

export function PhoneShell({ children, tab: _tab }: { children: ReactNode; tab?: boolean }) {
  const { t, online } = useApp();
  const path = usePathname();
  const [hidden, setHidden] = useState(false);
  const phoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHidden(false);
  }, [path]);

  useEffect(() => {
    const root = phoneRef.current;
    if (!root) return;
    const tops = new WeakMap<EventTarget, number>();
    const onScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.scrollHeight <= target.clientHeight) return;
      const top = target.scrollTop;
      const prev = tops.get(target) ?? 0;
      tops.set(target, top);
      if (top <= 24) {
        setHidden(false);
        return;
      }
      const delta = top - prev;
      if (Math.abs(delta) < 8) return;
      setHidden(delta > 0);
    };
    root.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => root.removeEventListener("scroll", onScroll, true);
  }, []);

  return (
    <div className="flex h-[100%] max-h-[100dvh] min-h-0 justify-center overflow-hidden bg-canvas md:h-[100dvh] md:items-center md:py-6">
      <div
        ref={phoneRef}
        id="konshu-phone"
        className="relative flex h-full max-h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-screen md:h-[min(844px,calc(100dvh-48px))] md:max-h-[min(844px,calc(100dvh-48px))] md:max-w-[390px] md:rounded-[42px] md:border md:border-line md:shadow-[0_26px_64px_rgba(23,20,15,.14)]"
        style={{ "--tabbar-h": hidden ? "0px" : "78px" } as CSSProperties}
      >
        {!online ? (
          <div className="flex h-7 shrink-0 items-center justify-center bg-ink text-[12px] text-screen">{t.offlineTitle}</div>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">{children}</div>
        <div className="z-30 shrink-0 bg-surface">
          <UploadStatus />
          <TabBar hidden={hidden} />
        </div>
      </div>
    </div>
  );
}
