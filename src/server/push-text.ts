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
  moved: (title: string, to: string) => string;
  transferred: (point: string, from: string) => string;
  promoterOn: string;
  feedback: (title: string) => string;
  promoterOff: string;
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
    moved: (title, to) => `Раздел вашего объявления «${title}» изменён на «${to}»`,
    transferred: (point, from) => (from ? `${from} передал вам точку «${point}»` : `Вам передали точку «${point}»`),
    feedback: (title) => (title ? `Новое обращение: «${title}»` : "Новое обращение в поддержку"),
    promoterOn: "Вам назначена роль «Промоутер»",
    promoterOff: "Роль «Промоутер» с вашего аккаунта снята",
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
    moved: (title, to) => `«${title}» жарнамаңыздын бөлүмү «${to}» болуп өзгөртүлдү`,
    transferred: (point, from) => (from ? `${from} сизге «${point}» түйүнүн өткөрүп берди` : `Сизге «${point}» түйүнү өткөрүлүп берилди`),
    feedback: (title) => (title ? `Жаңы кайрылуу: «${title}»` : "Колдоого жаңы кайрылуу"),
    promoterOn: "Сизге «Промоутер» ролу берилди",
    promoterOff: "Аккаунтуңуздан «Промоутер» ролу алынды",
    generic: "Коңшудагы жаңылык",
  },
};

