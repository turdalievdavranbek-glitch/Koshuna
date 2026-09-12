"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { IconHeart, IconHome, IconListings, IconPin, IconPlus, IconUser } from "./icons";

type TabIcon = (p: { size?: number; color?: string; filled?: boolean }) => ReactNode;

export function TabBar() {
  const { t, user, setPendingPath, side } = useApp();
  const path = usePathname();
  const router = useRouter();
  const selling = side === "sell";

  const goPost = () => {
    if (!user) {
      setPendingPath("/post");
      router.push("/login");
      return;
    }
    router.push("/post");
  };

  const item = (
    href: string,
    label: string,
    Icon: TabIcon,
    active: boolean,
    filled?: boolean,
  ) => (
    <Link
      href={href}
      className="flex flex-1 flex-col items-center gap-1 pt-2 no-underline"
    >
      <Icon size={21} color={active ? "#B8452F" : "#A79C8C"} filled={filled && active ? true : undefined} />
      <span className="text-[10px] font-semibold" style={{ color: active ? "#B8452F" : "#A79C8C" }}>
        {label}
      </span>
    </Link>
  );

  return (
    <nav className="flex h-[78px] shrink-0 items-center border-t border-line bg-surface pb-2 px-1.5">
      {item("/", t.feed, IconHome, path === "/" || path.startsWith("/section"))}
      {item("/map", t.map, IconPin, path === "/map")}
      <div className="flex flex-1 justify-center">
        <button
          type="button"
          onClick={goPost}
          aria-label={t.newListing}
          className="shadow-fab flex h-[50px] w-[50px] items-center justify-center rounded-full bg-accent"
        >
          <IconPlus size={22} color="#FFF7F0" />
        </button>
      </div>
      {selling
        ? item("/selling", t.myListingsShort, IconListings, path === "/selling", true)
        : item("/favorites", t.fav, IconHeart, path === "/favorites", true)}
      {item("/profile", selling ? t.sideDesk : t.profile, IconUser, path === "/profile")}
    </nav>
  );
}

export function StatusBar() {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between px-[26px] text-xs font-semibold text-ink">
      <span>9:41</span>
      <div className="flex items-center gap-[5px]">
        <span className="block h-[9px] w-4 rounded-[2px] border border-ink" />
        <span className="block h-[9px] w-[13px] rounded-[2px] bg-ink" />
        <span className="relative block h-[10px] w-[22px] rounded-[3px] border border-ink">
          <span className="absolute inset-[2px_8px_2px_2px] block rounded-[1px] bg-ink" />
        </span>
      </div>
    </div>
  );
}

export function PhoneShell({ children, tab: _tab }: { children: ReactNode; tab?: boolean }) {
  return (
    <div className="flex h-[100%] max-h-[100dvh] min-h-0 justify-center overflow-hidden bg-canvas md:h-[100dvh] md:items-center md:py-6">
      <div
        id="konshu-phone"
        className="relative flex h-full max-h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-screen md:h-[min(844px,calc(100dvh-48px))] md:max-h-[min(844px,calc(100dvh-48px))] md:max-w-[390px] md:rounded-[42px] md:border md:border-line md:shadow-[0_26px_64px_rgba(23,20,15,.14)]"
      >
        <StatusBar />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">{children}</div>
        <div className="z-30 shrink-0 bg-surface">
          <TabBar />
        </div>
      </div>
    </div>
  );
}
