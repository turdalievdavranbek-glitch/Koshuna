import { listingTextHit } from "../src/lib/catalog-words";
import {
  ANIMAL_GROUPS,
  ANIMAL_KINDS,
  PHARMACY_SHOP_HREF,
  SERVICE_CATEGORIES,
  SERVICE_GROUPS,
  SERVICE_TOP,
  draftAfterServiceTap,
  isServiceGroup,
  serviceChoicesForPost,
  serviceGroupOf,
  serviceLeafReady,
} from "../src/lib/data";
import { applyFilters } from "../src/lib/filter";
import { DICT } from "../src/lib/i18n";
import { BRANCH_ALL, pathFromFilters, resolveBranch } from "../src/lib/section-tree";
import { normalizeFilters } from "../src/lib/store";
import { SHOP_CATEGORIES, SHOP_KINDS } from "../src/lib/types";
import {
  CAR_MAKES,
  MAKE_PREVIEW,
  PASSENGER_MAKES,
  TRANSPORT_ROWS,
  makeListView,
  vehicleMakesOf,
  vehicleModelsOf,
  vehicleTypesOf,
} from "../src/lib/transport";
import type { Filters, Listing } from "../src/lib/types";

let failed = 0;
let passed = 0;

function check(name: string, cond: boolean, extra?: unknown) {
  if (!cond) {
    console.error("FAIL", name, extra ?? "");
    failed += 1;
    return;
  }
  passed += 1;
  console.log("PASS", name);
}

function filters(patch: Partial<Filters> = {}): Filters {
  return {
    query: "",
    section: null,
    category: null,
    goodsKind: "any",
    housingType: "any",
    realtyGroup: "any",
    realtySub: "any",
    realtyKind: "any",
    city: "all",
    priceMin: null,
    priceMax: null,
    areaMin: null,
    areaMax: null,
    rooms: [],
    bodyType: "any",
    gear: "any",
    photosOnly: false,
    verifiedOnly: false,
    noAgents: false,
    neighborOnly: false,
    sellerKind: "any",
    videoOnly: false,
    sort: "new",
    checkIn: null,
    checkOut: null,
    dealType: "any",
    stockType: "any",
    autoType: "sale",
    vehicleGroup: "any",
    carMake: "any",
    carModel: "any",
    techBrand: "any",
    techModel: "any",
    animalGroup: "any",
    animalKind: "any",
    jobSphere: "any",
    jobSub: "any",
    jobRole: "any",
    jobType: "any",
    locLng: null,
    locLat: null,
    locLabel: null,
    nearLng: null,
    nearLat: null,
    oblast: "any",
    settlement: "any",
    aiylOnly: false,
    priceDroppedOnly: false,
    scope: "all",
    ...patch,
  };
}

function listing(patch: Partial<Listing> & Pick<Listing, "id" | "city" | "section">): Listing {
  return {
    title: patch.id,
    titleKy: patch.id,
    titleEn: patch.id,
    price: 100,
    postedAgo: "1h",
    photos: [],
    photoCredit: "",
    description: "",
    descriptionKy: "",
    descriptionEn: "",
    ownerId: "o",
    verified: false,
    hasPhoto: false,
    noAgent: true,
    status: "active",
    safetyKind: "goods",
    mapX: 0,
    mapY: 0,
    contact: "whatsapp",
    views: 0,
    favCount: 0,
    ...patch,
  };
}

function ids(list: Listing[]) {
  return list.map((item) => item.id).sort();
}

function labeled(dict: Record<string, string>, id: string) {
  return typeof dict[id] === "string" && dict[id].trim().length > 0;
}

const makes = [...CAR_MAKES];
check("CAR_MAKES >= 100", makes.length >= 100, makes.length);
check("CAR_MAKES is 128", makes.length === 128, makes.length);
check("CAR_MAKES unique", new Set(makes).size === makes.length);
check("PASSENGER_MAKES is 97", PASSENGER_MAKES.length === 97, PASSENGER_MAKES.length);
check("no separate howo make", !makes.includes("howo") && !makes.includes("HOWO"));
check("crossover lists BYD", vehicleMakesOf("passenger", "crossover").includes("byd"));
check("passenger any type is the full list", vehicleMakesOf("passenger", "any").length === PASSENGER_MAKES.length);
const trucks = vehicleMakesOf("special", "truck");
check("trucks include scania and sinotruk", trucks.includes("scania") && trucks.includes("sinotruk"), trucks);
check("truck type exists", vehicleTypesOf("special").includes("truck"));
check("BYD crossover has Song Plus", vehicleModelsOf("byd", "passenger", "crossover").includes("song-plus"));

