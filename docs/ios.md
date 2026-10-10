# Коңшу — iOS (Шаг 30)

Оболочка Capacitor 8 открывает `https://koshuna.ru`. Идентификатор `com.koshuna.app`, имя «Коңшу», только iPhone, iOS 15+. Зависимости iOS — Swift Package Manager: у `@capacitor/app`, `@capacitor/push-notifications`, `@capacitor-firebase/crashlytics`, `@capawesome/capacitor-google-sign-in` и `@capawesome/capacitor-apple-sign-in` есть `Package.swift`. CocoaPods не используется.

Сборки — вручную, workflow `.github/workflows/ios.yml` на `macos-26` с Xcode 26. В репозитории нет Team ID, ключей `.p8` и настоящего `GoogleService-Info.plist`. Файл в `ios/App/App/GoogleService-Info.plist` — заглушка. CI подменяет его секретом и не коммитит.

Push при запуске iOS не запрашивается. Android не менялся.

## Секреты GitHub Actions

| Секрет | Зачем |
| --- | --- |
| `GOOGLE_SERVICE_INFO_PLIST` | Весь plist (XML или base64). CI берёт из него `CLIENT_ID` и `REVERSED_CLIENT_ID`. |
| `GOOGLE_IOS_REVERSED_CLIENT_ID` | Необязательно. Если задан, перекрывает URL scheme из plist. |
| `ASC_KEY_ID` | App Store Connect API Key ID. |
| `ASC_ISSUER_ID` | Issuer ID того же ключа. |
| `ASC_KEY_P8` | Содержимое `.p8` этого ключа (PEM или base64). Это ключ API, не ключ Sign in with Apple. |
| `APPLE_TEAM_ID` | Team ID, 10 знаков. Подпись и provisioning. В проект не зашит. |

Номер сборки — `github.run_number` (`CURRENT_PROJECT_VERSION`). Загрузка в TestFlight: `xcodebuild -allowProvisioningUpdates`, затем `xcrun altool` или `xcrun iTMSTransporter`.

Ключ API нужен с доступом App Manager. В Apple Developer должен уже существовать App ID `com.koshuna.app` с Sign in with Apple и Associated Domains (`applinks:koshuna.ru`). Пока App ID нет, workflow не подпишет сборку.

## Переменные сервера (`/etc/koshuna/backend.env`)

| Переменная | Зачем |
| --- | --- |
| `GOOGLE_WEB_CLIENT_ID` | Как раньше. Обязателен и для iOS: плагин передаёт его как server client id. |
| `GOOGLE_IOS_CLIENT_ID` | Необязателен. iOS OAuth client id. Сервер принимает токен с `aud` или `azp` этого id. Без него вход Google в iOS не пройдёт проверку nonce: плагин nonce на iOS не ставит. |
| `APPLE_BUNDLE_ID` | Audience для `POST /api/auth/apple`. По умолчанию `com.koshuna.app`. |
| `APPLE_TEAM_ID` | `/.well-known/apple-app-site-association`: `appIDs` = `<TEAMID>.com.koshuna.app`, `paths` = `*`. Пусто — JSON без appIDs, без редиректа. |
| `APPLE_KEY_ID` | Необязательно. Key ID ключа Sign in with Apple. |
| `APPLE_PRIVATE_KEY` | Необязательно. PEM этого ключа (или base64). Вместе с `APPLE_KEY_ID` и `APPLE_TEAM_ID` сервер меняет authorization code на refresh token и при удалении аккаунта вызывает revoke. Если чего-то нет, вход и удаление не ломаются. |

Имя Apple сохраняется только когда у пользователя ещё нет имени (первый вход). Повторный вход имя не затирает.

Перед revoke на сервере: `npm run db:migrate` (таблица `apple_refresh_tokens`, `drizzle/0008_apple_refresh.sql`). Без миграции вход и удаление аккаунта всё равно проходят, revoke просто пропускается.

Nginx не должен редиректить `/.well-known/apple-app-site-association`. Ответ — `application/json`, как у `assetlinks.json`.

## Иконка и заставка

Источник — `android/icon-source/konshu-icon-512.png` (тот же знак, что на Android). `public/brand/logo.png` — слово «Коңшу», не иконка экрана. Картинка приведена к 1024×1024 без альфа-канала, заставка — красный фон `#E8112D`.

Сгенерировано офлайн:

```bash
npx @capacitor/assets generate --ios --assetPath assets --iconBackgroundColor '#E8112D' --splashBackgroundColor '#E8112D'
```

Флаг `--ios` не трогает `android/`.
