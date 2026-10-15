"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { pollTelegramLogin } from "@/lib/telegram-login";
import { useApp } from "@/lib/store";

/**
 * App Link target after Telegram «Подтвердить».
 * Finishes the same poll the login screen already uses. On the website, or if
 * the poll is already done, this only goes home. It never prints secrets.
 */
export default function TelegramBackPage() {
  const { lang, ready, pendingPath, acceptSignedInUser } = useApp();
  const router = useRouter();
  const acceptRef = useRef(acceptSignedInUser);
  acceptRef.current = acceptSignedInUser;
  const destRef = useRef("/");
  destRef.current = pendingPath || "/";

  useEffect(() => {
    if (!ready) return;
    let dead = false;
    void (async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const result = await pollTelegramLogin();
        if (dead) return;
        if (result.ok) {
          acceptRef.current(result.user, result.isNew, (href) => router.replace(href), destRef.current);
          return;
        }
        if (result.status === "blocked") {
          router.replace("/login?tg=blocked");
          return;
        }
        if (result.status !== "pending") {
          router.replace(destRef.current || "/");
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 400));
      }
      if (!dead) router.replace(destRef.current || "/");
    })();
    return () => {
      dead = true;
    };
  }, [ready, router]);

  const text = lang === "ky" ? "Коңшуга кайтып жатабыз…" : "Возвращаемся в Коңшу…";
  return (
    <main className="flex min-h-dvh items-center justify-center bg-screen px-6 text-center text-[15px] font-semibold text-ink">
      {text}
    </main>
  );
}
