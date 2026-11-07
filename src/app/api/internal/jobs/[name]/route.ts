import { jobsSecretOk } from "@/server/auth";
import { json } from "@/server/http";
import { JOBS } from "@/server/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ name: string }> };

export async function POST(req: Request, ctx: Ctx) {
  if (!jobsSecretOk(req.headers.get("x-jobs-secret"))) return json({ error: "not-found" }, 404);
  const { name } = await ctx.params;
  const run = JOBS[name as keyof typeof JOBS];
  if (!run) return json({ error: "unknown-job" }, 404);
  const result = await run();
  return json(result);
}
