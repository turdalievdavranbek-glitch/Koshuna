import { getSessionUser, sessionIsOwner } from "@/server/auth";
import { ownerStats, statsCsv } from "@/server/stats";

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

function missing() {
  return new Response(null, { status: 404 });
}

/** Owner only. Anyone else, including other admins, gets 404. */
export async function GET(req: Request) {
  if (!(await owner(req))) return missing();
  const stats = await ownerStats();
  const csv = new URL(req.url).searchParams.get("format") === "csv";
  if (!csv) {
    return Response.json(stats, { headers: { "cache-control": "no-store" } });
  }
  return new Response(statsCsv(stats), {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="statistika.csv"',
      "cache-control": "no-store",
    },
  });
}
