"use client";

import { useRouter } from "next/navigation";
import { goBack } from "@/lib/go-back";
import { useApp } from "@/lib/store";
import { IconBack } from "./icons";

export function ScreenBack({ fallback }: { fallback: string }) {
  const router = useRouter();
  const { t } = useApp();
  return (
    <button
      type="button"
      data-testid="screen-back"
      aria-label={t.backLeave}
      onClick={() => goBack(router, fallback)}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface"
    >
      <IconBack size={16} color="#17140F" />
    </button>
  );
}
