import { validPrice } from "./shops";

type Size = { w: number; h: number };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

export function pickPriceFromText(raw: string): number | undefined {
  const text = raw
    .toLowerCase()
    .replace(/[oо]/g, "0")
    .replace(/[lіi]/g, "1")
    .replace(/,/g, ".");
  const found: number[] = [];
  const re = /(\d{1,3}(?:[\s.]\d{3})+|\d+(?:[.,]\d{1,2})?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const n = validPrice(m[1].replace(/\s/g, "").replace(/\.\d{3}\b/g, (s) => s.replace(".", "")));
    if (n != null) found.push(n);
  }
  const prices = found.filter((n) => n >= 1 && n <= 200000 && (n < 1900 || n > 2035));
  if (!prices.length) return found[0];
  return [...prices].sort((a, b) => priceScore(b) - priceScore(a))[0];
}

function priceScore(n: number): number {
  const len = String(n).length;
  if (len >= 2 && len <= 5) return 20 - Math.abs(3 - len);
  return len;
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
  let thresh = 127;
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

function digitTemplates(): Float32Array[] {
  const w = 16;
  const h = 24;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  const out: Float32Array[] = [];
  for (const d of "0123456789") {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(d, w / 2, h / 2 + 1);
    out.push(normalizeInk(ctx.getImageData(0, 0, w, h)));
  }
  return out;
}

function normalizeInk(img: ImageData): Float32Array {
  const gray = toGray(img);
  const thr = otsu(gray);
  let minX = img.width;
  let minY = img.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (gray[y * img.width + x] < thr) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  const vec = new Float32Array(16 * 24);
  if (maxX < minX) return vec;
  const bw = Math.max(1, maxX - minX + 1);
  const bh = Math.max(1, maxY - minY + 1);
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 16; x++) {
      const sx = minX + Math.floor((x * bw) / 16);
      const sy = minY + Math.floor((y * bh) / 24);
      vec[y * 16 + x] = gray[sy * img.width + sx] < thr ? 1 : 0;
    }
  }
  return vec;
}

function corr(a: Float32Array, b: Float32Array): number {
  let n = 0;
  let both = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] || b[i]) n++;
    if (a[i] && b[i]) both++;
  }
  return n ? both / n : 0;
}

type Glyph = { x: number; y: number; w: number; h: number; vec: Float32Array };

function segmentGlyphs(gray: Uint8Array, size: Size, thr: number): Glyph[] {
  const { w, h } = size;
  const seen = new Uint8Array(w * h);
  const glyphs: Glyph[] = [];
  const stack: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (seen[i] || gray[i] >= thr) continue;
      stack.push(i);
      seen[i] = 1;
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      const cells: number[] = [];
      while (stack.length) {
        const p = stack.pop() as number;
        cells.push(p);
        const px = p % w;
        const py = (p / w) | 0;
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
        const nbs = [p - 1, p + 1, p - w, p + w];
        for (const n of nbs) {
          if (n < 0 || n >= w * h || seen[n]) continue;
          const nx = n % w;
          const ny = (n / w) | 0;
          if (Math.abs(nx - px) + Math.abs(ny - py) !== 1) continue;
          if (gray[n] >= thr) continue;
          seen[n] = 1;
          stack.push(n);
        }
      }
      const gw = maxX - minX + 1;
      const gh = maxY - minY + 1;
      if (cells.length < 18 || gh < 10 || gw < 3) continue;
      if (gw > w * 0.45 || gh > h * 0.7) continue;
      if (gw / gh > 1.2 || gh / gw > 5) continue;
      const fake: ImageData = {
        data: new Uint8ClampedArray(gw * gh * 4),
        width: gw,
        height: gh,
        colorSpace: "srgb",
      } as ImageData;
      for (const p of cells) {
        const px = (p % w) - minX;
        const py = ((p / w) | 0) - minY;
        const q = (py * gw + px) * 4;
        fake.data[q] = fake.data[q + 1] = fake.data[q + 2] = 0;
        fake.data[q + 3] = 255;
      }
      for (let k = 0; k < fake.data.length; k += 4) {
        if (!fake.data[k + 3]) {
          fake.data[k] = fake.data[k + 1] = fake.data[k + 2] = 255;
          fake.data[k + 3] = 255;
        }
      }
      glyphs.push({ x: minX, y: minY, w: gw, h: gh, vec: normalizeInk(fake) });
    }
  }
  glyphs.sort((a, b) => a.x - b.x || a.y - b.y);
  const medianH = glyphs.length ? glyphs.map((g) => g.h).sort((a, b) => a - b)[Math.floor(glyphs.length / 2)] : 0;
  return glyphs.filter((g) => !medianH || Math.abs(g.h - medianH) / medianH < 0.55);
}

export async function readDigitsFromPhoto(dataUrl: string): Promise<string> {
  if (typeof document === "undefined") return "";
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 480 / Math.max(img.width, 1));
  canvas.width = Math.max(40, Math.round(img.width * scale));
  canvas.height = Math.max(40, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const gray = toGray(imgData);
  const thr = otsu(gray);
  const templates = digitTemplates();
  if (!templates.length) return "";
  const glyphs = segmentGlyphs(gray, { w: canvas.width, h: canvas.height }, thr);
  let text = "";
  for (const g of glyphs) {
    let best = 0;
    let digit = "";
    for (let i = 0; i < templates.length; i++) {
      const s = corr(g.vec, templates[i]);
      if (s > best) {
        best = s;
        digit = String(i);
      }
    }
    if (best >= 0.42) text += digit;
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

export function makeDemoPriceTag(price = 85): string {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#f4efe6";
  ctx.fillRect(0, 0, 640, 480);
  ctx.fillStyle = "#fff";
  ctx.fillRect(90, 80, 460, 320);
  ctx.strokeStyle = "#e4dcce";
  ctx.lineWidth = 4;
  ctx.strokeRect(90, 80, 460, 320);
  ctx.fillStyle = "#17140f";
  ctx.font = "bold 140px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(price), 320, 230);
  ctx.font = "bold 36px sans-serif";
  ctx.fillStyle = "#6e6558";
  ctx.fillText("сом", 320, 330);
  return canvas.toDataURL("image/jpeg", 0.85);
}