const ORDER_PUSH: Record<PushLang, Record<string, (title: string) => string>> = {
  ru: {
    notifOrderNew: (title) => (title ? `Новый заказ ${title}` : "Новый заказ"),
    notifOrderAccepted: (title) => (title ? `Заказ ${title} принят` : "Заказ принят"),
    notifOrderRejected: (title) => (title ? `Заказ ${title} отклонён` : "Заказ отклонён"),
    notifOrderAssembled: (title) => (title ? `Заказ ${title} собран. Подтвердите его` : "Заказ собран. Подтвердите его"),
    notifOrderReady: (title) => (title ? `Заказ ${title} подтверждён и ждёт курьера` : "Заказ ждёт курьера"),
    notifOrderAvailable: (title) => (title ? `Собран заказ ${title}` : "Собран новый заказ"),
    notifOrderAssigned: (title) => (title ? `Курьер взял заказ ${title}` : "Курьер взял заказ"),
    notifOrderPaid: (title) => (title ? `Магазин подтвердил оплату по заказу ${title}` : "Магазин подтвердил оплату"),
    notifOrderPicked: (title) => (title ? `Заказ ${title} в пути` : "Заказ в пути"),
    notifOrderDelivered: (title) => (title ? `Заказ ${title} доставлен` : "Заказ доставлен"),
    notifOrderCancelled: (title) => (title ? `Заказ ${title} отменён` : "Заказ отменён"),
    notifOrderRefused: (title) => (title ? `Клиент отказался от заказа ${title}` : "Клиент отказался от заказа"),
    notifOrderReturned: (title) => (title ? `Возврат по заказу ${title} подтверждён` : "Возврат подтверждён"),
    notifOrderBlocked: () => "Заказы закрыты: два отказа",
    notifCourierOn: () => "Вам назначена роль «Курьер»",
    notifCourierOff: () => "Роль «Курьер» снята",
    notifOrderShopTimeout: (title) => (title ? `Заказ ${title} отменён: магазин не ответил` : "Заказ отменён: магазин не ответил"),
    notifOrderNoCourier: (title) => (title ? `Заказ ${title} всё ещё ждёт курьера. Его можно отменить` : "Заказ ждёт курьера. Его можно отменить"),
    notifOrderReleased: (title) => (title ? `Заказ ${title} снова ждёт курьера` : "Заказ снова ждёт курьера"),
    notifOrderStale: (title) => (title ? `Заказ ${title} долго в пути. Нужна проверка` : "Заказ долго в пути"),
    notifOrderCodeLocked: (title) => (title ? `Код заказа ${title} заблокирован` : "Код заказа заблокирован"),
    notifOrderCode: (title) => (title ? `Код получения: ${title}` : "Код получения"),
  },
  ky: {
    notifOrderNew: (title) => (title ? `Жаңы буйрутма ${title}` : "Жаңы буйрутма"),
    notifOrderAccepted: (title) => (title ? `${title} буйрутма кабыл алынды` : "Буйрутма кабыл алынды"),
    notifOrderRejected: (title) => (title ? `${title} буйрутма четке кагылды` : "Буйрутма четке кагылды"),
    notifOrderAssembled: (title) => (title ? `${title} буйрутма жыйналды. Ырастаңыз` : "Буйрутма жыйналды. Ырастаңыз"),
    notifOrderReady: (title) => (title ? `${title} ырасталды, курьерди күтөт` : "Буйрутма курьерди күтөт"),
    notifOrderAvailable: (title) => (title ? `Жыйналган буйрутма ${title}` : "Жыйналган буйрутма"),
    notifOrderAssigned: (title) => (title ? `Курьер ${title} буйрутманы алды` : "Курьер буйрутманы алды"),
    notifOrderPaid: (title) => (title ? `Дүкөн ${title} боюнча төлөмдү ырастады` : "Дүкөн төлөмдү ырастады"),
    notifOrderPicked: (title) => (title ? `${title} жолдо` : "Буйрутма жолдо"),
    notifOrderDelivered: (title) => (title ? `${title} жеткирилди` : "Буйрутма жеткирилди"),
    notifOrderCancelled: (title) => (title ? `${title} жокко чыгарылды` : "Буйрутма жокко чыгарылды"),
    notifOrderRefused: (title) => (title ? `Кардар ${title} буйрутмадан баш тартты` : "Кардар баш тартты"),
    notifOrderReturned: (title) => (title ? `${title} кайтаруу ырасталды` : "Кайтаруу ырасталды"),
    notifOrderBlocked: () => "Буйрутма жабык: эки баш тартуу",
    notifCourierOn: () => "Сизге «Курьер» ролу берилди",
    notifCourierOff: () => "«Курьер» ролу алынды",
    notifOrderShopTimeout: (title) => (title ? `${title} жокко чыкты: дүкөн жооп берген жок` : "Буйрутма жокко чыкты: дүкөн жооп берген жок"),
    notifOrderNoCourier: (title) => (title ? `${title} дагы курьерди күтөт. Жокко чыгарса болот` : "Буйрутма курьерди күтөт"),
    notifOrderReleased: (title) => (title ? `${title} кайра курьерди күтөт` : "Буйрутма кайра курьерди күтөт"),
    notifOrderStale: (title) => (title ? `${title} көпкө жолдо. Текшерүү керек` : "Буйрутма көпкө жолдо"),
    notifOrderCodeLocked: (title) => (title ? `${title} коду бөгөттөлдү` : "Код бөгөттөлдү"),
    notifOrderCode: (title) => (title ? `Алуу коду: ${title}` : "Алуу коду"),
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
  const orderLine = ORDER_PUSH[lang][input.textKey];
  let body = copy.generic;
  if (orderLine) body = orderLine(title);
  else if (input.textKey === "notifHoldAsked") body = copy.holdAsked(name, title);
  else if (input.textKey === "notifHoldYes") body = copy.holdYes(title);
  else if (input.textKey === "notifHoldNo") body = copy.holdNo(title);
  else if (input.textKey === "notifStillActual") body = copy.still;
  else if (input.textKey === "notifBuyRequest") body = copy.buy(title);
  else if (input.textKey === "notifComment") body = copy.comment(name, title);
  else if (input.textKey === "notifFeedback") body = copy.feedback(title);
  else if (input.textKey === "notifPromoterOn") body = copy.promoterOn;
  else if (input.textKey === "notifPromoterOff") body = copy.promoterOff;
  else if (input.textKey === "notifShopTransferred") body = copy.transferred(title, (input.name ?? "").trim());
  else if (input.textKey === "notifSectionMoved") body = copy.moved(title, (input.name ?? "").trim());
  return { title: copy.app, body: body.slice(0, 180) };
}
