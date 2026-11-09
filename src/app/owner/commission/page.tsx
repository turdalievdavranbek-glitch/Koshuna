import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { OwnerCommissionScreen } from "@/components/owner-commission";
import { getSessionUser, sessionIsOwner } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function OwnerCommissionPage() {
  const token = (await cookies()).get("ksid")?.value;
  let allowed = false;
  try {
    const user = await getSessionUser(new Request("https://koshuna.ru/owner/commission", { headers: token ? { cookie: `ksid=${token}` } : {} }));
    allowed = Boolean(user && (await sessionIsOwner(user.id)));
  } catch {
    allowed = false;
  }
  if (!allowed) notFound();
  return <OwnerCommissionScreen />;
}
