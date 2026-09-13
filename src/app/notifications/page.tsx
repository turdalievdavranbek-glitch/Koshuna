"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { RoundBtn } from "@/components/ui";
import { useApp } from "@/lib/store";

export default function NotificationsPage() {
  const { t, markInboxRead } = useApp();
  const router = useRouter();
  useEffect(() => {
    markInboxRead();
    // Store actions are new each render; mark once when opening the inbox.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const items = [
    { id: "1", text: t.notif1, time: "09:20" },
    { id: "2", text: t.notif2, time: "09:16" },
    { id: "3", text: t.notif3, time: "08:41" },
  ];
  return (
    <PhoneShell>
      <div className="flex items-center gap-3 px-5 pt-1">
        <RoundBtn onClick={() => router.back()}>
          <IconBack size={16} color="#17140F" />
        </RoundBtn>
        <h1 className="font-display text-[22px] font-bold text-ink">{t.notifTitle}</h1>
      </div>
      <div className="mt-5 flex flex-col gap-2 px-5">
        {items.map((n) => (
          <div key={n.id} className="rounded-[18px] border border-line bg-white px-4 py-3.5">
            <div className="text-[15px] leading-[1.4] text-ink">{n.text}</div>
            <div className="mt-1 text-xs text-muted-2">{n.time}</div>
          </div>
        ))}
        <p className="mt-4 text-center text-[13px] text-muted-2">{t.notifEmpty}</p>
      </div>
    </PhoneShell>
  );
}
