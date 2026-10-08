import { DISTRICTS } from "../src/lib/data";
import { haversineKm, mapTileConfig, nearRadiusKm } from "../src/lib/geo";
import { applyFilters, homeFeedFilters, mapPointFilters, nearDecision, nearPatch, scopeForSaved } from "../src/lib/filter";
import { locate } from "../src/lib/locate";
import { UploadFatal, uploadSession, withRetry, type HttpResult, type UploadRequest } from "../src/lib/media-queue";
import { clampWall } from "../src/components/media-capture";
import { placeDistrict, placeFromGeo } from "../src/lib/places";
import type { Filters, Listing } from "../src/lib/types";

let failed = 0;

function check(name: string, cond: boolean, extra?: unknown) {
  if (!cond) {
    console.error("FAIL", name, extra ?? "");
    failed += 1;
    return;
  }
  console.log("PASS", name);
}

function filters(patch: Partial<Filters>): Filters {
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

type Step = "ok" | 1 | 2 | 3;

function installWindow(secure: boolean) {
  const g = globalThis as unknown as { window?: object };
  if (!g.window) g.window = g;
  Object.defineProperty(g.window, "isSecureContext", { value: secure, configurable: true });
}

function installGeo(steps: Step[]) {
  let i = 0;
  const calls: number[] = [];
  const geolocation = {
    getCurrentPosition(success: (pos: { coords: { latitude: number; longitude: number; accuracy: number } }) => void, error: (err: { code: number }) => void) {
      const step = steps[Math.min(i, steps.length - 1)];
      i += 1;
      calls.push(step === "ok" ? 0 : step);
      if (step === "ok") success({ coords: { latitude: 42.8, longitude: 74.6, accuracy: 15 } });
      else error({ code: step });
    },
    watchPosition() {
      return 0;
    },
    clearWatch() {},
  };
  Object.defineProperty(globalThis, "navigator", { value: { geolocation }, configurable: true });
  return calls;
}

async function testLocate() {
  installWindow(false);
  installGeo(["ok"]);
  const insecure = await locate();
  check("locate insecure", !insecure.ok && insecure.error === "insecure");

  installWindow(true);
  Object.defineProperty(globalThis, "navigator", { value: {}, configurable: true });
  const unsupported = await locate();
  check("locate unsupported", !unsupported.ok && unsupported.error === "unsupported");

  installWindow(true);
  const deniedCalls = installGeo([1]);
  const denied = await locate();
  check("locate denied", !denied.ok && denied.error === "denied" && deniedCalls.length === 1, denied);

  const offCalls = installGeo([2, 2]);
  const off = await locate();
  check("locate off", !off.ok && off.error === "off" && offCalls.length === 2, off);

  const retryCalls = installGeo([3, "ok"]);
  const retried = await locate();
  check(
    "locate low-accuracy retry",
    retried.ok === true && retried.lat === 42.8 && retried.lng === 74.6 && retried.accuracy === 15 && retryCalls.length === 2,
    retried,
  );

  const timeoutCalls = installGeo([3, 3]);
  const timeout = await locate();
  check("locate timeout", !timeout.ok && timeout.error === "timeout" && timeoutCalls.length === 2, timeout);
}

function testPlaces() {
  const lenin = placeFromGeo(42.8726, 74.5898, "ru");
  check("place leninsky", lenin.city === "bishkek" && lenin.settlement === "any" && (lenin.locLabel ?? "").includes("Ленин"), lenin);

  const kant = placeFromGeo(42.891, 74.85, "ru");
  check("place kant kept", kant.settlement === "kant", kant);

  const naryn = placeFromGeo(41.5, 76.001, "ru");
  check("place naryn outskirts", naryn.city === "naryn" && naryn.settlement === "any" && naryn.locLat === 41.5 && naryn.locLng === 76.001, naryn);
}

/** Today's place filter, including the old rent/restaurant 6 km rule, for the equality cases. */
function legacyIds(list: Listing[], input: Filters, city: string): string[] {
  return list
    .filter((item) => {
      if (item.status === "draft" || item.status === "withdrawn" || item.status === "closed") return false;
      if (input.settlement && input.settlement !== "any") {
        if (item.settlement !== input.settlement) return false;
      } else {
        const cityKey = input.city !== "all" ? input.city : city;
        if (cityKey && cityKey !== "all" && item.city !== cityKey) return false;
      }
      if (
        !input.aiylOnly &&
        (!input.settlement || input.settlement === "any") &&
        (input.section === "rent" || input.section === "restaurants") &&
        input.locLat != null &&
        input.locLng != null &&
        item.lat != null &&
        item.lng != null &&
        haversineKm(input.locLat, input.locLng, item.lat, item.lng) > 6
      ) {
        return false;
      }
      return true;
    })
    .map((item) => item.id)
    .sort();
}

function ids(list: Listing[]) {
  return list.map((item) => item.id).sort();
}

async function testFilters() {
  process.env.NEXT_PUBLIC_NEAR_RADIUS_KM = "5";
  check("near radius default 5", nearRadiusKm() === 5);
  const origin = { lat: 42.8746, lng: 74.5698 };
  const close = { lat: origin.lat + 3 / 111, lng: origin.lng };
  const far = { lat: origin.lat + 8 / 111, lng: origin.lng };
  check("fixture 3km inside", haversineKm(origin.lat, origin.lng, close.lat, close.lng) < 5);
  check("fixture 8km outside", haversineKm(origin.lat, origin.lng, far.lat, far.lng) > 5);

  const rows = [
    listing({ id: "near-goods", section: "secondhand", city: "bishkek", lat: close.lat, lng: close.lng }),
    listing({ id: "far-goods", section: "secondhand", city: "bishkek", lat: far.lat, lng: far.lng }),
    listing({ id: "near-rent", section: "rent", city: "bishkek", lat: close.lat, lng: close.lng }),
    listing({ id: "far-rent", section: "rent", city: "bishkek", lat: far.lat, lng: far.lng }),
    listing({ id: "no-coords", section: "secondhand", city: "bishkek" }),
    listing({ id: "osh", section: "secondhand", city: "osh", lat: 40.53, lng: 72.8 }),
  ];
  const near = applyFilters(
    rows,
    filters({ scope: "near", nearLat: origin.lat, nearLng: origin.lng, locLat: 40, locLng: 70, section: null }),
    "all",
  );
  const nearIds = ids(near);
  check("near keeps 3km and hides 8km", nearIds.includes("near-goods") && nearIds.includes("near-rent") && !nearIds.includes("far-goods") && !nearIds.includes("far-rent"), nearIds);
  check("near applies to goods", nearIds.includes("near-goods") && !nearIds.includes("far-goods"));
  check("near drops listings without coordinates", !nearIds.includes("no-coords"));

  const areaInput = filters({ scope: "area", city: "bishkek", section: null });
  const areaIds = ids(applyFilters(rows, areaInput, "bishkek"));
  check("area matches today's place filter", JSON.stringify(areaIds) === JSON.stringify(legacyIds(rows, areaInput, "bishkek")), areaIds);

  const allInput = filters({ scope: "all", city: "all", section: null, locLat: origin.lat, locLng: origin.lng });
  const allIds = ids(applyFilters(rows, allInput, "all"));
  check("all matches today's place filter", JSON.stringify(allIds) === JSON.stringify(legacyIds(rows, allInput, "all")), allIds);

  const rentArea = filters({ scope: "area", city: "bishkek", section: "rent", locLat: origin.lat, locLng: origin.lng });
  const rentIds = ids(applyFilters(rows, rentArea, "bishkek"));
  check("area keeps a rent listing outside the old 6km rule", rentIds.includes("far-rent") && rentIds.includes("near-rent"), rentIds);

  check("saved locLat migrates to area", scopeForSaved({ locLat: 42.8, locLng: 74.6, city: "bishkek" }) === "area");
  check("saved nearLat migrates to near", scopeForSaved({ nearLat: 40.51, nearLng: 72.8, locLat: 42.882, city: "bishkek" }) === "near");
  check("saved city migrates to area", scopeForSaved({ city: "osh" }) === "area");
  check("saved settlement migrates to area", scopeForSaved({ settlement: "kant" }) === "area");
  check("saved oblast migrates to area", scopeForSaved({ oblast: "naryn" }) === "area");
  check("saved district label migrates to area", scopeForSaved({ locLabel: "Ленинский район" }) === "area");
  check("saved empty migrates to all", scopeForSaved({}) === "all");
  check("explicit scope is kept", scopeForSaved({ locLat: 42.8, scope: "area" }) === "area");

  const sverdlov = DISTRICTS.find((d) => d.id === "sverdlov");
  check("sverdlov fixture", Boolean(sverdlov));
  if (sverdlov) {
    const district = placeDistrict(sverdlov, "ru");
    const manual = filters({
      scope: "area",
      city: district.city,
      locLat: district.locLat,
      locLng: district.locLng,
      locLabel: district.locLabel,
    });
    installWindow(true);
    const calls = installGeo(["ok"]);
    check("manual district asks locate", nearDecision(manual) === "locate");
    const asked = await locate();
    check("manual district calls locate", asked.ok === true && calls.length === 1, { asked, calls });
    const gps = { lat: 40.513, lng: 72.816 };
    const patch = nearPatch(gps);
    check(
      "nearby patch is the phone",
      patch.scope === "near" && patch.nearLat === gps.lat && patch.nearLng === gps.lng && !("locLat" in patch),
      patch,
    );
    const next = { ...manual, ...patch };
    const around = ids(
      applyFilters(
        [
          listing({ id: "sverdlov-centre", section: "secondhand", city: "bishkek", lat: district.locLat ?? 0, lng: district.locLng ?? 0 }),
          listing({ id: "phone-osh", section: "secondhand", city: "osh", lat: gps.lat, lng: gps.lng }),
        ],
        next,
        "bishkek",
      ),
    );
    check("near uses phone not district centre", around.includes("phone-osh") && !around.includes("sverdlov-centre"), around);
    check("nearby keeps the district pin", next.locLat === district.locLat && next.locLabel === district.locLabel);
  }

  const point = mapPointFilters({ section: "rent", locLat: 42.87, locLng: 74.59, locLabel: "Ленинский район" });
  check("map applyPoint patch contains scope area", point.scope === "area" && point.locLat === 42.87, point);
  const oshHidden = applyFilters(
    [listing({ id: "osh-flat", section: "rent", city: "osh", lat: 40.51, lng: 72.8 })],
    filters({ ...point, city: "bishkek" }),
    "bishkek",
  );
  check("area bishkek hides osh", oshHidden.length === 0, ids(oshHidden));

  const fed = homeFeedFilters(
    filters({
      scope: "near",
      nearLat: 40.51,
      nearLng: 72.8,
      locLat: 42.882,
      locLng: 74.635,
      locLabel: "Свердловский район",
    }),
  );
  check(
    "home feed keeps phone and clears pin",
    fed.nearLat === 40.51 && fed.nearLng === 72.8 && fed.locLat == null && fed.locLng == null && fed.locLabel == null,
    fed,
  );
}

function testTiles() {
  const unset = mapTileConfig({});
  check("tiles unset is 2gis", unset.url.includes("maps.2gis.com/tiles") && unset.subdomains === "0123" && unset.attribution === "© 2ГИС", unset);
  const named = mapTileConfig({ tiles: "2gis" });
  check("tiles 2gis", named.url === unset.url && named.attribution === "© 2ГИС");
  const osm = mapTileConfig({ tiles: "osm" });
  check(
    "tiles osm",
    osm.url === "https://tile.openstreetmap.org/{z}/{x}/{y}.png" && osm.attribution === "© OpenStreetMap contributors" && osm.maxZoom === 19,
    osm,
  );
  const unknown = mapTileConfig({ tiles: "bing" });
  check("tiles unknown is 2gis", unknown.url === unset.url && unknown.attribution === "© 2ГИС", unknown);
}

function http(status: number, data: HttpResult["data"] = {}, extra: Partial<HttpResult> = {}): HttpResult {
  return { ok: status >= 200 && status < 300, status, data, error: data.error || String(status), ...extra };
}

async function testQueue() {
  let n = 0;
  try {
    await withRetry(async () => {
      n += 1;
      return http(403, { error: "no" });
    }, []);
    check("queue 403 is fatal", false);
  } catch (err) {
    check("queue 403 is fatal", err instanceof UploadFatal && n === 1, err);
  }

  let tries = 0;
  const retried = await withRetry(async () => {
    tries += 1;
    if (tries === 1) return http(429, {}, { retryAfter: 0 });
    return http(200, {});
  }, []);
  check("queue 429 is retried", retried.ok && tries === 2, { tries, retried });

  const bytes = new Uint8Array([1, 2, 3, 4]);
  let puts = 0;
  const once: UploadRequest = async (url, init) => {
    if (init.method === "POST" && url === "/api/uploads") {
      return http(200, { uploadId: puts === 0 ? "a" : "b", chunkSize: 1024 });
    }
    if (init.method === "PUT") {
      puts += 1;
      if (puts === 1) return http(404);
      return http(200, { received: bytes.length });
    }
    return http(200, { url: "/media/ok" });
  };
  const state: { uploadId?: string; received?: number } = {};
  const url = await uploadSession({
    bytes,
    meta: { kind: "photo", mime: "image/jpeg", size: bytes.length },
    request: once,
    remember: async (patch) => {
      Object.assign(state, patch);
    },
  });
  check("queue chunk 404 once restarts", url === "/media/ok" && state.uploadId === "b" && puts === 2, { url, state, puts });

  let puts2 = 0;
  const twice: UploadRequest = async (url, init) => {
    if (init.method === "POST" && url === "/api/uploads") return http(200, { uploadId: `s${puts2}`, chunkSize: 1024 });
    if (init.method === "PUT") {
      puts2 += 1;
      return http(404);
    }
    return http(200, { url: "/media/no" });
  };
  try {
    await uploadSession({
      bytes,
      meta: { kind: "photo", mime: "image/jpeg", size: bytes.length },
      request: twice,
      remember: async () => undefined,
    });
    check("queue chunk 404 twice is fatal", false);
  } catch (err) {
    check("queue chunk 404 twice is fatal", err instanceof UploadFatal && (err as UploadFatal).code === "expired" && puts2 === 2, err);
  }
}

function testClamp() {
  check("clamp auto stop", clampWall(120.4, 120, true) === 120);
  check("clamp manual stop", clampWall(120.4, 120, false) === 120.4);
  check("clamp short auto", clampWall(30, 120, true) === 30);
}

async function main() {
  await testLocate();
  testPlaces();
  await testFilters();
  testTiles();
  await testQueue();
  testClamp();
  if (failed) {
    console.error(`test:geo failed ${failed}`);
    process.exit(1);
  }
  console.log("test:geo passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
