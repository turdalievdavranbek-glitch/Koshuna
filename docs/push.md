# Push-уведомления (Android)

Сайт в браузере push не получает. Телефон — оболочка Capacitor, пакет `com.koshuna.app`. Сообщения уходят через FCM HTTP v1 из сервера Коңшу. Пока переменная ниже не задана, сервер ничего не отправляет и один раз пишет об этом в лог.

Проект Firebase: `konshu-cbb9e`.

## Ключ сервисного аккаунта

1. Откройте [Firebase → настройки проекта → Service accounts](https://console.firebase.google.com/project/konshu-cbb9e/settings/serviceaccounts/adminsdk).
2. Вкладка **Service accounts**. Нажмите **Generate new private key** и подтвердите. Скачается JSON.
3. Этот файл — секрет. Не кладите его в git, не присылайте в чат, не подставляйте в репозиторий.
4. На сервере положите его, например, в `/etc/koshuna/firebase-adminsdk.json`. Права: читает только пользователь, под которым крутится сайт (`chmod 600`).
5. В `/etc/koshuna/backend.env` добавьте одну строку:

```bash
FIREBASE_SERVICE_ACCOUNT_FILE=/etc/koshuna/firebase-adminsdk.json
```

Вместо файла можно вставить весь JSON одной строкой в `FIREBASE_SERVICE_ACCOUNT_JSON`. Файл проще: в JSON есть переносы строк.

6. В Google Cloud для того же проекта должна быть включена **Firebase Cloud Messaging API** (обычно уже включена у проекта с Android-приложением).
7. Примените миграцию `drizzle/0004_push_tokens.sql` (`npm run db:migrate`) и перезапустите процесс, который читает `backend.env`.

`google-services.json` в APK — это другой файл (клиент). Он по-прежнему нужен при сборке и в git не входит. См. `android/OWNER-SETUP.md`.

## Что делает приложение

Токен устройства пишется в таблицу `push_tokens` после входа или когда человек открывает «Сообщения» / отправляет сообщение. При выходе токен этого телефона удаляется. Нажатие на уведомление открывает чат, заявку или объявление — тот же путь, что у колокольчика.

Канал Android называется «Сообщения», важность высокая. Иконка уведомления уже есть: `android/app/src/main/res/drawable/ic_stat_notify.xml`. Чтобы канал и вопрос разрешения были такими, нужен новый APK: старая сборка спрашивает разрешение при запуске и создаёт другой канал.
