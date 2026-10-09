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
  if (row.textKey === "notifBuyRequest") return t.notifBuyRequest(title);
  return t.notifGeneric;
}
