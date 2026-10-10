"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PointFieldScreen, isPointField } from "@/components/point-field-screen";
import { PhoneShell } from "@/components/shell";
import { useApp } from "@/lib/store";

export default function ShopFieldPage() {
  const { id, field } = useParams<{ id: string; field: string }>();
  const { user, setPendingPath } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (user) return;
    setPendingPath(`/shops/${id}/set/${field}`);
    router.replace("/login");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!isPointField(field)) router.replace(`/shops/${id}`);
  }, [field, id, router]);

  if (!user || !isPointField(field)) return null;
  return (
    <PhoneShell focus>
      <PointFieldScreen shopId={id} field={field} />
    </PhoneShell>
  );
}
