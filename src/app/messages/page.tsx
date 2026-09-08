"use client";

import { useRouter } from "next/navigation";
import { listingById, ownerById } from "@/lib/data";
import { listingTitle } from "@/lib/i18n";
import { useApp } from "@/lib/store";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { Photo, RoundBtn } from "@/components/ui";

export default function MessagesPage() {
  const { t, lang, user, threads, setPendingPath } = useApp();
  const router = useRouter();

  if (!user) {
    return (
      <PhoneShell>
        <div className="px-5 pt-2">
          <RoundBtn onClick={() => router.back()}>
            <IconBack size={16} color="#17140F" />
          </RoundBtn>
          <h1 className="mt-4 font-display text-[28px] font-extrabold text-ink">{t.inbox}</h1>
          <p className="mt-3 text-[15px] text-muted">{t.emptyInboxHint}</p>
          <button
            type="button"
            onClick={() => {
              setPendingPath("/messages");
              router.push("/login");
            }}
            className="shadow-btn mt-6 h-[54px] w-full rounded-2xl bg-accent font-semibold text-accent-on"
          >
            {t.loginCta}
          </button>
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell>
      <div className="flex items-center gap-3 px-5 pt-1">
        <RoundBtn onClick={() => router.back()}>
          <IconBack size={16} color="#17140F" />
        </RoundBtn>
        <h1 className="font-display text-[22px] font-bold text-ink">{t.inbox}</h1>
      </div>
      <div className="sc mt-4 min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        {threads.length === 0 ? (
          <p className="mt-8 text-center text-muted">{t.emptyInbox}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {threads.map((th) => {
              const listing = listingById(th.listingId);
              const owner = ownerById(th.ownerId);
              if (!listing || !owner) return null;
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => router.push(`/chat/${th.id}`)}
                  className="flex w-full items-center gap-3 rounded-[18px] border border-line bg-white p-3 text-left"
                >
                  <div className="h-12 w-12 overflow-hidden rounded-full">
                    <Photo src={listing.photos[0]} alt="" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">{owner.name}</span>
                      <span className="text-xs text-muted-2">{th.time}</span>
                    </div>
                    <div className="truncate text-[13px] text-muted">{th.preview || listingTitle(listing, lang)}</div>
                  </div>
                  {th.unread ? <span className="h-2.5 w-2.5 rounded-full bg-accent" /> : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </PhoneShell>
  );
}
