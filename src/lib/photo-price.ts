import { validPrice } from "./shops";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

export function pickPriceFromText(raw: string): number | undefined {
  const text = raw.toLowerCase().replace(/[oо]/g, "0").replace(/[lіi]/g, "1");
  const found: number[] = [];
  const re = /\d{1,6}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const n = validPrice(m[0]);
    if (n != null) found.push(n);
  }
  const prices = found.filter((n) => n >= 1 && n <= 200000 && (n < 1900 || n > 2035));
  if (!prices.length) return found[0];
  return [...prices].sort((a, b) => String(b).length - String(a).length || b - a)[0];
}

function toGray(data: ImageData): Uint8Array {
  const out = new Uint8Array(data.width * data.height);
  for (let i = 0, p = 0; i < data.data.length; i += 4, p++) {
    out[p] = (data.data[i] * 0.299 + data.data[i + 1] * 0.587 + data.data[i + 2] * 0.114) | 0;
  }
  return out;
}

function otsu(gray: Uint8Array): number {
  const hist = new Array<number>(256).fill(0);
  for (const v of gray) hist[v]++;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let thresh = 140;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      thresh = i;
    }
  }
  return thresh;
}

const SEG_MAP: Record<string, string> = {
  "1111110": "0",
  "0110000": "1",
  "1101101": "2",
  "1111001": "3",
  "0110011": "4",
  "1011011": "5",
  "1011111": "6",
  "1110000": "7",
  "1111111": "8",
  "1111011": "9",
};

function inkRatio(bin: Uint8Array, w: number, x0: number, y0: number, x1: number, y1: number): number {
  let n = 0;
  let ink = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      n++;
      if (bin[y * w + x]) ink++;
    }
  }
  return n ? ink / n : 0;
}

function readSevenSeg(bin: Uint8Array, w: number, x: number, y: number, gw: number, gh: number): string | null {
  const x1 = x + gw;
  const y1 = y + gh;
  const t = 0.35;
  const midX = x + (gw >> 1);
  const midY = y + Math.floor(gh * 0.5);
  const third = Math.max(2, Math.floor(gh / 7));
  const half = Math.max(2, Math.floor(gw / 4));
  const a = inkRatio(bin, w, x + half, y, x1 - half, y + third) > t;
  const d = inkRatio(bin, w, x + half, y1 - third, x1 - half, y1) > t;
  const g = inkRatio(bin, w, x + half, midY - (third >> 1), x1 - half, midY + (third >> 1)) > t;
  const f = inkRatio(bin, w, x, y + third, x + half, midY) > t;
  const b = inkRatio(bin, w, x1 - half, y + third, x1, midY) > t;
  const e = inkRatio(bin, w, x, midY, x + half, y1 - third) > t;
  const c = inkRatio(bin, w, x1 - half, midY, x1, y1 - third) > t;
  const key = `${+a}${+b}${+c}${+d}${+e}${+f}${+g}`;
  if (SEG_MAP[key]) return SEG_MAP[key];
  const thin = inkRatio(bin, w, midX - half, y, midX + half, y1);
  if (gw / gh < 0.38 && thin > 0.28) return "1";
  return null;
}

function splitColumns(colInk: number[], minGap: number): Array<{ x: number; w: number }> {
  const cuts: Array<{ x: number; w: number }> = [];
  let i = 0;
  while (i < colInk.length) {
    while (i < colInk.length && colInk[i] <= minGap) i++;
    const start = i;
    while (i < colInk.length && colInk[i] > minGap) i++;
    if (i - start >= 3) cuts.push({ x: start, w: i - start });
  }
  return cuts;
}

