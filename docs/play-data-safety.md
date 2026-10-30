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
| Account creation | Google sign-in and Telegram sign-in (web and the current Android app). Telegram login stores the Telegram user id and first name only — no phone, no messages, no contacts. No SMS. The old «учебный вход» is removed: demo sessions are not honoured in production. Account and session data are stored on our server. Delete-account URL as above removes that server data; backups rotate out (7 daily DB dumps, 4 weekly media archives). |
| Data shared with third parties? | No. Firebase, Timeweb, 2GIS, and the login providers are service providers, or the transfer is user-initiated. Neither counts as "sharing" under Play's definition. |

## Data types
"Optional" means the user can use the app (browse the feed) without providing it.

| Category → Data type (Play name / по-русски) | Collected | Shared | Ephemeral? | Required / Optional | Purposes |
|---|---|---|---|---|---|
| Location → Approximate location (Примерное местоположение) | Yes | No | No | Optional (permission) | App functionality |
| Location → Precise location (Точное местоположение) | Yes | No | No | Optional (permission) | App functionality |
| Personal info → Name (Имя) — from Google, or the Telegram first name, shown on listings | Yes | No | No | Optional (Google or Telegram account; also needed to post) | Account management, App functionality |
| Personal info → Email address (Эл. почта) — from Google sign-in | Yes | No | No | Optional | Account management |
| Personal info → User IDs (ID аккаунта Google, `sub`, or Telegram user id) | Yes | No | No | Optional | Account management |
| Personal info → Phone number (Телефон) | Yes | No | No | Collected, required to publish a personal listing. Visible to other signed-in users on your listings (call / WhatsApp). Change or remove it in «Мои данные». | App functionality |
| Photos and videos → Photos (Фото) | Yes | No | No | Optional | App functionality |
| Photos and videos → Videos (Видео) | Yes | No | No | Optional | App functionality |
| Audio files → Voice or sound recordings (Голос, звук) | Yes | No | No | Optional | App functionality |
| Messages → Other in-app messages (Сообщения в чате, №84) | Not yet — tables exist; messages stay on the device until Шаг 19 | No | No | Optional | App functionality |
| App activity → App interactions (лайки, корзина, подписки, блокировки) | Yes | No | No | Optional | App functionality |
| App activity → Other user-generated content (объявления, точки, жалобы) | Yes | No | No | Optional | App functionality |
| App info and performance → Crash logs (Crashlytics) | Yes | No | No | Required (automatic) | App functionality, Analytics |
| App info and performance → Diagnostics (Crashlytics device/OS info) | Yes | No | No | Required (automatic) | App functionality, Analytics |
| Device or other IDs → Device or other IDs (FCM push token, Firebase installation ID) | Yes (Шаг 4 stores the token when the app sends it; sending needs google-services.json) | No | No | Required (automatic) | App functionality (push), Analytics (crash grouping) |

## Google sign-in (Шаг 8) — linked to the user, not shared, deletable on request

The old «учебный вход» lines are removed. Play Console is filled by the owner in Шаг 15.

| Category → Data type | Collected | Shared | Linked to the user | Purpose | Deletable |
|---|---|---|---|---|---|
| Personal info → Name | Yes | No | Yes | Account management (name on listings) | Yes — /delete-account |
| Personal info → Email address | Yes | No | Yes | Account management | Yes — /delete-account |
| App info → User IDs (Google account ID) | Yes | No | Yes | Account management | Yes — /delete-account |

The Google profile photo is not stored.

## Telegram sign-in (Шаг 8б) — linked to the user, not shared, deletable on request

Telegram is a separate account from Google. We do not merge them.

| Category → Data type | Collected | Shared | Linked to the user | Purpose | Deletable |
|---|---|---|---|---|---|
| Personal info → Name (Telegram first name only) | Yes | No | Yes | Account management (name on listings) | Yes — /delete-account |
| App info → User IDs (Telegram user id) | Yes | No | Yes | Account management | Yes — /delete-account |

Not collected from Telegram: phone number, messages, contacts, username, profile photo.

## Not collected
Financial info, Health and fitness, Contacts, Calendar (the «В календарь» link only opens the user's calendar app), Web browsing, Files and docs, Emails/SMS, Installed apps, Race/religion/political/sexual orientation, Precise purchase history, In-app search history (saved searches stay on the device).

## To re-check in Шаг 26
- In-app account deletion button exists (Шаг 16) → mention it.
- Шаг 4 stores listings, shops, photos, videos, voice, likes, cart, subscriptions, reports, push tokens, and account/session data on the Timeweb VPS in Russia, with daily backups (7 daily DB dumps, 4 weekly media archives). Deletion via /delete-account removes the server copy; backups rotate out inside that window. Chat messages stay on the device until Шаг 19. Saved searches stay on the device. Sign-in is Google (name, email, Google account ID) or Telegram (Telegram user id and first name only — no phone, no messages, no contacts). The old «учебный вход» is removed. No SMS.
- No ads SDK and no analytics SDK beyond Crashlytics added since.
