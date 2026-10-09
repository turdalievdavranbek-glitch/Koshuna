"use client";

import { useRouter } from "next/navigation";
import { IncomingBuyRequests } from "@/components/buy-requests";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { RoundBtn } from "@/components/ui";
import { goBack } from "@/lib/go-back";
import { useApp } from "@/lib/store";

export default function RequestsPage() {
  const { t, user, setPendingPath } = useApp();
  const router = useRouter();

  return (
    <PhoneShell>
      <div className="flex items-center gap-3 px-5 pt-1">
        <RoundBtn label={t.backLeave} onClick={() => goBack(router, "/profile")}>
          <IconBack size={16} color="#17140F" />
        </RoundBtn>
        <h1 className="font-display text-[22px] font-bold text-ink">{t.buyRequestIncoming}</h1>
      </div>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-4">
        {!user ? (
          <div>
            <p className="text-[15px] leading-[1.45] text-muted">{t.notifSignIn}</p>
            <button
              type="button"
              onClick={() => {
                setPendingPath("/requests");
                router.push("/login");
              }}
              className="shadow-btn mt-4 h-12 w-full rounded-2xl bg-accent text-[15px] font-semibold text-accent-on"
            >
              {t.loginCta}
            </button>
          </div>
        ) : (
          <IncomingBuyRequests hideTitle />
        )}
      </div>
    </PhoneShell>
  );
}
