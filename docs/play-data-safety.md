# Google Play — Data Safety form: draft answers (Коңшу / Konshu, com.koshuna.app)

Draft prepared in Шаг 2 (№63). It describes the app as of the closed test, with the server from Шаг 4.
Re-check everything in Шаг 26 before production (plan: «в Шаге 26 только сверить»).
Privacy policy URL: https://koshuna.ru/privacy · Account deletion URL: https://koshuna.ru/delete-account

## Data collection and security
| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | Yes |
| Is all of the user data collected by your app encrypted in transit? | Yes (HTTPS only, cleartext disabled) |
| Do you provide a way for users to request that their data be deleted? | Yes — https://koshuna.ru/delete-account (in-app button «Удалить аккаунт» comes in Шаг 16) |
| Account creation | Users can create an account with OAuth: Telegram, Google, Apple (TikTok after Шаг 8). Delete-account URL as above. |
| Data shared with third parties? | No. Firebase, Timeweb, 2GIS, and the login providers are service providers, or the transfer is user-initiated. Neither counts as "sharing" under Play's definition. |

## Data types
"Optional" means the user can use the app (browse the feed) without providing it.

| Category → Data type (Play name / по-русски) | Collected | Shared | Ephemeral? | Required / Optional | Purposes |
|---|---|---|---|---|---|
| Location → Approximate location (Примерное местоположение) | Yes | No | No | Optional (permission) | App functionality |
| Location → Precise location (Точное местоположение) | Yes | No | No | Optional (permission) | App functionality |
| Personal info → Name (Имя) | Yes | No | No | Optional (needed to post) | App functionality, Account management |
| Personal info → Email address (Эл. почта) — from Google/Apple login | Yes | No | No | Optional | Account management |
| Personal info → User IDs (ID аккаунта Telegram/Google/Apple/TikTok) | Yes | No | No | Optional | Account management, App functionality |
| Personal info → Phone number (Телефон) | Yes | No | No | Optional (needed to post, shown for «Позвонить») | App functionality |
| Photos and videos → Photos (Фото) | Yes | No | No | Optional | App functionality |
| Photos and videos → Videos (Видео) | Yes | No | No | Optional | App functionality |
| Audio files → Voice or sound recordings (Голос, звук) | Yes | No | No | Optional | App functionality |
| Messages → Other in-app messages (Сообщения в чате, №84) | Not yet — tables exist; messages stay on the device until Шаг 19 | No | No | Optional | App functionality |
| App activity → App interactions (лайки, корзина, подписки, блокировки) | Yes | No | No | Optional | App functionality |
| App activity → Other user-generated content (объявления, точки, жалобы) | Yes | No | No | Optional | App functionality |
| App info and performance → Crash logs (Crashlytics) | Yes | No | No | Required (automatic) | App functionality, Analytics |
| App info and performance → Diagnostics (Crashlytics device/OS info) | Yes | No | No | Required (automatic) | App functionality, Analytics |
| Device or other IDs → Device or other IDs (FCM push token, Firebase installation ID) | Yes (Шаг 4 stores the token when the app sends it; sending needs google-services.json) | No | No | Required (automatic) | App functionality (push), Analytics (crash grouping) |

## Not collected
Financial info, Health and fitness, Contacts, Calendar (the «В календарь» link only opens the user's calendar app), Web browsing, Files and docs, Emails/SMS, Installed apps, Race/religion/political/sexual orientation, Precise purchase history, In-app search history (saved searches stay on device; re-check after Шаг 4).

## To re-check in Шаг 26
- In-app account deletion button exists (Шаг 16) → mention it.
- TikTok login actually shipped (Шаг 8).
- Шаг 4 stores listings, shops, photos, videos, voice, likes, cart, subscriptions, reports, and push tokens on the server. Chat messages stay on the device until Шаг 19. Saved searches stay on the device.
- No ads SDK and no analytics SDK beyond Crashlytics added since.
