export const BRAND_NAME = "Коңшу";

export function BrandLogo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <img
      // 128px copy (11 KB) for the small header mark; the 512px original (308 KB) is only for share cards.
      src="/brand/logo-128.png"
      alt=""
      width={size}
      height={size}
      className={`inline-block shrink-0 rounded-full object-cover ${className ?? ""}`}
      style={{ width: size, height: size }}
    />
  );
}

export function BrandMark({
  size = 28,
  className,
  wordClass,
}: {
  size?: number;
  className?: string;
  wordClass?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <BrandLogo size={size} className="shadow-[0_0_0_1.5px_rgba(255,255,255,.7)]" />
      <span className={`whitespace-nowrap font-display font-extrabold leading-none tracking-[-0.02em] ${wordClass ?? "text-ink"}`}>{BRAND_NAME}</span>
    </span>
  );
}
