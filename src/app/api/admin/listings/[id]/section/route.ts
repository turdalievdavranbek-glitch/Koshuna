import { NextResponse } from "next/server";
import { listingCategoryError } from "@/lib/listing-rules";
import { cleanSectionMove } from "@/lib/section-move";
import { sessionIsAdmin } from "@/server/auth";
import { guardCsrf, json, readJson, requireUser } from "@/server/http";
import { moveListingSection } from "@/server/section-move";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Admin only: «Сменить раздел». Role is checked here, not in the UI. */
export async function POST(req: Request, ctx: Ctx) {
  const blocked = guardCsrf(req);
  if (blocked) return blocked;
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  if (!(await sessionIsAdmin(user.id))) return json({ error: "forbidden" }, 403);
  const { id } = await ctx.params;
  const move = cleanSectionMove(await readJson<unknown>(req));
  if (!move) return json({ error: "bad-json" }, 400);
  const rule = listingCategoryError(
    {
      section: move.section,
      category: typeof move.category === "string" ? move.category : null,
      animalGroup: typeof move.animalGroup === "string" ? move.animalGroup : null,
      animalKind: typeof move.animalKind === "string" ? move.animalKind : null,
    },
    ["health-pharmacy"],
  );
  if (rule) return json({ ok: false, error: rule }, 400);
  const saved = await moveListingSection(user.id, id, move);
  if ("error" in saved) return json({ ok: false, error: saved.error }, saved.status);
  return json({ ok: true });
}
