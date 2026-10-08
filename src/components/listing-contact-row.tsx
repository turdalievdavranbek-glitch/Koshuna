"use client";

import type { MouseEvent } from "react";
import { IconChat, IconPhone, IconTg, IconWa } from "./icons";

export function ListingContactRow({
  callHref,
  showCall,
  showWa,
  waHref,
  telegramHref,
  onCallGate,
  onWrite,
  callLabel,
  writeLabel,
  withTestIds,
}: {
  callHref: string;
  showCall: boolean;
  showWa: boolean;
  waHref: string;
  telegramHref: string | null;
  onCallGate: (event: MouseEvent<HTMLAnchorElement>) => void;
  onWrite: () => void;
  callLabel: string;
  writeLabel: string;
  withTestIds?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2 overflow-x-hidden">
      {showCall ? (
        <a
          href={callHref}
          data-testid={withTestIds ? "listing-phone" : undefined}
          onClick={onCallGate}
          className="shadow-btn flex h-[54px] min-w-[8.5rem] flex-1 items-center justify-center gap-2 rounded-2xl bg-ink text-base font-semibold text-screen"
        >
          <IconPhone size={19} color="#F7F3EC" />
          {callLabel}
        </a>
      ) : null}
      {showWa ? (
        <a
          href={waHref}
          data-testid={withTestIds ? "listing-wa" : undefined}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp"
          className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-2xl bg-success"
        >
          <IconWa size={19} color="#F7F3EC" />
        </a>
      ) : null}
      {telegramHref ? (
        <a
          href={telegramHref}
          target="_blank"
          rel="noreferrer"
          aria-label="Telegram"
          className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-2xl border border-line bg-white"
        >
          <IconTg size={19} color="#17140F" />
        </a>
      ) : null}
      <button
        type="button"
        onClick={onWrite}
        aria-label={writeLabel}
        className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-2xl bg-accent"
      >
        <IconChat size={18} color="#FFF7F0" />
      </button>
    </div>
  );
}
