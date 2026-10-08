/** Help WhatsApp. One number only: +79685043099. */
export const HELP_WHATSAPP_PHONE = "79685043099";
export const HELP_WHATSAPP_TEXT = "Здравствуйте, нужна помощь в Коңшу";

export function helpWhatsAppUrl(): string {
  return `https://wa.me/${HELP_WHATSAPP_PHONE}?text=${encodeURIComponent(HELP_WHATSAPP_TEXT)}`;
}
