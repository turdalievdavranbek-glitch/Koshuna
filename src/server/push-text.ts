export type PushLang = "ru" | "ky";

export function pushLang(value: string | null | undefined): PushLang {
  return value === "ky" ? "ky" : "ru";
}

type Copy = {
  app: string;
  noName: string;
  photo: string;
  video: string;
  holdAsked: (name: string, title: string) => string;
  holdYes: (title: string) => string;
  holdNo: (title: string) => string;
  still: string;
  chat: (name: string, title: string) => string;
  buy: (title: string) => string;
  comment: (name: string, title: string) => string;
  generic: string;
};

const COPY: Record<PushLang, Copy> = {
  ru: {
    app: "Коңшу",
    noName: "без имени",
    photo: "Фото",
    video: "Видео",
    holdAsked: (name, title) => `${name} просит отложить «${title}»`,
    holdYes: (title) => `Для вас отложили «${title}»`,
    holdNo: (title) => `Отказали отложить «${title}»`,
    still: "Ещё актуально? Откройте объявление и нажмите «Да» или «Снять».",
    chat: (name, title) => (title ? `${name} написал про «${title}»` : `${name} написал сообщение`),
    buy: (title) => (title ? `Покупатель ищет: «${title}»` : "Покупатель ищет товар"),
    comment: (name, title) => (title ? `${name} прокомментировал «${title}»` : `${name} оставил комментарий`),
    generic: "Новость в Коңшу",
  },
  ky: {
    app: "Коңшу",
    noName: "аты жок",
    photo: "Сүрөт",
    video: "Видео",
    holdAsked: (name, title) => `${name} «${title}» калтырууну сурайт`,
    holdYes: (title) => `Сиз үчүн «${title}» калтырылды`,
    holdNo: (title) => `«${title}» калтыруудан баш тартышты`,
    still: "Дагы актуалдуубу? Жарнаманы ачып, «Ооба» же «Алуу» басыңыз.",
    chat: (name, title) => (title ? `${name} «${title}» жөнүндө жазды` : `${name} билдирүү жазды`),
    buy: (title) => (title ? `Сатып алуучу издеп жатат: «${title}»` : "Сатып алуучу товар издеп жатат"),
    comment: (name, title) => (title ? `${name} «${title}» жарнамасына пикир жазды` : `${name} пикир жазды`),
    generic: "Коңшудагы жаңылык",
  },
};

export type PushCopyInput = {
  textKey: string;
  name?: string;
  title?: string;
  chat?: { preview?: string; media?: "photo" | "video" };
};

/** Chat: sender name + preview (or Фото/Видео). Other notices: the same sentence as the bell. */
export function pushCopy(lang: PushLang, input: PushCopyInput): { title: string; body: string } {
  const copy = COPY[lang];
  const name = (input.name ?? "").trim() || copy.noName;
  const title = (input.title ?? "").trim();
  if (input.textKey === "notifChat" || input.chat) {
    const media = input.chat?.media;
    const preview =
      media === "photo"
        ? copy.photo
        : media === "video"
          ? copy.video
          : (input.chat?.preview ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
    const body = (preview || copy.chat(name, title)).slice(0, 100);
    return { title: name.slice(0, 80), body };
  }
  let body = copy.generic;
  if (input.textKey === "notifHoldAsked") body = copy.holdAsked(name, title);
  else if (input.textKey === "notifHoldYes") body = copy.holdYes(title);
  else if (input.textKey === "notifHoldNo") body = copy.holdNo(title);
  else if (input.textKey === "notifStillActual") body = copy.still;
  else if (input.textKey === "notifBuyRequest") body = copy.buy(title);
  else if (input.textKey === "notifComment") body = copy.comment(name, title);
  return { title: copy.app, body: body.slice(0, 180) };
}
