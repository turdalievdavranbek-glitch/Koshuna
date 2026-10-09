"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { saveChatDraft, takeChatDraft } from "@/lib/chat-draft";
import { useApp } from "@/lib/store";
import { ScreenBack } from "@/components/back-button";
import { PhoneShell } from "@/components/shell";

export default function OpenChatPage() {
  const { listingId } = useParams<{ listingId: string }>();
  const router = useRouter();
  const { t, user, ready, setPendingPath } = useApp();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready || !listingId) return;
    if (!user) {
      setPendingPath(`/chat/open/${listingId}`);
      router.replace("/login");
      return;
    }
    let cancel = false;
    void api<{ id?: string }>(`/api/listings/${encodeURIComponent(listingId)}/chat`, { method: "POST", json: {} }).then((res) => {
      if (cancel) return;
      if (res.ok && res.data?.id) {
        const draft = takeChatDraft(`open:${listingId}`);
        if (draft) saveChatDraft(res.data.id, draft);
        router.replace(`/chat/${res.data.id}`);
        return;
      }
      if (res.status === 401) {
        setPendingPath(`/chat/open/${listingId}`);
        router.replace("/login");
        return;
      }
      const code = res.error;
      setError(code === "blocked" ? t.chatBlocked : code === "closed" || code === "own" ? t.chatNoSeller : t.chatFailed);
    });
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user?.id, listingId]);

  return (
    <PhoneShell>
      <div className="px-5 pt-2">
        <ScreenBack fallback={listingId ? `/listing/${listingId}` : "/"} />
        {error ? (
          <p className="mt-4 text-[15px] leading-[1.5] text-ink" data-testid="chat-open-error">
            {error}
          </p>
        ) : null}
      </div>
    </PhoneShell>
  );
}
