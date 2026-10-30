import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
};

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, ctx: Ctx) {
  if (process.env.SERVE_MEDIA !== "1") return new Response("Not found", { status: 404 });
  const root = process.env.MEDIA_DIR;
  if (!root) return new Response("Not found", { status: 404 });
  const parts = (await ctx.params).path ?? [];
  if (!parts.length || parts.some((part) => !part || part === "." || part === ".." || part.includes("/") || part.includes("\\"))) {
    return new Response("Not found", { status: 404 });
  }
  const rootResolved = path.resolve(root);
  const full = path.resolve(rootResolved, ...parts);
  if (full !== rootResolved && !full.startsWith(rootResolved + path.sep)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const info = await stat(full);
    if (!info.isFile()) return new Response("Not found", { status: 404 });
    const stream = createReadStream(full);
    const type = MIME[path.extname(full).toLowerCase()] || "application/octet-stream";
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 200,
      headers: {
        "content-type": type,
        "content-length": String(info.size),
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
