import type { ReactNode, SVGProps } from "react";
import { BrandLogo } from "./brand";

type P = SVGProps<SVGSVGElement> & { size?: number; color?: string };

function base({ size = 18, color = "currentColor", ...rest }: P) {
  return { width: size, height: size, viewBox: "0 0 18 18", fill: "none", stroke: color, ...rest };
}

export function IconHome(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.2 9 3.4l6 4.8V15a1 1 0 0 1-1 1h-3v-4.2H7V16H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}
export function IconBag(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h10l-1 9H5z" />
      <path d="M6.6 6V4.4a2.4 2.4 0 0 1 4.8 0V6" />
    </svg>
  );
}
export function IconAnimal(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.4 11.2c0-3 2-5.4 5.6-5.4s5.6 2.4 5.6 5.4V15H3.4z" />
      <path d="M5.6 5.8 4.4 3.2M12.4 5.8l1.2-2.6" />
    </svg>
  );
}
export function IconCar(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.6 11.4h12.8M4 11.4 5.4 7h7.2l1.4 4.4M4.6 14v-2.6M13.4 14v-2.6" />
    </svg>
  );
}
export function IconCarRent(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.6 11.4h12.8M4 11.4 5.4 7h7.2l1.4 4.4" />
      <path d="M9 3v2.4M7.4 4.2 9 2.6l1.6 1.6" />
    </svg>
  );
}
export function IconHotel(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.8 14V6.4h12.4V14" />
      <path d="M2.8 9.8h12.4M6.4 9.8V6.4M11 9.8V14" />
    </svg>
  );
}
export function IconPen(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.4 3.4 14.6 6.6 6.8 14.4H3.6v-3.2z" />
      <path d="M9.4 5.4l3.2 3.2" />
    </svg>
  );
}
export function IconBriefcase(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.8 6.6h12.4V14H2.8z" />
      <path d="M6.8 6.6V4.8a1.2 1.2 0 0 1 1.2-1.2h2a1.2 1.2 0 0 1 1.2 1.2v1.8" />
    </svg>
  );
}
export function IconBlocks(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.6 14V9.6h5.2V14zM7.8 14V6.2H13V14z" />
      <path d="M2.6 9.6 5.2 7l2.6 2.6" />
    </svg>
  );
}
export function IconFork(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.2 2.8v5.2c0 1 .8 1.8 1.8 1.8V15.2" />
      <path d="M3.2 2.8v4.2M5.1 2.8v4.2M7 2.8v4.2" />
      <path d="M13.6 2.8c0 2.2-1.6 3.2-1.6 5.2V15.2" />
      <path d="M12 8h3.2" />
    </svg>
  );
}
export function IconCols({ count, color = "currentColor", size = 18, ...rest }: P & { count: 1 | 2 | 3 }) {
  const bars =
    count === 1
      ? [<rect key="1" x="4" y="3.5" width="10" height="11" rx="1.4" />]
      : count === 2
        ? [
            <rect key="1" x="3.2" y="3.5" width="5.2" height="11" rx="1.2" />,
            <rect key="2" x="9.6" y="3.5" width="5.2" height="11" rx="1.2" />,
          ]
        : [
            <rect key="1" x="2.6" y="3.5" width="3.4" height="11" rx="1" />,
            <rect key="2" x="7.3" y="3.5" width="3.4" height="11" rx="1" />,
            <rect key="3" x="12" y="3.5" width="3.4" height="11" rx="1" />,
          ];
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill={color} stroke="none" {...rest}>
      {bars}
    </svg>
  );
}
export function IconPin(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.7" strokeLinecap="round">
      <path d="M9 16s5-4.6 5-8A5 5 0 0 0 4 8c0 3.4 5 8 5 8z" />
      <circle cx="9" cy="8" r="1.7" />
    </svg>
  );
}
export function IconHeart(p: P & { filled?: boolean }) {
  const { filled, ...rest } = p;
  return (
    <svg
      {...base(rest)}
      fill={filled ? (p.color ?? "#B8452F") : "none"}
      stroke={p.color ?? (filled ? "#B8452F" : "currentColor")}
      strokeWidth={filled ? 1.4 : 1.6}
      strokeLinecap="round"
    >
      <path d="M9 15.4S2.6 11.5 2.6 7.3A3.7 3.7 0 0 1 9 5a3.7 3.7 0 0 1 6.4 2.3c0 4.2-6.4 8.1-6.4 8.1z" />
    </svg>
  );
}
export function IconBell(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.6" strokeLinecap="round">
      <path d="M4.5 7.5a4.5 4.5 0 0 1 9 0c0 3.3 1.2 4.5 1.2 4.5H3.3S4.5 10.8 4.5 7.5z" />
      <path d="M7.4 14.4a1.8 1.8 0 0 0 3.2 0" />
    </svg>
  );
}
export function IconSearch(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.7" strokeLinecap="round">
      <circle cx="8" cy="8" r="5" />
      <path d="m12 12 3.5 3.5" />
    </svg>
  );
}
export function IconSliders(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.7" strokeLinecap="round">
      <path d="M3 5.5h12M5.5 9h7M8 12.5h2" />
    </svg>
  );
}
export function IconUser(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.7" strokeLinecap="round">
      <circle cx="9" cy="6.4" r="2.9" />
      <path d="M3.6 15.8c0-2.9 2.4-4.7 5.4-4.7s5.4 1.8 5.4 4.7" />
    </svg>
  );
}
export function IconPlus(p: P) {
  return (
    <svg {...base(p)} strokeWidth="2" strokeLinecap="round">
      <path d="M9 4v10M4 9h10" />
    </svg>
  );
}
export function IconBack(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4 6 9l5 5" />
    </svg>
  );
}
export function IconChat(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.5 8.6c0 2.9-2.9 5.2-6.5 5.2-.8 0-1.6-.1-2.3-.3L3 15l1-2.8A5 5 0 0 1 2.5 8.6C2.5 5.7 5.4 3.4 9 3.4s6.5 2.3 6.5 5.2z" />
    </svg>
  );
}
export function IconPhone(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.2 3.4 7.6 6 6.2 7.6c.7 1.7 2.5 3.5 4.2 4.2L12 10.4l2.6 1.4v2.4c0 .6-.5 1.1-1.1 1-5.6-.5-9.8-4.7-10.3-10.3a1 1 0 0 1 1-1.1z" />
    </svg>
  );
}
export function IconWa(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.5 8.6c0 3.5-2.9 6.3-6.5 6.3-1.1 0-2.1-.2-3-.7L3 15.2l1.1-2.8a6 6 0 0 1-1.6-3.8C2.5 5.1 5.4 2.3 9 2.3s6.5 2.8 6.5 6.3z" />
    </svg>
  );
}
export function IconTg(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3 2.5 8.2l4.2 1.3L15.8 3.2 8.4 11l.4 4 2.2-3 3 2.4z" />
    </svg>
  );
}
export function IconShare(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.7" strokeLinecap="round">
      <path d="M12.5 6.5a2 2 0 1 0-1.9-2.6L6.9 5.7a2 2 0 1 0 0 4.6l3.7 1.8a2 2 0 1 0 .9-1.8L7.8 8.5" />
    </svg>
  );
}
export function IconLike(p: P & { filled?: boolean }) {
  const { filled, ...rest } = p;
  return (
    <svg
      {...base(rest)}
      fill={filled ? (p.color ?? "#2A6B57") : "none"}
      stroke={p.color ?? "currentColor"}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 8.2 8 2.8c.9 0 1.7.8 1.7 1.7V7h3.6c.9 0 1.6.9 1.4 1.8l-1 4.2c-.2.8-.9 1.3-1.7 1.3H5z" />
      <path d="M5 8.2V15H3.4V8.2z" />
    </svg>
  );
}
export function IconDislike(p: P & { filled?: boolean }) {
  const { filled, ...rest } = p;
  return (
    <svg
      {...base(rest)}
      fill={filled ? (p.color ?? "#B8452F") : "none"}
      stroke={p.color ?? "currentColor"}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 9.8 10 15.2c-.9 0-1.7-.8-1.7-1.7V11H4.7c-.9 0-1.6-.9-1.4-1.8l1-4.2C4.5 4.2 5.2 3.7 6 3.7h7z" />
      <path d="M13 9.8V3h1.6v6.8z" />
    </svg>
  );
}
export function IconCheck(p: P) {
  return (
    <svg {...base(p)} strokeWidth="2" strokeLinecap="round">
      <path d="m4 9.4 3.2 3.1L14 5.6" />
    </svg>
  );
}
export function IconCamera(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.6 6.2h2.2l1-1.6h6.4l1 1.6h2.2v7.2H2.6z" />
      <circle cx="9" cy="9.6" r="2.4" />
    </svg>
  );
}
export function IconImage(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.8 3.6h12.4v10.8H2.8z" />
      <path d="m2.8 11.6 3.4-3 3 2.6 2.6-2.4 3.4 3" />
    </svg>
  );
}
export function IconLocate(p: P) {
  return (
    <svg {...base(p)} strokeWidth="1.7" strokeLinecap="round">
      <path d="M9 2.5v2M9 13.5v2M2.5 9h2M13.5 9h2" />
      <circle cx="9" cy="9" r="3.2" />
    </svg>
  );
}
export function IconVerified({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="#2A6B57">
      <circle cx="9" cy="9" r="9" />
      <path d="m4.6 9.3 3.1 3L13.4 6" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Flag({ className, size = 18 }: { className?: string; size?: number }) {
  return <BrandLogo size={size} className={className} />;
}

export function sectionIcon(id: string, color = "#B8452F", size = 19) {
  const map: Record<string, (p: P) => ReactNode> = {
    rent: IconHome,
    secondhand: IconBag,
    animals: IconAnimal,
    cars: IconCar,
    "car-rental": IconCarRent,
    stays: IconHotel,
    services: IconPen,
    vacancies: IconBriefcase,
    construction: IconBlocks,
    restaurants: IconFork,
    home: IconHome,
    bag: IconBag,
  };
  const Cmp = map[id] ?? IconHome;
  return <Cmp size={size} color={color} />;
}