for (const id of makes) {
  check(`make ru ${id}`, labeled(DICT.ru.carMakes, id));
  check(`make ky ${id}`, labeled(DICT.ky.carMakes, id));
}
const modelIds = [...new Set(TRANSPORT_ROWS.map((row) => row.model))];
for (const id of modelIds) {
  check(`model ru ${id}`, labeled(DICT.ru.carModels, id));
  check(`model ky ${id}`, labeled(DICT.ky.carModels, id));
}
for (const id of vehicleTypesOf("passenger").concat(vehicleTypesOf("special"))) {
  check(`vehicle type ru ${id}`, labeled(DICT.ru.vehicleTypes, id));
  check(`vehicle type ky ${id}`, labeled(DICT.ky.vehicleTypes, id));
}
for (const group of ANIMAL_GROUPS) {
  check(`animal group ru ${group}`, labeled(DICT.ru.animalGroups, group));
  check(`animal group ky ${group}`, labeled(DICT.ky.animalGroups, group));
  for (const kind of ANIMAL_KINDS[group]) {
    check(`animal kind ru ${kind}`, labeled(DICT.ru.animalKinds, kind));
    check(`animal kind ky ${kind}`, labeled(DICT.ky.animalKinds, kind));
  }
}
check("legacy cattle label ru", labeled(DICT.ru.animalKinds, "cattle"));
check("legacy cattle label ky", labeled(DICT.ky.animalKinds, "cattle"));
check("cattle is not selectable", !ANIMAL_KINDS.farm.includes("cattle"));
for (const id of [...SERVICE_TOP, ...SERVICE_CATEGORIES]) {
  check(`service ru ${id}`, labeled(DICT.ru.cats, id));
  check(`service ky ${id}`, labeled(DICT.ky.cats, id));
}
for (const id of SHOP_CATEGORIES) {
  check(`shop cat ru ${id}`, labeled(DICT.ru.shopCats, id));
  check(`shop cat ky ${id}`, labeled(DICT.ky.shopCats, id));
  for (const kind of SHOP_KINDS[id]) {
    check(`shop kind ru ${kind}`, labeled(DICT.ru.shopKinds, kind));
    check(`shop kind ky ${kind}`, labeled(DICT.ky.shopKinds, kind));
  }
}
check("pharmacies link ru", labeled({ pharmacies: DICT.ru.servicePharmacies }, "pharmacies"));
check("pharmacies link ky", labeled({ pharmacies: DICT.ky.servicePharmacies }, "pharmacies"));

for (const id of SERVICE_CATEGORIES) check(`leaf is not a group ${id}`, !isServiceGroup(id) && !id.startsWith("svc-"));
for (const [group, leaves] of Object.entries(SERVICE_GROUPS)) {
  for (const leaf of leaves) check(`serviceGroupOf ${leaf}`, serviceGroupOf(leaf) === group);
}

const preview = makeListView(vehicleMakesOf("passenger", "crossover"));
check("make preview <= 20", preview.ids.length <= MAKE_PREVIEW, preview.ids.length);
check("make preview row count <= 21", preview.ids.length + (preview.showAll ? 1 : 0) <= 21);
check("BYD is behind Все марки", preview.showAll && !preview.ids.includes("byd"));
const opened = makeListView(vehicleMakesOf("passenger"), {
  expanded: true,
  labelOf: (id) => DICT.ru.carMakes[id] ?? id,
});
const rest = opened.ids.slice(MAKE_PREVIEW);
const restSorted = [...rest].sort((a, b) => (DICT.ru.carMakes[a] ?? a).localeCompare(DICT.ru.carMakes[b] ?? b, "ru"));
check("full list keeps top 20 then alphabet", opened.ids.slice(0, MAKE_PREVIEW).join() === PASSENGER_MAKES.slice(0, MAKE_PREVIEW).join() && rest.join() === restSorted.join());
const forced = makeListView(vehicleMakesOf("passenger"), { selected: "byd" });
check("selected make outside top 20 is expanded", !forced.showAll && forced.ids.includes("byd"));

