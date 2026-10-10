/**
 * Шаг 3 (№85): sections outside the plan are HIDDEN, not deleted.
 * false = hidden from UI, navigation and feeds; code, routes, data and i18n stay.
 * Flip to true to bring a feature back. Owner decision 2026-10-05.
 * accountStars: owner decision 2026-10-08 — hide 0–3 «Звёзды аккаунта».
 */
import type { SectionId } from "./types";

export const FEATURES = {
  developers: false,      // застройщики (/developers/*, /developer, partner kind=developer, card=developer)
  complexes: false,       // ЖК (/complexes/*)
  dealers: false,         // автосалоны (/dealers/*, /dealer, partner kind=dealer, card=dealer, dealer badge on listing)
  vacancies: false,       // вакансии (section "vacancies")
  stays: false,           // отели / посуточно (section "stays")
  goLookMeet: false,      // «Еду смотреть / Встретимся» (GoLookCard + MeetDealBlock)
  honesty: false,         // звёзды честности (HonestyCard «Честность», 1–5 ★)
  aiyl: false,            // «Айылы» (AiylRoad card + aiylOnly toggle in /filters)
  comments: false,        // комментарии: hidden again (owner 2026-10-10 simplify). Data, API, moderation stay; no new comment pushes.
  shareFacebookVk: false, // Facebook / VK cells in share block (№85, №52)
  accountStars: false,    // 0–3 «Звёзды аккаунта» (TrustStars / SellerStarsBadge) and the login explanation
  ownerVoice: false,     // Голос хозяина: hidden until speech-to-text works (owner 08.10). Code stays.
  /** Owner 2026-10-10 «упростить»: hidden, not deleted. Server APIs and data stay. */
  purchaseRequests: false, // «Заявки на закупку»: «+» choice, Кабинет «Мои заявки» / incoming, /post?type=request
  holds: false,           // «Отложи мне» / «Записаться» on listings + Кабинет holds inbox
  cart: false,            // «Корзина» tab, header icon and add-to-cart buttons/hearts (tab slot → «Сообщения»)
  pointSetupHints: false, // owner checklist on the point page + «Мои точки» hint line
  reelsStrip: false,      // Reels/circles strip at the top of home (video listings still open full-screen from the listing)
  magnets: false,         // «Цена честная?», «Сегодня на точке(ах)», «Сосед рядом» (overrides admin magnet config)
  playBanner: false,     // Google Play banner stays off until the app is in Play (Step 26)
  /** D1 / Р-019: hide «Пример для проверки» in production. NEXT_PUBLIC_DEMO_MEDIA=1 forces it on, =0 forces it off. */
  demoMedia:
    process.env.NEXT_PUBLIC_DEMO_MEDIA === "1"
      ? true
      : process.env.NEXT_PUBLIC_DEMO_MEDIA === "0"
        ? false
        : process.env.NODE_ENV !== "production",
} as const;

const HIDDEN_SECTIONS: Partial<Record<SectionId, boolean>> = {
  vacancies: !FEATURES.vacancies,
  stays: !FEATURES.stays,
};

export function isSectionVisible(id: SectionId | string): boolean {
  return !HIDDEN_SECTIONS[id as SectionId];
}
