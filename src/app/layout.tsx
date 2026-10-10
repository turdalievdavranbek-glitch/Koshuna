import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Bricolage_Grotesque, Familjen_Grotesk, Manrope } from "next/font/google";
import { OG_FALLBACK, SITE_DESCRIPTION, SITE_TITLE } from "@/lib/open-graph";
import { Providers } from "./providers";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  weight: ["700", "800"],
  variable: "--font-bricolage",
  // Latin-only display face; Russian/Kyrgyz text never uses it, so don't preload it before first paint.
  preload: false,
});

const familjen = Familjen_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-familjen",
  // Latin-only display face; Russian/Kyrgyz text never uses it, so don't preload it before first paint.
  preload: false,
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://koshuna.ru"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_FALLBACK],
    type: "website",
  },
  twitter: { card: "summary_large_image", images: [OG_FALLBACK] },
  appleWebApp: { capable: true, title: "Коңшу", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F7F3EC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${bricolage.variable} ${familjen.variable} ${manrope.variable} antialiased`}>
        <Script id="konshu-native-desk" strategy="beforeInteractive">
          {`try{var c=window.Capacitor;if(c&&typeof c.isNativePlatform==="function"&&c.isNativePlatform()){document.documentElement.classList.add("native")}}catch(e){}`}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
