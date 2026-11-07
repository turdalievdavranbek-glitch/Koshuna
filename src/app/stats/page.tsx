import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { OwnerStatsScreen } from "@/components/owner-stats";
import { getSessionUser, sessionIsOwner } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const token = (await cookies()).get("ksid")?.value;
  let allowed = false;
  try {
    const user = await getSessionUser(new Request("https://koshuna.ru/stats", { headers: token ? { cookie: `ksid=${token}` } : {} }));
    allowed = Boolean(user && (await sessionIsOwner(user.id)));
  } catch {
    allowed = false;
  }
  if (!allowed) notFound();
  return <OwnerStatsScreen />;
}
