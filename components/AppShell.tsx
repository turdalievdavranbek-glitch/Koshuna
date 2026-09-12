"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

const TABS = [
  { href: "/", label: "Главная", icon: "⌂" },
  { href: "/favorites", label: "Избранное", icon: "♡" },
  { href: "/post", label: "Подать", icon: "+" },
  { href: "/info", label: "О нас", icon: "ⓘ" },
  { href: "/login", label: "Профиль", icon: "☺" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useStore((s) => s.user);
  const city = useStore((s) => s.city);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-row">
          <Link href="/" className="brand">
            <h1>Кошуна</h1>
            <span>объявления рядом с домом</span>
          </Link>
          <button className="city-chip" type="button" onClick={() => router.push("/login")}>
            {user ? user.phone : city}
          </button>
        </div>
      </header>
      <main className="page">{children}</main>
      <nav className="nav">
        {TABS.map((tab) => {
          const on =
            tab.href === "/"
              ? pathname === "/"
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          if (tab.href === "/post") {
            return (
              <Link key={tab.href} href={tab.href} className={on ? "on" : ""}>
                <span className="plus">+</span>
                Подать
              </Link>
            );
          }
          return (
            <Link key={tab.href} href={tab.href} className={on ? "on" : ""}>
              <span>{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
