"use client";

import { useEffect, useState } from "react";
import { recoverOnce } from "@/lib/recover";

/** Replaces Next's blank «Application error» screen: one automatic cache-clear + reload, then a retry button. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const [tried, setTried] = useState(false);
  useEffect(() => {
    console.error("client crash", error?.name, error?.message);
    if (!recoverOnce()) setTried(true);
  }, [error]);
  return (
    <html lang="ru">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F7F3EC", color: "#17140F" }}>
        <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{tried ? "Не удалось загрузить Коңшу" : "Обновляем Коңшу…"}</div>
          {tried ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ height: 48, padding: "0 24px", borderRadius: 16, border: 0, background: "#B8452F", color: "#FFF7F0", fontSize: 16, fontWeight: 600 }}
            >
              Обновить / Жаңыртуу
            </button>
          ) : null}
        </div>
      </body>
    </html>
  );
}
