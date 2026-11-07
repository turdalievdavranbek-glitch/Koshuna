import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { OwnerCouriersScreen } from "@/components/owner-couriers";
import { getSessionUser, sessionIsOwner } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function OwnerCouriersPage() {
  const token = (await cookies()).get("ksid")?.value;
  let allowed = false;
  try {
    const user = await getSessionUser(new Request("https://koshuna.ru/owner/couriers", { headers: token ? { cookie: `ksid=${token}` } : {} }));
    allowed = Boolean(user && (await sessionIsOwner(user.id)));
  } catch {
    allowed = false;
  }
  if (!allowed) notFound();
  return <OwnerCouriersScreen />;
}
