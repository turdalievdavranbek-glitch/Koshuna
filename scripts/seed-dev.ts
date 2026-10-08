import { existsSync, readFileSync } from "node:fs";

function loadEnvFile(file: string) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

function refuseReason(): string | null {
  if (process.env.ALLOW_DEMO_SEED !== "1") return "ALLOW_DEMO_SEED is not 1";
  if (process.env.NODE_ENV === "production") return "NODE_ENV is production";
  if (existsSync("/etc/koshuna/backend.env")) return "/etc/koshuna/backend.env exists";
  return null;
}

const USER1 = "00000000-0000-4000-8000-0000000000a1";
const USER2 = "00000000-0000-4000-8000-0000000000a2";

function ownerFor(ownerId: string | undefined): string {
  if (ownerId === "aida" || ownerId === "asel") return USER1;
  return USER2;
}

async function main() {
  const why = refuseReason();
  if (why) {
    console.error(`refused: ${why}`);
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing");
    process.exit(1);
  }

  const { listingFromShopProduct, listingIdForProduct } = await import("../src/lib/shop-listing");
  const { LISTINGS } = await import("../src/lib/data");
  const { SEED_DEALER_CARS } = await import("../src/lib/partners");
  const { SEED_SHOPS } = await import("../src/lib/seed-shops");
  const { getDb } = await import("../src/server/db");
  const { listings, shops, userAuth, users } = await import("../src/server/db/schema");
  const { listingToRow, shopToColumns } = await import("../src/server/mappers");

  const db = getDb();
  await db
    .insert(users)
    .values([
      { id: USER1, name: "Айгуль", phone: "555000101" },
      { id: USER2, name: "Бекзат", phone: "555000202" },
    ])
    .onConflictDoNothing();
  await db
    .insert(userAuth)
    .values([
      { userId: USER1, provider: "demo", providerUserId: "phone:555000101" },
      { userId: USER2, provider: "demo", providerUserId: "phone:555000202" },
    ])
    .onConflictDoNothing();

  const shopOwners = [USER1, USER2];
  for (let i = 0; i < SEED_SHOPS.length; i += 1) {
    const shop = SEED_SHOPS[i];
    const ownerId = shopOwners[i] ?? USER2;
    await db.insert(shops).values(shopToColumns(shop, ownerId)).onConflictDoNothing();
  }

  const catalogue = [...LISTINGS, ...SEED_DEALER_CARS].map((listing) => listingToRow(listing, ownerFor(listing.ownerId)));
  const productRows = SEED_SHOPS.flatMap((shop, index) => {
    const ownerId = shopOwners[index] ?? USER2;
    return (shop.products ?? []).map((product) => {
      const id = product.listingId || listingIdForProduct(product.id);
      const listing = listingFromShopProduct(shop, { ...product, listingId: id }, null);
      listing.ownerId = ownerId;
      listing.id = id;
      return listingToRow(listing, ownerId);
    });
  });

  const rows = [...catalogue, ...productRows];
  const chunk = 50;
  for (let i = 0; i < rows.length; i += chunk) {
    await db.insert(listings).values(rows.slice(i, i + chunk)).onConflictDoNothing();
  }
  console.log(`seeded users=2 shops=${SEED_SHOPS.length} listings=${rows.length} (conflicts skipped)`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
