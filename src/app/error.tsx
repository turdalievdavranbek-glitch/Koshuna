"use client";

import { useEffect, useState } from "react";
import { recoverOnce } from "@/lib/recover";

/** Route-level crash (e.g. a chunk missing right after a deploy): reload once with fresh caches. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [tried, setTried] = useState(false);
  useEffect(() => {
    console.error("route crash", error?.name, error?.message);
    if (!recoverOnce()) setTried(true);
  }, [error]);
  return (
    <div style={{ minHeight: "60dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 17, fontWeight: 700 }}>{tried ? "Что-то пошло не так" : "Обновляем…"}</div>
      {tried ? (
        <button
          type="button"
          onClick={() => {
            reset();
            window.location.reload();
          }}
          style={{ height: 46, padding: "0 22px", borderRadius: 16, border: 0, background: "#B8452F", color: "#FFF7F0", fontSize: 15, fontWeight: 600 }}
        >
          Обновить / Жаңыртуу
        </button>
      ) : null}
    </div>
  );
}
