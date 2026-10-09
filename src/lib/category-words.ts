import type { AnimalGroup, SectionId } from "./types";

/** Stems and synonyms the catalog labels do not cover. RU + KG. Step 21 can reuse this list. */
export type CategoryWord = {
  keys: string[];
  section: SectionId;
  category?: string;
  goodsKind?: string;
  animalGroup?: AnimalGroup;
  animalKind?: string;
  vehicleGroup?: "passenger" | "special";
  carMake?: string;
  techBrand?: string;
};

export const CATEGORY_WORDS: CategoryWord[] = [
  {
    keys: ["диван", "шкаф", "кровать", "стол", "стул", "кресло", "комод", "тумба", "полка", "матрас", "шире", "керебет", "эмерек", "мебель"],
    section: "secondhand",
    category: "furniture",
    goodsKind: "sofa",
  },
  {
    keys: ["куртка", "шуба", "платье", "кроссовки", "ботинки", "пальто", "джинсы", "футболка", "обувь", "кепка", "туфли", "сапоги", "куртка", "көйнөк", "бут кийим", "кийим", "шым", "балтыркөй", "кеды", "костюм", "рубашка", "юбка", "свитер"],
    section: "secondhand",
    category: "clothes",
  },
  {
    keys: ["коляска", "бала арабасы", "игрушк", "оюнчук", "автокресло", "детск"],
    section: "secondhand",
    category: "kids",
    goodsKind: "stroller",
  },
  {
    keys: ["телевизор", "сыналгы", "холодильник", "стирал", "пылесос", "микроволн", "утюг", "кондиционер"],
    section: "secondhand",
    category: "appliances",
  },
  {
    keys: ["посуда", "идиш", "шторы", "ковер", "килем", "чайник"],
    section: "secondhand",
    category: "home",
  },
  {
    keys: ["велосипед", "велик", "лыжи", "гантел", "тренажер"],
    section: "secondhand",
    category: "sport",
  },
  {
    keys: ["айфон", "iphone", "смартфон", "телефон", "самсунг", "samsung", "сяоми", "xiaomi", "редми", "redmi", "poco", "honor", "хонор", "huawei", "хуавей", "realme", "oppo", "vivo", "pixel", "galaxy", "галакси"],
    section: "secondhand",
    category: "phones",
    goodsKind: "smartphone",
  },
  {
    keys: ["планшет", "ipad", "айпад", "tablet", "galaxy tab"],
    section: "secondhand",
    category: "phones",
    goodsKind: "tablet",
  },
  {
    keys: [
      "ноутбук",
      "ноут",
      "нотбук",
      "laptop",
      "notebook",
      "ультрабук",
      "макбук",
      "macbook",
      "thinkpad",
      "think pad",
      "синкпад",
      "ideapad",
      "vivobook",
      "zenbook",
      "lenovo",
      "леново",
      "asus",
      "асус",
      "acer",
      "асер",
      "dell",
      "делл",
      "hp",
      "pavilion",
      "aspire",
      "latitude",
    ],
    section: "secondhand",
    category: "laptops",
    goodsKind: "office-laptop",
  },
  {
    keys: ["игровой ноутбук", "gaming laptop", "rog", "legion", "nitro"],
    section: "secondhand",
    category: "laptops",
    goodsKind: "gaming-laptop",
  },
  {
    keys: ["компьютер", "комп", "пк", "системник", "системный блок", "imac", "аймак"],
    section: "secondhand",
    category: "pcs",
    goodsKind: "desktop",
  },
  {
    keys: ["монитор", "моноблок", "видеокарт", "процессор", "оперативк", "ssd"],
    section: "secondhand",
    category: "pcs",
    goodsKind: "monitor",
  },
  {
    keys: ["корова", "бычок", "бык", "тёлка", "телка", "саан уй", "уй", "уйлар", "торпок", "муйуз"],
    section: "animals",
    animalGroup: "farm",
    animalKind: "cow",
  },
  {
    keys: ["овца", "баран", "кой", "кочкор", "козу"],
    section: "animals",
    animalGroup: "farm",
    animalKind: "sheep",
  },
  {
    keys: ["лошадь", "конь", "жеребенок", "жылкы", "ат "],
    section: "animals",
    animalGroup: "farm",
    animalKind: "horses",
  },
  {
    keys: ["коза", "эчки", "козел"],
    section: "animals",
    animalGroup: "farm",
    animalKind: "goats",
  },
  {
    keys: ["курица", "куры", "петух", "цыпленок", "яйца", "яйцо", "жумуртка", "тоок", "жөжө"],
    section: "animals",
    animalGroup: "farm",
    animalKind: "chickens",
  },
  {
    keys: ["кролик", "коён"],
    section: "animals",
    animalGroup: "farm",
    animalKind: "rabbits",
  },
  {
    keys: ["свинья", "поросенок", "чочко"],
    section: "animals",
    animalGroup: "farm",
    animalKind: "pigs",
  },
  {
    keys: ["щенок", "собак", "ит"],
    section: "animals",
    animalGroup: "pets",
    animalKind: "dogs",
  },
  {
    keys: ["кот ", "кошк", "котенок", "мышык"],
    section: "animals",
    animalGroup: "pets",
    animalKind: "cats",
  },
  {
    keys: ["картошка", "картофель", "морковь", "сабиз", "лук", "пияз", "капуста", "сено", "чөп", "помидор", "огурец"],
    section: "animals",
    animalGroup: "plants",
    animalKind: "potato",
  },
  {
    keys: ["цемент", "бетон"],
    section: "construction",
    category: "cement",
  },
  {
    keys: ["кирпич", "кыш", "блок", "газоблок"],
    section: "construction",
    category: "brick",
  },
  {
    keys: ["профнастил", "кровл", "шифер", "черепиц"],
    section: "construction",
    category: "roofing",
  },
  {
    keys: ["арматур", "доска", "брус", "пиломатериал", "тактай"],
    section: "construction",
    category: "timber",
  },
  {
    keys: ["краска", "шпаклев", "гипсокартон", "обой"],
    section: "construction",
    category: "paint",
  },
  {
    keys: ["утеплитель", "пенопласт", "минвата"],
    section: "construction",
    category: "insulation",
  },
  {
    keys: ["ремонт", "оңдоо", "устат", "отделк"],
    section: "services",
    category: "repairs-finish",
  },
  {
    keys: ["мойка", "автомойка", "жуучу", "унаа жуу"],
    section: "services",
    category: "car-wash",
  },
  {
    keys: ["сто", "автосервис", "моторист", "ходовка", "автоэлектрик", "унаа оңдоо"],
    section: "services",
    category: "auto-repair",
  },
  {
    keys: ["шиномонтаж", "вулканизация", "шина", "дөңгөлөк"],
    section: "services",
    category: "tire-service",
  },
  {
    keys: ["ремонт телефон", "ремонт ноутбук", "ремонт компьютер", "замена экрана", "телефон оңдоо"],
    section: "services",
    category: "phone-repair",
  },
  {
    keys: ["сантехник", "электрик", "сварщик", "сварка", "ширетүү"],
    section: "services",
    category: "home-master",
  },
  {
    keys: ["ателье", "швея", "пошив", "тигүү", "тигүүчү"],
    section: "services",
    category: "tailor",
  },
  {
    keys: ["химчистка", "стирка ковров", "килем жуу"],
    section: "services",
    category: "dry-clean",
  },
  {
    keys: ["ремонт обуви", "сапожник", "бут кийим оңдоо"],
    section: "services",
    category: "shoe-repair",
  },
  {
    keys: ["тамада", "ведущий", "той", "музыка", "ырчы"],
    section: "services",
    category: "event-host",
  },
  {
    keys: ["фотограф", "видеосъемка", "сүрөтчү", "видео тартуу"],
    section: "services",
    category: "photo-video",
  },
  {
    keys: ["прокат посуды", "декор"],
    section: "services",
    category: "event-rent",
  },
  {
    keys: ["туризм", "туризм жана эс алуу"],
    section: "services",
    category: "svc-tourism",
  },
  {
    keys: ["тур"],
    section: "services",
    category: "svc-tourism",
  },
  {
    keys: ["туроператор", "турагент", "турагентство", "турагенттик"],
    section: "services",
    category: "tour-operator",
  },
  {
    keys: ["экскурсия", "экскурсии", "экскурсиялар", "гид", "гиды", "поход", "жөө жүрүш"],
    section: "services",
    category: "tour-guide",
  },
  {
    keys: ["юрта", "юрты", "боз үй", "боз үйлөр", "гостевой дом", "конок үй"],
    section: "services",
    category: "guest-yurt",
  },
  {
    keys: ["снаряжен", "прокат снаряжения", "жабдуу"],
    section: "services",
    category: "gear-rental",
  },
  {
    keys: ["трактор", "вспашка", "сенокос", "комбайн", "айдоо", "чөп чабуу"],
    section: "services",
    category: "farm-work",
  },
  {
    keys: ["ветеринар", "мал доктур"],
    section: "services",
    category: "vet",
  },
  {
    keys: ["репетитор", "репетиторлук", "английск", "англис тили", "математик", "мугалим"],
    section: "services",
    category: "education",
  },
  {
    keys: ["маникюр", "парикмахер", "чачтарач", "брови", "ресниц", "салон", "барбер"],
    section: "services",
    category: "beauty",
  },
  {
    keys: ["уборка", "тазалоо", "клининг"],
    section: "services",
    category: "cleaning",
  },
  {
    keys: ["перевоз", "грузчик", "такси", "эвакуатор", "жук ташуу"],
    section: "services",
    category: "transport-local",
  },
  {
    keys: ["стоматолог", "тиш", "дантист"],
    section: "services",
    category: "dentist",
  },
  {
    keys: ["сауна", "баня", "мончо"],
    section: "services",
    category: "sauna",
  },
  {
    keys: ["квартира", "квартиру", "батир", "ижара", "комната", "бөлмө", "участок", "жер тилкеси", "дом ", "үй", "коттедж"],
    section: "rent",
  },
  {
    keys: ["хонда", "honda", "тойота", "toyota", "камри", "camry", "мерс", "мерседес", "mercedes", "жигули", "лада", "ваз", "бмв", "bmw", "хундай", "hyundai", "киа", "kia", "ниссан"],
    section: "cars",
    vehicleGroup: "passenger",
    carMake: "toyota",
  },
  {
    keys: ["экскаватор", "камаз", "самосвал"],
    section: "cars",
    vehicleGroup: "special",
  },
  {
    keys: ["трактор"],
    section: "cars",
    vehicleGroup: "special",
  },
];
