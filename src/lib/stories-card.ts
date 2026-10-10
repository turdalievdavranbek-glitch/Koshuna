const W = 1080;
const H = 1920;
const PHOTO_H = Math.round(H * 0.65);
const BG = "#F7F3EC";

function sameOriginSrc(src: string) {
  return (
    src.startsWith("/") ||
    src.startsWith("blob:") ||
    src.startsWith("data:") ||
    (typeof window !== "undefined" && src.startsWith(window.location.origin))
  );
}

function loadFromUrl(src: string, cors: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  if (sameOriginSrc(src)) return loadFromUrl(src, false);
  try {
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) throw new Error("fetch");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    try {
      return await loadFromUrl(url, false);
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return loadFromUrl(src, true);
  }
}

function coverDraw(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  srcW: number,
  srcH: number,
  dx: number,
  dy: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / srcW, h / srcH);
  const dw = srcW * scale;
  const dh = srcH * scale;
  ctx.drawImage(img, dx + (w - dw) / 2, dy + (h - dh) / 2, dw, dh);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length > maxLines) lines.length = maxLines;
  const consumed = lines.join(" ");
  if (lines.length === maxLines && consumed.length < text.trim().length) {
    const last = lines[maxLines - 1] ?? "";
    lines[maxLines - 1] = last.length > 1 ? `${last.slice(0, -1)}…` : "…";
  }
  return lines;
}

async function videoFrame(src: string): Promise<HTMLVideoElement | null> {
  try {
    const video = document.createElement("video");
    if (!sameOriginSrc(src)) video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.src = src;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("video"));
      window.setTimeout(() => reject(new Error("video-timeout")), 4000);
    });
    try {
      video.currentTime = Math.min(0.4, (video.duration || 1) * 0.12);
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        window.setTimeout(() => resolve(), 800);
      });
    } catch {
      /* keep the first frame */
    }
    return video;
  } catch {
    return null;
  }
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("blob"))), "image/jpeg", 0.9);
  });
}

export function shareFileSupported(): boolean {
  const file = new File(["x"], "x.jpg", { type: "image/jpeg" });
  return typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
}

/**
 * 1080×1920 Stories still. The photo fills the top ~65%.
 * Logo №5 sits in the bottom strip, not on the photo.
 */
export async function renderStoriesCard(input: {
  photoSrc?: string;
  videoSrc?: string;
  title: string;
  price: string;
  place: string;
}): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("ctx");
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  let drewPhoto = false;
  if (input.photoSrc) {
    try {
      const photo = await loadImage(input.photoSrc);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, PHOTO_H);
      ctx.clip();
      coverDraw(ctx, photo, photo.naturalWidth, photo.naturalHeight, 0, 0, W, PHOTO_H);
      ctx.restore();
      drewPhoto = true;
    } catch {
      drewPhoto = false;
    }
  }
  if (!drewPhoto && input.videoSrc) {
    const video = await videoFrame(input.videoSrc);
    if (video && video.videoWidth) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, PHOTO_H);
      ctx.clip();
      coverDraw(ctx, video, video.videoWidth, video.videoHeight, 0, 0, W, PHOTO_H);
      ctx.restore();
      drewPhoto = true;
    }
  }
  if (!drewPhoto) {
    ctx.fillStyle = "#EFE8DB";
    ctx.fillRect(0, 0, W, PHOTO_H);
  }

  const pad = 72;
  ctx.fillStyle = BG;
  ctx.fillRect(0, PHOTO_H, W, H - PHOTO_H);
  ctx.textBaseline = "top";
  ctx.fillStyle = "#17140F";
  ctx.font = "700 64px Manrope, ui-sans-serif, system-ui, sans-serif";
  const titleLines = wrapLines(ctx, input.title, W - pad * 2, 2);
  let y = PHOTO_H + 56;
  for (const line of titleLines) {
    ctx.fillText(line, pad, y);
    y += 78;
  }
  ctx.fillStyle = "#B8452F";
  ctx.font = "800 68px Manrope, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(input.price, pad, y + 16);
  ctx.fillStyle = "#6E6558";
  ctx.font = "600 40px Manrope, ui-sans-serif, system-ui, sans-serif";
  const place = wrapLines(ctx, input.place, W - pad * 2, 2);
  let py = y + 108;
  for (const line of place) {
    ctx.fillText(line, pad, py);
    py += 52;
  }

  const logoSize = 120;
  const logoY = H - 72 - logoSize;
  try {
    const logo = await loadImage("/brand/logo.png");
    ctx.drawImage(logo, pad, logoY, logoSize, logoSize);
  } catch {
    /* strip still names the site */
  }
  ctx.fillStyle = "#17140F";
  ctx.font = "700 44px Manrope, ui-sans-serif, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("koshuna.ru", pad + logoSize + 28, logoY + logoSize / 2);
  return canvasToJpeg(canvas);
}
