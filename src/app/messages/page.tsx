"use client";

import { PhoneShell } from "@/components/shell";
import { MessageInbox } from "@/components/message-inbox";
import { useApp } from "@/lib/store";

export default function MessagesPage() {
  const { t } = useApp();
  return (
    <PhoneShell>
      <div className="contents desk:grid desk:min-h-0 desk:flex-1 desk:grid-cols-[360px_minmax(0,1fr)]">
        <div className="contents desk:flex desk:min-h-0 desk:flex-col desk:overflow-hidden desk:border-r desk:border-line">
          <MessageInbox />
        </div>
        <div className="hidden desk:flex desk:items-center desk:justify-center desk:p-8">
          <p className="text-center text-[15px] leading-[1.5] text-muted">{t.deskPickChat}</p>
        </div>
      </div>
    </PhoneShell>
  );
}
