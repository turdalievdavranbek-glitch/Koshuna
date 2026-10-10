"use client";

import { useEffect, useState } from "react";
import { parsePinnedCircle, type PinnedCircle } from "./pinned-circle";

/** pinned is null when the keys are missing, expired, or the request failed. ready is false until that answer. */
export function usePinnedCircle(): { pinned: PinnedCircle | null; ready: boolean } {
  const [pinned, setPinned] = useState<PinnedCircle | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let dead = false;
    let timer = 0;
    void fetch("/api/config", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (dead) return;
        const config = body && typeof body === "object" ? (body as { config?: unknown }).config : undefined;
        const next = parsePinnedCircle(config);
        setPinned(next);
        setReady(true);
        if (!next) return;
        const wait = next.untilMs - Date.now();
        timer = window.setTimeout(() => setPinned(null), Math.max(0, wait));
      })
      .catch(() => {
        if (!dead) {
          setPinned(null);
          setReady(true);
        }
      });
    return () => {
      dead = true;
      window.clearTimeout(timer);
    };
  }, []);

  return { pinned, ready };
}
