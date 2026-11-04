import type { Dict } from "./i18n";
import type { AppNotice } from "./notices";

export function noticeText(row: AppNotice, t: Dict): string {
  const title = (row.params.title ?? "").trim();
  const name = (row.params.name ?? "").trim() || t.holdNoName;
  if (row.textKey === "notifHoldAsked") return t.notifHoldAsked(name, title);
  if (row.textKey === "notifHoldYes") return t.notifHoldYes(title);
  if (row.textKey === "notifHoldNo") return t.notifHoldNo(title);
  if (row.textKey === "notifStillActual") return t.notifStillActual;
  if (row.textKey === "notifChat") return t.notifChat(name, title);
  if (row.textKey === "notifComment") return t.notifComment(name, title);
  if (row.textKey === "notifBuyRequest") return t.notifBuyRequest(title);
  if (row.textKey === "notifFeedback") return t.notifFeedback(title);
  if (row.textKey === "notifPromoterOn") return t.notifPromoterOn;
  if (row.textKey === "notifPromoterOff") return t.notifPromoterOff;
  if (row.textKey === "notifShopTransferred") return t.notifShopTransferred(title, (row.params.name ?? "").trim());
  if (row.textKey === "notifSectionMoved") return t.notifSectionMoved(title, (row.params.name ?? "").trim());
  if (row.textKey === "notifOrderNew") return t.notifOrderNew(title);
  if (row.textKey === "notifOrderAccepted") return t.notifOrderAccepted(title);
  if (row.textKey === "notifOrderRejected") return t.notifOrderRejected(title);
  if (row.textKey === "notifOrderAssembled") return t.notifOrderAssembled(title);
  if (row.textKey === "notifOrderReady") return t.notifOrderReady(title);
  if (row.textKey === "notifOrderAvailable") return t.notifOrderAvailable(title);
  if (row.textKey === "notifOrderAssigned") return t.notifOrderAssigned(title);
  if (row.textKey === "notifOrderPaid") return t.notifOrderPaid(title);
  if (row.textKey === "notifOrderPicked") return t.notifOrderPicked(title);
  if (row.textKey === "notifOrderDelivered") return t.notifOrderDelivered(title);
  if (row.textKey === "notifOrderCancelled") return t.notifOrderCancelled(title);
  if (row.textKey === "notifOrderRefused") return t.notifOrderRefused(title);
  if (row.textKey === "notifOrderReturned") return t.notifOrderReturned(title);
  if (row.textKey === "notifOrderBlocked") return t.notifOrderBlocked;
  if (row.textKey === "notifCourierOn") return t.notifCourierOn;
  if (row.textKey === "notifCourierOff") return t.notifCourierOff;
  return t.notifGeneric;
}
