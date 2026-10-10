"use client";

import { LanguageGate } from "@/components/language-gate";
import { wireNativeShell } from "@/lib/native-shell";
import { hideNativeSplash } from "@/lib/native-splash";
import { AppProvider } from "@/lib/store";
import { useEffect, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    void wireNativeShell();
    // Any other first route (deep link, push tap): hide the splash shortly after the app shell paints.
    const splash = window.location.pathname === "/" ? 0 : window.setTimeout(hideNativeSplash, 1200);
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => window.clearTimeout(splash);
  }, []);
  return (
    <AppProvider>
      <LanguageGate />
      {children}
    </AppProvider>
  );
}
