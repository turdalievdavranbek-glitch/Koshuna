import { getSessionUser, sessionIsOwner } from "@/server/auth";
import { ownerCourierRoster } from "@/server/couriers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function owner(req: Request) {
  try {
    const user = await getSessionUser(req);
    if (!user || !(await sessionIsOwner(user.id))) return null;
    return user;
  } catch {
    return null;
  }
}

/** Owner only. Anyone else, including other admins, gets 404. */
export async function GET(req: Request) {
  if (!(await owner(req))) return new Response(null, { status: 404 });
  return Response.json({ couriers: await ownerCourierRoster() }, { headers: { "cache-control": "no-store" } });
}
