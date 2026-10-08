"use client";

import { LanguageGate } from "@/components/language-gate";
import { wireNativeShell } from "@/lib/native-shell";
import { AppProvider } from "@/lib/store";
import { useEffect, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    void wireNativeShell();
  }, []);
  return (
    <AppProvider>
      <LanguageGate />
      {children}
    </AppProvider>
  );
}
