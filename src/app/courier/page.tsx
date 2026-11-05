"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { formatKm, type CourierOffer, type OrderView } from "@/lib/delivery";
import { useApp } from "@/lib/store";
import { PhoneShell } from "@/components/shell";
import { IconPhone } from "@/components/icons";
import { CourierPlace } from "@/components/courier-place";
import { askPoint, deliveryError, GhostBtn, PageHead, RedBtn, som, useSignedIn, YellowBtn } from "@/components/delivery-ui";

type Board = {
  online: boolean;
  courier: boolean;
  city: string | null;
  paused: boolean;
  softBanned: boolean;
  offer: (CourierOffer & { expiresAt: string }) | null;
  active: OrderView | null;
  available: CourierOffer[];
};

export default function CourierPage() {
  const { t } = useApp();
  const user = useSignedIn("/courier");
  const router = useRouter();
  const [board, setBoard] = useState<Board | null>(null);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [code, setCode] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [placeTick, setPlaceTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    void askPoint().then(setPoint);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    const pull = () => {
      const q = point ? `?lat=${point.lat}&lng=${point.lng}` : "";
      void api<Board>(`/api/courier/board${q}`).then((res) => {
        if (!cancel && res.ok && res.data) setBoard(res.data);
      });
    };
    pull();
    const timer = window.setInterval(pull, 8000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, [user, point, placeTick]);

  const online = (on: boolean) => {
    setBusy(true);
    void api("/api/courier/online", { method: "POST", json: { on } }).then((res) => {
      setBusy(false);
      if (!res.ok) {
        setError(deliveryError(res.error, t));
        return;
      }
      setBoard((prev) => (prev ? { ...prev, online: on } : prev));
    });
  };

  const act = (orderId: string, action: string, extra?: { code?: string }) => {
    setBusy(true);
    setError("");
    void api<{ error?: string }>(`/api/orders/${encodeURIComponent(orderId)}`, { method: "POST", json: { action, ...extra } }).then((res) => {
      setBusy(false);
      if (!res.ok) {
        setError(deliveryError(res.data?.error || res.error, t));
        return;
      }
      setCode("");
      const q = point ? `?lat=${point.lat}&lng=${point.lng}` : "";
      void api<Board>(`/api/courier/board${q}`).then((next) => {
        if (next.ok && next.data) setBoard(next.data);
      });
    });
  };

  const active = board?.active;

  return (
    <PhoneShell>
      <PageHead
        title={t.deliveryCourierTitle}
        fallback="/profile"
        aside={
          board?.courier ? (
            <button type="button" disabled={busy} onClick={() => online(!board.online)} className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <span className={`h-2.5 w-2.5 rounded-full ${board.online ? "bg-[#22A559]" : "bg-[#C4C4C8]"}`} />
              {board.online ? t.deliveryOnline : t.deliveryOffline}
            </button>
          ) : null
        }
      />
      <div className="sc mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        {board?.courier ? (
          <div className="mb-4">
            <CourierPlace onChange={() => setPlaceTick((n) => n + 1)} />
            <button type="button" onClick={() => router.push("/courier/rules")} className="mt-2 text-[14px] font-semibold text-accent">
              {t.courierRulesLink}
            </button>
          </div>
        ) : null}
        {board && !board.courier && !active ? (
          <button type="button" onClick={() => router.push("/courier/apply")} className="w-full rounded-[18px] border border-line bg-white px-4 py-4 text-left">
            <div className="text-[16px] font-extrabold">✔ {t.deliveryBecome}</div>
            <div className="mt-1 text-[13px] text-muted">{t.deliveryBecomeHint}</div>
          </button>
        ) : null}
        {error ? <p className="mb-2 text-[13px] font-semibold text-accent">{error}</p> : null}
        {active ? (
          <section className="rounded-[22px] border border-line bg-white p-4">
            <h2 className="text-[18px] font-extrabold">{t.deliveryActive(active.no)}</h2>
            <div className="mt-3 rounded-2xl bg-[#FFF8E0] px-3 py-2 text-[14px]">
              <span className="mr-2 rounded-md bg-[#FFE14A] px-1.5 py-0.5 text-[11px] font-extrabold">{t.deliveryPickup}</span>
              {active.shopName}
              {active.shopPlace ? `, ${active.shopPlace}` : ""}
            </div>
            <div className="mt-2 rounded-2xl bg-[#FDE8E8] px-3 py-2 text-[14px]">
              <span className="mr-2 rounded-md bg-[#F8C9C9] px-1.5 py-0.5 text-[11px] font-extrabold text-accent">{t.deliveryDropoff}</span>
              {active.address}
            </div>
            <p className="mt-3 text-[14px] font-semibold">{t.deliveryCollect(som(active.totalSom))}</p>
            {active.comment ? <p className="mt-1 text-[13px] text-muted">{active.comment}</p> : null}
            <div className="mt-3 flex gap-2">
              {active.shopPhone ? (
                <a href={`tel:${active.shopPhone}`} className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-line text-[14px] font-bold">
                  <IconPhone size={16} />
                  {t.deliveryCallShop}
                </a>
              ) : null}
              {active.buyerPhone ? (
                <a href={`tel:${active.buyerPhone}`} className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-line text-[14px] font-bold">
                  <IconPhone size={16} />
                  {t.deliveryCallClient}
                </a>
              ) : null}
            </div>
            {active.status === "assigned" && !active.shopPaid ? <p className="mt-3 text-[15px] font-extrabold text-accent">{t.deliveryPayShop(som(active.itemsTotalSom))}</p> : null}
            {active.status === "assigned" ? (
              <div className="mt-2">
                <GhostBtn disabled={busy} onClick={() => act(active.id, "release")}>
                  {t.deliveryRelease}
                </GhostBtn>
              </div>
            ) : null}
            {active.status === "assigned" && active.shopPaid ? (
              <div className="mt-3">
                <label className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted">{t.deliveryReceipt}</label>
                <input type="file" accept="image/*" capture="environment" className="mt-2 block w-full text-[13px]" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
                <div className="mt-2">
                  <RedBtn
                    disabled={busy || (!active.hasReceipt && !receipt)}
                    onClick={() => {
                      if (active.hasReceipt || !receipt) {
                        act(active.id, "pickup");
                        return;
                      }
                      setBusy(true);
                      const form = new FormData();
                      form.set("photo", receipt);
                      void fetch(`/api/orders/${encodeURIComponent(active.id)}/receipt`, { method: "POST", body: form, credentials: "same-origin" }).then(async (res) => {
                        if (!res.ok) {
                          setBusy(false);
                          const data = (await res.json().catch(() => null)) as { error?: string } | null;
                          setError(deliveryError(data?.error, t));
                          return;
                        }
                        act(active.id, "pickup");
                      });
                    }}
                  >
                    {t.deliveryPicked}
                  </RedBtn>
                </div>
              </div>
            ) : null}
            {active.codeLocked ? <p className="mt-3 text-[13px] font-semibold text-accent">{t.deliveryCodeLocked}</p> : null}
            {active.status === "picked_up" && !active.codeLocked ? (
              <div className="mt-3">
                <label className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted">{t.deliveryCodeEnter}</label>
                <input
                  inputMode="numeric"
                  value={code}
                  maxLength={4}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="mt-2 h-[50px] w-full rounded-[14px] border border-line bg-surface px-4 text-center font-display text-[24px] font-extrabold tracking-[0.3em]"
                />
                <div className="mt-2">
                  <RedBtn disabled={busy || code.length !== 4} onClick={() => act(active.id, "deliver", { code })}>
                    {t.deliveryDelivered} ✓
                  </RedBtn>
                </div>
              </div>
            ) : null}
            {active.status === "assigned" || active.status === "picked_up" ? (
              <div className="mt-2">
                <GhostBtn disabled={busy} onClick={() => act(active.id, "refuse")}>
                  {t.deliveryClientRefused}
                </GhostBtn>
              </div>
            ) : null}
            {active.status === "refused" ? <p className="mt-3 text-[14px] text-muted">{t.deliveryStatusRefused}</p> : null}
          </section>
        ) : null}
        {board?.courier && board.online && !active && !board.city ? <p className="mt-4 text-[14px] text-muted">{t.deliveryNeedPlace}</p> : null}
        {board?.softBanned ? <p className="mt-4 text-[14px] font-semibold text-accent">{t.deliverySoftBan}</p> : null}
        {board?.paused && !board.softBanned ? <p className="mt-4 text-[14px] font-semibold text-accent">{t.deliveryPaused}</p> : null}
        {board?.offer && !active ? (
          <article className="mt-4 rounded-[18px] border border-accent bg-white p-3">
            <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-accent">{t.deliveryOfferTitle}</div>
            <div className="mt-1 text-[16px] font-extrabold">{board.offer.shopName}</div>
            <div className="text-[13px] text-muted">{board.offer.shopPlace}</div>
            <div className="mt-1 text-[15px] font-extrabold text-accent">{som(board.offer.feeSom)} сом</div>
            <div className="mt-3 flex gap-2">
              <YellowBtn disabled={busy} onClick={() => act(board.offer!.id, "take")}>
                {t.deliveryOfferAccept}
              </YellowBtn>
              <GhostBtn disabled={busy} onClick={() => act(board.offer!.id, "decline")}>
                {t.deliveryOfferDecline}
              </GhostBtn>
            </div>
          </article>
        ) : null}
        {board?.courier && board.online && !active && board.city ? (
          <div className="mt-5">
            <h2 className="text-[18px] font-extrabold">{t.deliveryNearby}</h2>
            {board.available.length === 0 ? <p className="mt-2 text-[14px] text-muted">{t.deliveryNoOffers}</p> : null}
            <div className="mt-2 flex flex-col gap-2">
              {board.available.map((offer) => (
                <article key={offer.id} className="flex items-center gap-3 rounded-[18px] border border-line bg-white p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-extrabold">{offer.shopName}</div>
                    <div className="text-[12px] text-muted">{offer.shopPlace || t.deliveryNoKm}</div>
                    <div className="text-[12px] text-muted">{offer.km == null ? t.deliveryNoKm : t.deliveryKmToShop(formatKm(offer.km))}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[16px] font-extrabold text-accent">{som(offer.feeSom)} сом</div>
                    <div className="mt-1">
                      <YellowBtn disabled={busy} onClick={() => act(offer.id, "take")}>
                        {t.deliveryTake}
                      </YellowBtn>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
        {board?.courier && !board.online && !active ? <p className="mt-6 text-[14px] text-muted">{t.deliveryOfflineNeed}</p> : null}
      </div>
    </PhoneShell>
  );
}
