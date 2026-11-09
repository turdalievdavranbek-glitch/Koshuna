import assert from "node:assert/strict";
import { hiddenByBlock, ownerBlockedRequester } from "../src/lib/blocks";
import { DICT } from "../src/lib/i18n";
import { genericOgCard, listingOgCard, shopOgCard } from "../src/lib/open-graph";
import { buildPublicProfile, publicDisplayName } from "../src/lib/public-name";
import { cardShareText } from "../src/lib/share";
import { telegramLink, telegramUsername } from "../src/lib/telegram-username";

assert.equal(telegramUsername("https://t.me/Koshuna_shop"), "Koshuna_shop");
assert.equal(telegramUsername("@koshuna"), "koshuna");
assert.equal(telegramUsername("1"), null);
assert.equal(telegramUsername("https://t.me/"), null);
assert.equal(telegramUsername("ab"), null);
assert.equal(telegramLink(" @koshuna "), "https://t.me/koshuna");

assert.equal(publicDisplayName("Давранбек Турдалиев"), "Давранбек");
assert.equal(publicDisplayName(` ${"А".repeat(50)} Бек`).length, 40);
const profile = buildPublicProfile(
  { id: "11111111-1111-4111-8111-111111111111", name: "Айбек Сатыбалдиев", createdAt: new Date("2026-04-02T00:00:00Z") },
  3,
);
assert.equal(profile.name, "Айбек");
assert.equal(profile.joinedYear, 2026);
assert.equal(profile.activeListings, 3);
assert.equal("phone" in profile, false);
assert.equal("email" in profile, false);
assert.equal(JSON.stringify(profile).includes("996"), false);
assert.equal(JSON.stringify(profile).includes("+"), false);

const hidden = listingOgCard({
  id: "secret",
  status: "hidden",
  title: "Секрет +996555123456",
  price: 100,
  place: "Бишкек",
  image: "/media/secret.jpg",
});
assert.equal(hidden.hidden, true);
assert.equal(hidden.title, genericOgCard().title);
assert.equal(hidden.image, "/brand/og-default.png");
assert.equal(JSON.stringify(hidden).includes("996"), false);
assert.equal(JSON.stringify(hidden).includes("Секрет"), false);

const open = listingOgCard({
  id: "bread",
  status: "active",
  title: "Хлеб",
  price: null,
  place: "Бишкек",
  image: "/media/bread.jpg",
});
assert.equal(open.title, "Хлеб — договорная");
assert.equal(open.description, "Бишкек · Коңшу");
assert.equal(JSON.stringify(open).includes("996"), false);

const point = shopOgCard({ id: "s1", status: "withdrawn", name: "Точка", place: "Ош", image: "/media/p.jpg" });
assert.equal(point.hidden, true);
assert.equal(point.image, "/brand/og-default.png");

const text = cardShareText({
  title: "Хлеб",
  price: "договорная",
  place: "Бишкек",
  url: "https://koshuna.ru/listing/bread",
});
assert.equal(text, "Хлеб · договорная · Бишкек · https://koshuna.ru/listing/bread");
assert.equal(text.includes("+996"), false);
assert.equal(text.includes("#"), false);

assert.equal(DICT.ru.followersCount(1), "1 подписчик");
assert.equal(DICT.ru.followersCount(2), "2 подписчика");
assert.equal(DICT.ru.followersCount(5), "5 подписчиков");
assert.equal(DICT.ru.followersCount(11), "11 подписчиков");
assert.equal(DICT.ru.followersCount(21), "21 подписчик");
assert.equal(DICT.ky.followersCount(21), "21 жазылуучу");
assert.equal(DICT.ru.followersNone, "Пока нет подписчиков");
assert.equal(DICT.ky.chatBlocked, "Жазышуу жабык: автор бөгөттөлгөн.");
assert.equal(DICT.ru.notifChat("Айбек", "Диван"), "Айбек написал про «Диван»");
assert.equal(DICT.ky.notifChat("Айбек", "Диван"), "Айбек «Диван» жөнүндө жазды");

assert.equal(hiddenByBlock("author", ["author"], "me"), true);
assert.equal(hiddenByBlock("author", ["author"], "author"), false);
assert.equal(hiddenByBlock("author", [], "me"), false);
assert.equal(hiddenByBlock("author", ["author"], null), false);
assert.equal(
  ownerBlockedRequester([{ blockerId: "author", blockedUserId: "me" }], "author", "me"),
  true,
);
assert.equal(
  ownerBlockedRequester([{ blockerId: "me", blockedUserId: "author" }], "author", "me"),
  false,
);

console.log("step12 logic ok");
