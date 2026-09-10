import type { SellerChannel, User } from "./types";
import { SELLER_CHANNELS } from "./types";

export { SELLER_CHANNELS, type SellerChannel };

export function parseSellerChannel(value: unknown): SellerChannel | null {
  return (SELLER_CHANNELS as readonly string[]).includes(value as string) ? (value as SellerChannel) : null;
}

export function channelsOf(user: User | null | undefined): SellerChannel[] {
  if (!user) return [];
  const set = new Set<SellerChannel>();
  const fromMethod = parseSellerChannel(user.method);
  if (fromMethod) set.add(fromMethod);
  for (const item of user.linkedChannels ?? []) {
    const ch = parseSellerChannel(item);
    if (ch) set.add(ch);
  }
  return SELLER_CHANNELS.filter((id) => set.has(id));
}

export function hasChannel(user: User | null | undefined, channel: SellerChannel): boolean {
  return channelsOf(user).includes(channel);
}

/** Sample posts as they arrive from each channel — classified the same way as speech. */
export const CHANNEL_DEMO_POST: Record<SellerChannel, string> = {
  instagram:
    "Продаю кожаный диван, Ош, восемнадцать тысяч пятьсот сом. Самовывоз, поможем спустить. Предоплату не прошу. Полное объявление в Koshuna.",
  facebook:
    "Продам кожаный диван, Ош. 18 500 сом. Самовывоз, поможем спустить. Я хозяин, предоплату не прошу.",
  telegram:
    "Ассалаумаалейкум. Продаю iPhone 13, 128 гигабайт, состояние хорошее. Бишкек, тридцать пять тысяч сом. Можно встретиться у ЦУМа, предоплату не прошу. Я хозяин.",
  whatsapp:
    "Салам. Продаю кожаный диван, Ош, 18500 сом. Самовывоз, поможем спустить. Предоплату не прошу.",
};
