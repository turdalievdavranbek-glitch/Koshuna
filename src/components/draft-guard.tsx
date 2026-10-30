"use client";

import { useEffect, useRef } from "react";

/** One same-URL history entry so browser Back can ask before leaving a draft. */
export function useDraftHistoryGuard(active: boolean, onAsk: () => void) {
  const guard = useRef(false);
  const ask = useRef(onAsk);
  const skip = useRef(false);
  ask.current = onAsk;

  useEffect(() => {
    if (!active) {
      guard.current = false;
      return;
    }
    if (!guard.current) {
      window.history.pushState({ ...(window.history.state ?? {}), konshuGuard: true }, "", window.location.href);
      guard.current = true;
    }
    const onPop = () => {
      if (skip.current) {
        skip.current = false;
        guard.current = false;
        return;
      }
      if (!guard.current) return;
      guard.current = false;
      ask.current();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [active]);

  return {
    stay() {
      if (guard.current) return;
      window.history.pushState({ ...(window.history.state ?? {}), konshuGuard: true }, "", window.location.href);
      guard.current = true;
    },
    leave() {
      skip.current = true;
      guard.current = false;
      if (window.history.state && (window.history.state as { konshuGuard?: boolean }).konshuGuard) {
        window.history.go(-2);
        return;
      }
      window.history.back();
    },
  };
}