const osh = { lat: 40.53, lng: 72.8 };
const bishkek = { lat: 42.8746, lng: 74.5698 };
const phone = { lat: 40.5283, lng: 72.7985 };
const dent = listing({ id: "dent-osh", section: "services", category: "dentist", city: "osh", title: "Дент-Ош", ...osh });
const clinic = listing({ id: "clinic-bishkek", section: "services", category: "clinic", city: "bishkek", title: "Клиника Бишкек", ...bishkek });
const sauna = listing({ id: "banya", section: "services", category: "sauna", city: "osh", title: "Баня на дровах", ...osh });
const dentFar = listing({ id: "dent-far", section: "services", category: "dentist", city: "osh", title: "Дент далеко", lat: 40.7, lng: 72.8 });
const healthArea = applyFilters([dent, clinic, sauna], filters({ scope: "area", city: "osh", section: "services", category: "svc-health" }), "all");
check("C1 health in Osh shows dentist only", ids(healthArea).join() === "dent-osh", ids(healthArea));
const dentistOnly = applyFilters([dent, clinic, sauna], filters({ scope: "area", city: "osh", section: "services", category: "dentist" }), "all");
check("C1 dentistry chip", ids(dentistOnly).join() === "dent-osh");
const nearHealth = applyFilters([dent, clinic, sauna, dentFar], filters({ scope: "near", nearLat: phone.lat, nearLng: phone.lng, section: "services", category: "svc-health" }), "all");
check("C1 near keeps category and 5 km", ids(nearHealth).join() === "dent-osh", ids(nearHealth));

const bydCross = listing({ id: "byd-cross", section: "cars", city: "bishkek", vehicleGroup: "passenger", bodyKind: "crossover", carMake: "byd", carModel: "song-plus", title: "BYD Song" });
const bydSedan = listing({ id: "byd-sedan", section: "cars", city: "bishkek", vehicleGroup: "passenger", bodyKind: "sedan", carMake: "byd", carModel: "han", title: "BYD Han" });
const carBase = { section: "cars" as const, vehicleGroup: "passenger" as const, carMake: "byd" };
check("C3 crossover sees Song", ids(applyFilters([bydCross, bydSedan], filters({ ...carBase, bodyType: "crossover" }), "all")).join() === "byd-cross");
check("C3 sedan hides crossover", ids(applyFilters([bydCross, bydSedan], filters({ ...carBase, bodyType: "sedan" }), "all")).join() === "byd-sedan");
check("C3 any body sees both", applyFilters([bydCross, bydSedan], filters(carBase), "all").length === 2);

const bull = listing({ id: "bulls", section: "animals", city: "osh", animalGroup: "farm", animalKind: "bull", title: "Бычки на откорм" });
const potato = listing({ id: "potato", section: "animals", city: "osh", animalGroup: "plants", animalKind: "potato", title: "Мешок" });
check("C4 farm all shows bull", ids(applyFilters([bull, potato], filters({ section: "animals", animalGroup: "farm", animalKind: "any" }), "all")).join() === "bulls");
check("C4 cows hide bull", applyFilters([bull, potato], filters({ section: "animals", animalGroup: "farm", animalKind: "cow" }), "all").length === 0);
check("C4 plants hide bull", ids(applyFilters([bull, potato], filters({ section: "animals", animalGroup: "plants" }), "all")).join() === "potato");
check("C4 search бык uses the kind label", ids(applyFilters([bull], filters({ section: "animals", query: "бык" }), "all")).join() === "bulls");
const cattleSaved = normalizeFilters(filters({ section: "animals", animalGroup: "farm", animalKind: "cattle" }));
check("saved cattle becomes any", cattleSaved.animalKind === "any");
check("saved cattle does not empty the feed", ids(applyFilters([bull, potato], cattleSaved, "all")).join() === "bulls");
check("unknown animal group becomes any", normalizeFilters(filters({ animalGroup: "nope" as Filters["animalGroup"] })).animalGroup === "any");
check("plants group is kept", normalizeFilters(filters({ animalGroup: "plants" })).animalGroup === "plants");

