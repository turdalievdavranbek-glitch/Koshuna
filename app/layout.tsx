import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Кошуна — объявления Кыргызстана",
  description: "Маркетплейс с вложенными разделами: Авто, избранное и подача объявлений.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
