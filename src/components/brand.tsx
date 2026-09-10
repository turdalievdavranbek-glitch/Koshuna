export const BRAND_NAME = "Koshuna";

export function BrandLogo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/brand/logo.png"
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
      <span className={`font-display font-extrabold tracking-[-0.02em] ${wordClass ?? "text-ink"}`}>{BRAND_NAME}</span>
    </span>
  );
}
