const FEED_W = 1080;
const FEED_H = 1350;

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
  w: number,
  h: number,
) {
  const scale = Math.max(w / srcW, h / srcH);
  const dw = srcW * scale;
  const dh = srcH * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function stampBrand(ctx: CanvasRenderingContext2D, logo: HTMLImageElement, w: number, h: number) {
  const fade = ctx.createLinearGradient(0, h - 320, 0, h);
  fade.addColorStop(0, "rgba(23,20,15,0)");
  fade.addColorStop(1, "rgba(23,20,15,0.78)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, h - 320, w, 320);

  const size = 96;
  const pad = 56;
  const x = w - pad - size;
  const y = h - pad - size;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(logo, x, y, size, size);
  ctx.restore();
  ctx.strokeStyle = "rgba(255,247,240,0.9)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2 - 1, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#F7F3EC";
  ctx.font = "800 52px ui-sans-serif, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("Koshuna", pad, y + size / 2 - 16);
  ctx.font = "600 26px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(247,243,236,0.88)";
  ctx.fillText("объявления от соседа", pad, y + size / 2 + 24);
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("blob"))),
      "image/jpeg",
      0.88,
    );
  });
}

/** 4:5 still with Koshuna mark — for the seller’s own Facebook / Instagram / Telegram page. */
export async function watermarkFeedStill(photoSrc: string): Promise<Blob> {
  const [photo, logo] = await Promise.all([loadImage(photoSrc), loadImage("/brand/logo.png")]);
  const canvas = document.createElement("canvas");
  canvas.width = FEED_W;
  canvas.height = FEED_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("ctx");
  coverDraw(ctx, photo, photo.naturalWidth, photo.naturalHeight, FEED_W, FEED_H);
  stampBrand(ctx, logo, FEED_W, FEED_H);
  return canvasToJpeg(canvas);
}

export async function watermarkVideoFrame(videoSrc: string): Promise<Blob> {
  const video = document.createElement("video");
  if (!sameOriginSrc(videoSrc)) video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.src = videoSrc;
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
    /* keep frame 0 */
  }
  const logo = await loadImage("/brand/logo.png");
  const canvas = document.createElement("canvas");
  canvas.width = FEED_W;
  canvas.height = FEED_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("ctx");
  coverDraw(ctx, video, video.videoWidth || FEED_W, video.videoHeight || FEED_H, FEED_W, FEED_H);
  stampBrand(ctx, logo, FEED_W, FEED_H);
  return canvasToJpeg(canvas);
}

export function shareFileSupported(): boolean {
  const file = new File(["x"], "x.jpg", { type: "image/jpeg" });
  return typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
}
