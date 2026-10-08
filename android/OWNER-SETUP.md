# Коңшу — что сделать владельцу (Шаг 1)

Приложение на телефоне называется **Коңшу**. Латинское имя для кабинетов, где кириллица не принимается: **Konshu**. Идентификатор пакета не меняется: `com.koshuna.app`.

Иконка — выбранная владельцем 28.09.2026 (жёлтый круг с красной «К» на красном фоне), исходник `android/icon-source/konshu-icon-512.png`; она же — иконка листинга в Play.

Сайт в оболочке открывается по `https://koshuna.ru`. Сборка **без** файла Firebase компилируется, но отчёты о вылетах и push заработают только после пункта 1 и **одной** пересборки APK.

## 1. Firebase (вылеты и push)

1. Откройте [Firebase console](https://console.firebase.google.com/) и создайте проект. Имя можно латиницей: `Konshu`.
2. Добавьте приложение Android. Имя пакета строго `com.koshuna.app`.
3. Скачайте `google-services.json` и положите его сюда: `android/app/google-services.json`. В git его не класть.
4. В том же проекте включите **Crashlytics** (Build → Crashlytics) и **Cloud Messaging** (он включается вместе с приложением Android).
5. Пересоберите подписанный APK (пункт 4). Без этой пересборки телефон не знает номер проекта Firebase.

Пока файла нет, приложение всё равно открывает сайт. Вылеты в консоль не уходят.

## 2. Отпечатки SHA-1 и SHA-256

Их спрашивают Firebase и Google вход. Команды на компьютере, где лежит ключ:

Отладочный ключ (только для своего телефона):

```bash
keytool -list -v -keystore "$HOME/.android/debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

Ключ загрузки в Play (пункт 3):

```bash
keytool -list -v -keystore /путь/к/upload-keystore.jks -alias upload
```

Скопируйте строки **SHA-1** и **SHA-256**.

Куда вставить:

- Firebase → настройки проекта → ваше Android-приложение → «Добавить отпечаток» → SHA-1 **и** SHA-256 ключа загрузки. Позже, когда Play включит подпись приложения, добавьте ещё SHA-1 и SHA-256 **ключа подписи приложения** из Play Console (см. пункт 5). Иначе вход Google на сборке из Play не откроется.
- Файл `public/.well-known/assetlinks.json`: замените две строки-заглушки на SHA-256. Первая — ключ загрузки (для APK, который ставят по ссылке). Вторая — ключ подписи приложения из Play (для установки из Play). Пока второй неизвестен, оставьте одну настоящую строку SHA-256 ключа загрузки и удалите заглушку.

## 3. Ключ загрузки для Play

Один раз, пароли записать на бумаге и в менеджер паролей. Файл `.jks` не отправлять в git и не терять: без него обновления в Play не подписать.

```bash
keytool -genkeypair -v \
  -keystore "$HOME/koshuna-upload-keystore.jks" \
  -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

В вопросах keytool имя можно указать `Davranbek Turdaliev`. Пароль хранилища и пароль ключа запомните.

Перед сборкой релиза задайте переменные (подставьте свои пути и пароли):

```bash
export KOSHUNA_KEYSTORE_PATH="$HOME/koshuna-upload-keystore.jks"
export KOSHUNA_KEYSTORE_PASSWORD="пароль-хранилища"
export KOSHUNA_KEY_ALIAS="upload"
export KOSHUNA_KEY_PASSWORD="пароль-ключа"
```

Либо скопируйте `android/keystore.properties.example` в `android/keystore.properties` и заполните. Этот файл тоже не попадает в git.

Сборка:

```bash
cd android
./gradlew assembleRelease
```

Готовый файл: `android/app/build/outputs/apk/release/app-release.apk`.

Без этих переменных `assembleRelease` собирает APK **без подписи**. Для телестов и Play нужна подпись. `assembleDebug` подпись Play не использует.

## 4. Ссылка на APK

Стабильный адрес: `https://koshuna.ru/download/koshuna.apk`

Перед выкладкой сайта скопируйте подписанный APK и перезапустите сайт. Next видит новый файл в `public/` после старта процесса. Тип файла уже `application/vnd.android.package-archive`.

```bash
mkdir -p /var/www/koshuna/public/download
cp android/app/build/outputs/apk/release/app-release.apk /var/www/koshuna/public/download/koshuna.apk
pm2 list
pm2 restart <имя процесса, который запускает next start>
```

Отдельный location в nginx не нужен, если весь сайт проксируется на Next (порт 43123). Если nginx отдаёт только часть путей, добавьте:

```nginx
location = /download/koshuna.apk {
    alias /var/www/koshuna/public/download/koshuna.apk;
    default_type application/vnd.android.package-archive;
    add_header Content-Disposition 'attachment; filename="koshuna.apk"';
}
```

## 5. Google Play — подпись приложения

1. В Play Console создайте приложение **Коңшу** (латиницей, если поле не принимает «ң»: **Konshu**). Пакет `com.koshuna.app`.
2. Включите **Play App Signing** (подпись приложения Google). Загрузите не APK, а позже AAB (Шаг 26). Ключ из пункта 3 — это ключ **загрузки**. Google хранит отдельный ключ подписи.
3. Play Console → Настройка → Подпись приложения → скопируйте SHA-1 и SHA-256 **сертификата ключа подписи приложения** и добавьте их в Firebase (пункт 2) и SHA-256 в `assetlinks.json`.
4. Закрытый тест и финальный AAB — не этот шаг.

## 6. Вход Google (кнопки будут в Шаге 8, кабинеты — сейчас)

1. [Google Cloud Console](https://console.cloud.google.com/) → тот же проект, что Firebase (Firebase создаёт его сам) → APIs & Services → Credentials.
2. Создайте **OAuth client ID** типа **Web**. Скопируйте клиентский ID (оканчивается на `.apps.googleusercontent.com`).
3. Создайте **OAuth client ID** типа **Android**: пакет `com.koshuna.app`, SHA-1 из пункта 2 (сначала ключ загрузки, после Play — ещё ключ подписи приложения).
4. На сервере сайта, в файле окружения рядом с запуском Next, допишите и пересоберите сайт (APK заново не нужен):

```bash
NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID=сюда-web-client-id.apps.googleusercontent.com
```

Экран входа в приложении пока не меняется. Кнопку подключим в Шаге 8.

## 7. Вход Apple (кнопки — Шаг 8)

Нужен аккаунт [Apple Developer](https://developer.apple.com/account).

1. Identifiers → Services IDs → создайте Services ID, например `com.koshuna.app.signin`. Это значение для `NEXT_PUBLIC_APPLE_SERVICE_ID`.
2. Включите для него Sign in with Apple. Домен: `koshuna.ru`. Return URL: `https://koshuna.ru/auth/apple/callback`.
3. На сервере:

```bash
NEXT_PUBLIC_APPLE_SERVICE_ID=com.koshuna.app.signin
NEXT_PUBLIC_APPLE_REDIRECT_URL=https://koshuna.ru/auth/apple/callback
```

Ключ Sign in with Apple (Key) понадобится, когда сервер начнёт проверять вход (Шаг 8). Сейчас его можно создать и сохранить, в код не класть.

## 8. Ссылки с сайта в приложение

Файл уже в репозитории: `public/.well-known/assetlinks.json`. После выкладки он должен открываться как

`https://koshuna.ru/.well-known/assetlinks.json`

без редиректа, с типом `application/json`.

Если в nginx есть запрет на папки с точкой (`location ~ /\.`), для этого адреса сделайте исключение и отдайте файл из `public/.well-known/assetlinks.json`. Иначе ссылки не будут открывать приложение.

Пока в файле заглушки вместо SHA-256, Android ссылки в приложение не подтвердит. Сайт в браузере от этого не ломается.
