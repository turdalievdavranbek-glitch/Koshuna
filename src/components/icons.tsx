import type { ReactNode, SVGProps } from "react";

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

export function Flag({ className }: { className?: string }) {
  return (
    <svg width="24" height="16" viewBox="0 0 30 20" className={className} style={{ borderRadius: 2, flex: "0 0 auto" }}>
      <rect width="30" height="20" fill="#E8112D" />
      <path
        d="M19.89 9.69L23.60 10.00L19.89 10.31ZM19.88 10.46L23.49 11.35L19.78 11.07ZM19.75 11.22L23.18 12.66L19.56 11.80ZM19.50 11.95L22.66 13.90L19.22 12.49ZM19.14 12.63L21.96 15.05L18.78 13.12ZM18.68 13.24L21.08 16.08L18.24 13.68ZM18.12 13.78L20.05 16.96L17.63 14.14ZM17.49 14.22L18.90 17.66L16.95 14.50ZM16.80 14.56L17.66 18.18L16.22 14.75ZM16.07 14.78L16.35 18.49L15.46 14.88ZM15.31 14.89L15.00 18.60L14.69 14.89ZM14.54 14.88L13.65 18.49L13.93 14.78ZM13.78 14.75L12.34 18.18L13.20 14.56ZM13.05 14.50L11.10 17.66L12.51 14.22ZM12.37 14.14L9.95 16.96L11.88 13.78ZM11.76 13.68L8.92 16.08L11.32 13.24ZM11.22 13.12L8.04 15.05L10.86 12.63ZM10.78 12.49L7.34 13.90L10.50 11.95ZM10.44 11.80L6.82 12.66L10.25 11.22ZM10.22 11.07L6.51 11.35L10.12 10.46ZM10.11 10.31L6.40 10.00L10.11 9.69ZM10.12 9.54L6.51 8.65L10.22 8.93ZM10.25 8.78L6.82 7.34L10.44 8.20ZM10.50 8.05L7.34 6.10L10.78 7.51ZM10.86 7.37L8.04 4.95L11.22 6.88ZM11.32 6.76L8.92 3.92L11.76 6.32ZM11.88 6.22L9.95 3.04L12.37 5.86ZM12.51 5.78L11.10 2.34L13.05 5.50ZM13.20 5.44L12.34 1.82L13.78 5.25ZM13.93 5.22L13.65 1.51L14.54 5.12ZM14.69 5.11L15.00 1.40L15.31 5.11ZM15.46 5.12L16.35 1.51L16.07 5.22ZM16.22 5.25L17.66 1.82L16.80 5.44ZM16.95 5.50L18.90 2.34L17.49 5.78ZM17.63 5.86L20.05 3.04L18.12 6.22ZM18.24 6.32L21.08 3.92L18.68 6.76ZM18.78 6.88L21.96 4.95L19.14 7.37ZM19.22 7.51L22.66 6.10L19.50 8.05ZM19.56 8.20L23.18 7.34L19.75 8.78ZM19.78 8.93L23.49 8.65L19.88 9.54Z"
        fill="#FFEF00"
      />
      <circle cx="15" cy="10" r="4.9" fill="#FFEF00" />
      <g fill="none" stroke="#E8112D" strokeWidth="0.62" strokeLinecap="round">
        <path d="M10.6 10q4.4-2.9 8.8 0" />
        <path d="M10.6 10q4.4 2.9 8.8 0" />
        <path d="M15 5.6q2.9 4.4 0 8.8" />
        <path d="M15 5.6q-2.9 4.4 0 8.8" />
        <circle cx="15" cy="10" r="4.9" strokeWidth="0.5" />
      </g>
    </svg>
  );
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