export async function readDigitsFromPhoto(dataUrl: string): Promise<string> {
  if (typeof document === "undefined") return "";
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 560 / Math.max(img.width, img.height, 1));
  canvas.width = Math.max(48, Math.round(img.width * scale));
  canvas.height = Math.max(48, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const gray = toGray(imgData);
  const thr = Math.min(200, otsu(gray) + 12);
  const bin = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) bin[i] = gray[i] < thr ? 1 : 0;

  const { width: w, height: h } = canvas;
  const rowInk = new Array<number>(h).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) rowInk[y] += bin[y * w + x];
  }
  const rowMax = Math.max(...rowInk, 1);
  const peak = rowInk.indexOf(rowMax);
  let y0 = peak;
  let y1 = peak + 1;
  while (y0 > 0 && rowInk[y0 - 1] > rowMax * 0.22) y0--;
  while (y1 < h && rowInk[y1] > rowMax * 0.22) y1++;
  const band = Math.max(16, y1 - y0);
  const colInk = new Array<number>(w).fill(0);
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < w; x++) colInk[x] += bin[y * w + x];
  }
  const colMax = Math.max(...colInk, 1);
  const cols = splitColumns(colInk, colMax * 0.12);
  let text = "";
  for (const col of cols) {
    const digit = readSevenSeg(bin, w, col.x, y0, col.w, band);
    if (digit) text += digit;
  }
  return text;
}

export async function priceFromPhotoDataUrl(dataUrl: string): Promise<{ price?: number; raw: string; source: "local" }> {
  const raw = await readDigitsFromPhoto(dataUrl);
  return { price: pickPriceFromText(raw), raw, source: "local" };
}

export async function priceFromPhoto(dataUrl: string): Promise<{ price?: number; raw: string; source: "local" | "cloud" }> {
  const local = await priceFromPhotoDataUrl(dataUrl);
  try {
    const res = await fetch("/api/shops/price-from-photo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image: await jpegDataUrl(dataUrl, 480), local: local.price }),
    });
    const data = (await res.json()) as { ok?: boolean; price?: number; raw?: string };
    if (data.ok && data.price != null) return { price: data.price, raw: data.raw || local.raw, source: "cloud" };
  } catch {
    /* local is enough */
  }
  return local;
}

export async function jpegDataUrl(src: string, max = 900, quality = 0.72): Promise<string> {
  const img = await loadImage(src);
  const scale = Math.min(1, max / Math.max(img.width, img.height, 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

export function stillFromVideo(video: HTMLVideoElement): string {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 720;
  canvas.height = video.videoHeight || 960;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

function fillSeg(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillRect(x, y, w, h);
}

function drawSevenSeg(ctx: CanvasRenderingContext2D, digit: string, x: number, y: number, w: number, h: number) {
  const on = SEG_MAP;
  const key = Object.keys(on).find((k) => on[k] === digit);
  if (!key) return;
  const [a, b, c, d, e, f, g] = key.split("").map((v) => v === "1");
  const t = Math.max(10, Math.floor(h / 8));
  const pad = Math.floor(w * 0.08);
  ctx.fillStyle = "#17140f";
  if (a) fillSeg(ctx, x + pad, y, w - pad * 2, t);
  if (d) fillSeg(ctx, x + pad, y + h - t, w - pad * 2, t);
  if (g) fillSeg(ctx, x + pad, y + (h >> 1) - (t >> 1), w - pad * 2, t);
  if (f) fillSeg(ctx, x, y + pad, t, (h >> 1) - pad);
  if (b) fillSeg(ctx, x + w - t, y + pad, t, (h >> 1) - pad);
  if (e) fillSeg(ctx, x, y + (h >> 1), t, (h >> 1) - pad);
  if (c) fillSeg(ctx, x + w - t, y + (h >> 1), t, (h >> 1) - pad);
}

export function makeDemoPriceTag(price = 85): string {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 800;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#f4efe6";
  ctx.fillRect(0, 0, 640, 800);
  ctx.fillStyle = "#fff";
  ctx.fillRect(70, 140, 500, 520);
  ctx.strokeStyle = "#e4dcce";
  ctx.lineWidth = 6;
  ctx.strokeRect(70, 140, 500, 520);
  const digits = String(price);
  const dw = 150;
  const gap = 28;
  const total = digits.length * dw + (digits.length - 1) * gap;
  let x = (640 - total) / 2;
  for (const d of digits) {
    drawSevenSeg(ctx, d, x, 250, dw, 260);
    x += dw + gap;
  }
  ctx.fillStyle = "#6e6558";
  ctx.font = "bold 42px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("KGS", 320, 580);
  return canvas.toDataURL("image/jpeg", 0.92);
}
