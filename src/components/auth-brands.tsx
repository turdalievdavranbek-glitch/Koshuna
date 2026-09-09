import type { ReactNode, SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function box({ size = 18, ...rest }: P) {
  return { width: size, height: size, viewBox: "0 0 24 24", ...rest };
}

export function BrandGoogle(p: P) {
  return (
    <svg {...box(p)}>
      <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.6 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-2z" />
      <path fill="#34A853" d="M6.6 14.3 5.5 15.1 3.7 16.6C5.5 20.2 8.5 22.5 12 22.5c2.9 0 5.3-1 7.1-2.7l-3.1-2.4c-.8.6-1.9 1-3.1 1-2.4 0-4.4-1.6-5.1-3.8z" />
      <path fill="#4A90E2" d="M3.7 7.4C2.9 8.9 2.5 10.4 2.5 12s.4 3.1 1.2 4.6l2.9-2.3C6.3 13.5 6.1 12.8 6.1 12s.2-1.5.5-2.3z" />
      <path fill="#FBBC05" d="M12 5.7c1.6 0 3 .5 4.1 1.6l3-3C17.3 2.5 14.9 1.5 12 1.5 8.5 1.5 5.5 3.8 3.7 7.4l2.9 2.3C7.6 7.3 9.6 5.7 12 5.7z" />
    </svg>
  );
}

export function BrandFacebook(p: P) {
  return (
    <svg {...box(p)}>
      <circle cx="12" cy="12" r="10" fill="#1877F2" />
      <path fill="#fff" d="M13.4 17.5v-5.2h1.8l.3-2.1h-2.1V9.1c0-.6.2-1 1-1h1.2V5.2c-.2 0-.9-.1-1.8-.1-1.8 0-3 1.1-3 3.1v1.9H8.6v2.1h2.1v5.3z" />
    </svg>
  );
}

export function BrandApple(p: P) {
  return (
    <svg {...box(p)} fill="#17140F">
      <path d="M16.7 12.3c0-2.2 1.8-3.3 1.9-3.4-1-.15-2.2.6-2.7.6-.6 0-1.4-.6-2.4-.6-1.2 0-2.4.7-3 1.8-1.3 2.2-.3 5.5.9 7.3.6.9 1.3 1.8 2.2 1.8.9 0 1.2-.6 2.3-.6 1.1 0 1.4.6 2.3.6.9 0 1.6-.9 2.2-1.8.7-1 1-2 1-2.1-.1 0-1.9-.7-1.9-2.8zM15.2 7.2c.5-.6.8-1.4.7-2.2-.7 0-1.6.5-2.1 1.1-.5.5-.9 1.4-.8 2.2.8.1 1.6-.4 2.2-1.1z" />
    </svg>
  );
}

export function BrandWhatsApp(p: P) {
  return (
    <svg {...box(p)}>
      <circle cx="12" cy="12" r="10" fill="#25D366" />
      <path
        fill="#fff"
        d="M16.6 14.3c-.2-.1-1.2-.6-1.4-.7-.2-.1-.3-.1-.5.1s-.5.7-.7.8c-.1.1-.3.2-.5.1-.2-.1-.9-.3-1.7-1.1-.6-.6-1.1-1.3-1.2-1.5-.1-.2 0-.3.1-.4.1-.1.2-.3.3-.4.1-.1.1-.2.2-.4 0-.1 0-.3 0-.4 0-.1-.5-1.2-.7-1.6-.2-.4-.4-.4-.5-.4h-.4c-.1 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 3.9 3.4.5.2.9.4 1.3.5.5.2 1 .2 1.3.1.4-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1 0-.1-.2-.1-.4-.2zM12 4.6c-4 0-7.3 3.2-7.3 7.3 0 1.3.3 2.5.9 3.6L4.6 19.4l4.1-.9c1 .6 2.2.9 3.4.9 4 0 7.3-3.2 7.3-7.3S16 4.6 12 4.6z"
      />
    </svg>
  );
}

export function BrandTelegram(p: P) {
  return (
    <svg {...box(p)}>
      <circle cx="12" cy="12" r="10" fill="#2AABEE" />
      <path
        fill="#fff"
        d="M16.8 8.1 6.9 11.9c-.7.3-.7.7-.1.9l2.5.8 6.1-3.8c.2-.1.5 0 .3.2L10.4 15l.2 2.5c.1.4.4.5.7.3l1.6-1.3 2.6 1.9c.5.3.8.1 1-.5l1.8-8.2c.2-.8-.3-1.1-.5-.6z"
      />
    </svg>
  );
}

export function BrandInstagram(p: P) {
  return (
    <svg {...box(p)}>
      <defs>
        <linearGradient id="ig" x1="0" y1="24" x2="24" y2="0">
          <stop stopColor="#F58529" />
          <stop offset=".5" stopColor="#DD2A7B" />
          <stop offset="1" stopColor="#8134AF" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig)" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.7" />
      <circle cx="16.6" cy="7.4" r="1.1" fill="#fff" />
    </svg>
  );
}

export function BrandVk(p: P) {
  return (
    <svg {...box(p)}>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#0077FF" />
      <path
        fill="#fff"
        d="M13.1 16.5h1.3s.4-.1.6-.4c.2-.3 1.9-2.5 2.6-3.3.7-.8.1-.7-.5-.3-1.2.8-1.9 1.8-2.4 1.6-.4-.1-.3-.9-.3-1.4V9.7c0-.5.1-.8.4-.9.2-.1 1.1 0 1.1 0s.8-.1.4-.8c-.3-.6-1.4-.6-1.4-.6h-4s-.6 0-.8.5c-.2.4 0 .9.3 1.4.8 1.4.8 2.8.8 2.8s.1 1 .3 1.2c.1.1.3 0 .7-.4.6-.6 1.2-1.6 1.9-2.2.4-.4 1.1-.7.6.1-.4.7-1.9 2.6-2.1 2.9-.3.4-.2.6.2.6z"
      />
    </svg>
  );
}

export function brandMark(id: string, size = 20): ReactNode {
  const map: Record<string, (p: P) => ReactNode> = {
    google: BrandGoogle,
    facebook: BrandFacebook,
    apple: BrandApple,
    whatsapp: BrandWhatsApp,
    telegram: BrandTelegram,
    instagram: BrandInstagram,
    vk: BrandVk,
  };
  const Cmp = map[id];
  return Cmp ? <Cmp size={size} /> : null;
}
