"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenBack } from "@/components/back-button";
import { draftUnfinished } from "@/lib/draft-media";
import { useApp } from "@/lib/store";
import type { DraftListing } from "@/lib/types";

function savedClock(iso: string | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function DraftContinueCard({ onOpen }: { onOpen: (draft: DraftListing) => void }) {
  const { t, draft, discardDraft } = useApp();
  const [ask, setAsk] = useState(false);
  if (!draftUnfinished(draft)) return null;
  const price = draft.priceNegotiable ? t.priceNegotiable : draft.price ? `${draft.price} KGS` : "";
  return (
    <div className="mb-3 rounded-[16px] border border-line bg-white p-3" data-testid="draft-card">
      <button type="button" data-testid="draft-continue" onClick={() => onOpen(draft)} className="flex w-full items-center gap-3 text-left">
        {draft.photo ? (
          <span className="h-14 w-14 rounded-[10px] bg-cover bg-center" style={{ backgroundImage: `url("${draft.photo}")` }} />
        ) : (
          <span className="h-14 w-14 rounded-[10px] bg-chip" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink">{draft.title.trim() || t.draftUntitled}</span>
          <span className="mt-0.5 block text-[12px] text-muted">
            {price}
            {draft.savedAt ? ` · ${t.draftSavedAt.replace("{time}", savedClock(draft.savedAt))}` : ""}
          </span>
        </span>
      </button>
      <button type="button" data-testid="draft-delete" className="mt-2 text-[13px] font-semibold text-accent" onClick={() => setAsk(true)}>
        {t.draftDelete}
      </button>
      {ask ? (
        <div className="mt-2 rounded-[12px] bg-chip p-3">
          <p className="text-[13px]">{t.draftDeleteAsk}</p>
          <button
            type="button"
            className="mt-2 text-[13px] font-bold text-accent"
            onClick={() => {
              discardDraft();
              setAsk(false);
            }}
          >
            {t.leaveDelete}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function PostChoices({
  onPersonal,
  onBusiness,
  onRequest,
}: {
  onPersonal: () => void;
  onBusiness: () => void;
  onRequest: () => void;
}) {
  const { t, draft, discardDraft } = useApp();
  const [askNew, setAskNew] = useState(false);
  const unfinished = draftUnfinished(draft);
  const startPersonal = () => {
    if (unfinished) {
      setAskNew(true);
      return;
    }
    onPersonal();
  };
  return (
    <div data-testid="post-choices">
      <DraftContinueCard
        onOpen={() => {
          onPersonal();
        }}
      />
      <button type="button" data-testid="post-choice-personal" onClick={startPersonal} className="mt-2 w-full rounded-[16px] border border-line bg-white px-4 py-3 text-left">
        <div className="text-[16px] font-semibold text-ink">{t.postPersonal}</div>
        <div className="mt-1 text-[13px] text-muted">{t.postPersonalHint}</div>
      </button>
      <button type="button" data-testid="post-choice-business" onClick={onBusiness} className="mt-2 w-full rounded-[16px] border border-line bg-white px-4 py-3 text-left">
        <div className="text-[16px] font-semibold text-ink">{t.postBusiness}</div>
        <div className="mt-1 text-[13px] text-muted">{t.postBusinessHint}</div>
      </button>
      <button type="button" data-testid="post-choice-request" onClick={onRequest} className="mt-2 w-full rounded-[16px] border border-line bg-white px-4 py-3 text-left">
        <div className="text-[16px] font-semibold text-ink">{t.postRequest}</div>
        <div className="mt-1 text-[13px] text-muted">{t.postRequestHint}</div>
      </button>
      {askNew ? (
        <div className="mt-3 rounded-[14px] bg-chip p-3" data-testid="draft-start">
          <p className="text-[14px]">{t.draftStartNew}</p>
          <button
            type="button"
            data-testid="draft-start-new"
            className="mt-2 text-[14px] font-bold text-accent"
            onClick={() => {
              discardDraft();
              setAskNew(false);
              onPersonal();
            }}
          >
            {t.draftStartNewBtn}
          </button>
          <button type="button" className="mt-2 block text-[14px] font-semibold" onClick={() => onPersonal()}>
            {t.draftContinue}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ChoicePage() {
  const { t } = useApp();
  const router = useRouter();
  return (
    <div className="px-5 pb-8 pt-4">
      <ScreenBack fallback="/" />
      <h1 className="mt-3 font-display text-[26px] font-extrabold text-ink">{t.postChoiceTitle}</h1>
      <div className="mt-4">
        <PostChoices
          onPersonal={() => router.push("/post?type=personal")}
          onBusiness={() => router.push("/post?type=business")}
          onRequest={() => router.push("/post?type=request")}
        />
      </div>
    </div>
  );
}
