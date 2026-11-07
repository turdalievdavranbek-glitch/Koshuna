"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const EVERY_MS = 5 * 60 * 1000;

async function serverBuild(): Promise<string> {
  try {
    const res = await fetch("/api/version", { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return "";
    const data = (await res.json()) as { build?: string };
    return data.build ?? "";
  } catch {
    return "";
  }
}

/**
 * A tab or the app WebView can stay open for days on an old build (old texts, old forms).
 * When the server build changes, reload on the next screen change or when the app comes back to the front.
 * Drafts are kept in storage, so a reload loses nothing.
 */
export function VersionWatch() {
  const pathname = usePathname();
  const first = useRef("");
  const stale = useRef(false);
  const seenPath = useRef(pathname);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      const build = await serverBuild();
      if (!alive || !build) return;
      if (!first.current) first.current = build;
      else if (build !== first.current) stale.current = true;
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (stale.current) {
        window.location.reload();
        return;
      }
      void check().then(() => {
        if (stale.current) window.location.reload();
      });
    };
    void check();
    const timer = window.setInterval(() => void check(), EVERY_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (seenPath.current === pathname) return;
    seenPath.current = pathname;
    if (stale.current) window.location.reload();
  }, [pathname]);

  return null;
}