check("C5 sauna is not in things", applyFilters([sauna], filters({ section: "secondhand" }), "all").length === 0);
check("C5 leisure chip shows sauna", ids(applyFilters([sauna, dent], filters({ section: "services", category: "svc-leisure" }), "all")).join() === "banya");
check("C5 search сауна", ids(applyFilters([sauna], filters({ query: "сауна" }), "all")).join() === "banya");
check("search стоматология", ids(applyFilters([dent], filters({ query: "стоматология" }), "all")).join() === "dent-osh");
check("listingTextHit сауна", listingTextHit(sauna, "сауна"));

const servicePaths = [[], ["svc-health"], ["svc-health", "all"], ["svc-health", "dentist"], ["cleaning"]];
for (const path of servicePaths) {
  const state = resolveBranch("services", path);
  check(`services ${path.join("/") || "root"} resolves`, !!state);
  if (!state) continue;
  const back = pathFromFilters(filters({ ...state.patch, section: "services" }));
  const again = resolveBranch("services", back);
  check(`services round trip ${path.join("/") || "root"}`, !!again && again.patch.category === state.patch.category, back);
}
check("path group", pathFromFilters(filters({ section: "services", category: "svc-health" })).join("/") === "svc-health/all");
check("path leaf in group", pathFromFilters(filters({ section: "services", category: "dentist" })).join("/") === "svc-health/dentist");
check("path top leaf", pathFromFilters(filters({ section: "services", category: "cleaning" })).join("/") === "cleaning");
check("path empty", pathFromFilters(filters({ section: "services", category: null })).length === 0);

const plants = resolveBranch("animals", ["plants", "potato"]);
check("animals plants/potato", !!plants && plants.patch.animalKind === "potato" && plants.patch.animalGroup === "plants");
if (plants) {
  const back = pathFromFilters(filters({ ...plants.patch, section: "animals" }));
  const again = resolveBranch("animals", back);
  check("animals round trip", back.join("/") === "plants/potato" && !!again && again.patch.animalKind === "potato");
}
const scania = resolveBranch("cars", ["special", "truck", "scania"]);
check("cars truck scania", !!scania && scania.patch.carMake === "scania" && scania.patch.bodyType === "truck" && scania.showFeed);
if (scania) {
  const back = pathFromFilters(filters({ ...scania.patch, section: "cars" }));
  const again = resolveBranch("cars", back);
  check("cars round trip", back.join("/") === "special/truck/scania" && !!again && again.patch.carMake === "scania");
}
check("unknown service group", resolveBranch("services", ["svc-unknown"]) === null);
check("unknown service leaf", resolveBranch("services", ["svc-health", "nope"]) === null);
check("pharmacy is not a service path", resolveBranch("services", ["svc-health", "health-pharmacy"]) === null);
check("unknown animal path", resolveBranch("animals", ["nope"]) === null);
const health = resolveBranch("services", ["svc-health"]);
const pharmacy = health?.options.find((row) => row.id === "health-pharmacy");
check("pharmacy row links to shop points", pharmacy?.href === PHARMACY_SHOP_HREF && !pharmacy.hasChildren);

const draft = { category: "cleaning" };
check("group tap does not write svc-*", draftAfterServiceTap(draft, "svc-health").category === "cleaning");
check("leaf tap writes the leaf", draftAfterServiceTap(draft, "dentist").category === "dentist");
const healthChoices = serviceChoicesForPost("svc-health");
check("post health has no pharmacy", healthChoices.join() === "clinic,dentist" && !healthChoices.some((id) => id.includes("pharm")));
check("post top list has no pharmacy", !serviceChoicesForPost(null).some((id) => id.includes("pharm") || id === "health-pharmacy"));
check("open group blocks a leaf from another group", !serviceLeafReady("cleaning", "svc-health"));
check("matching leaf is ready", serviceLeafReady("dentist", "svc-health"));
check("group id is never ready", !serviceLeafReady("svc-health", null));

const top = resolveBranch("services", []);
check("service root lists groups", !!top && top.options.some((row) => row.id === "svc-health" && row.hasChildren));
check("BRANCH_ALL is all", BRANCH_ALL === "all");

if (failed) {
  console.error(`test:catalog ${passed} passed, ${failed} failed`);
  process.exit(1);
}
console.log(`test:catalog ${passed} passed`);
