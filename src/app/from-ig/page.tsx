"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FromInstagramRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/from/instagram");
  }, [router]);
  return null;
}
