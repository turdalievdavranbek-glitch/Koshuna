"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/** Old watermark page. Stories are built from the share sheet on the listing. */
export default function StoryRedirect() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/listing/${id}`);
  }, [id, router]);
  return null;
}
