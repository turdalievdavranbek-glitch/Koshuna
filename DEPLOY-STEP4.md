# Выкладка Шага 4

Это инструкция для владельца. Агент её только пишет: на сервер ничего не выкладывается, пока владелец не скажет «да».

`scripts/seed-dev.ts` на сервере **не запускать**. Боевая база остаётся пустой. Демо-данные — только на компьютере разработчика.

Часы в cron — по Москве, если у VPS часовой пояс Europe/Moscow.

## 1. Проверки до выкладки

```
node -v
```

Нужна версия 20 или новее.

```
psql "postgres://koshuna_app@127.0.0.1:5432/koshuna" -c "select 1"
```

В `/etc/koshuna/backend.env` уже должны быть `DATABASE_URL` и `MEDIA_DIR`. Добавить:

```
SESSION_SECRET=$(openssl rand -hex 32)
JOBS_SECRET=$(openssl rand -hex 32)
AUTH_DEMO_ENABLED=true
VIDEO_MAX_SECONDS=120
NEXT_PUBLIC_VIDEO_MAX_SECONDS=120
LISTING_AUTO_EXPIRE=false
```

Значения `SESSION_SECRET` и `JOBS_SECRET` записать в файл, а не оставлять команду как текст. Файл только для root, пока не используется отдельный пользователь Node:

```
chmod 600 /etc/koshuna/backend.env
```

Реальная проверка длины ролика:

```
apt-get install -y ffmpeg
```

## 2. Сначала резервная копия

Запустить существующий ежедневный бэкап один раз вручную. Проверить, что в нём есть база `koshuna` и каталог `/var/koshuna/media`.

## 3. Выкладка

```
cd /var/www/koshuna
git fetch && git checkout <merge commit>
npm ci
set -a; . /etc/koshuna/backend.env; set +a
npm run db:migrate
npm run build
pm2 delete koshuna
pm2 start ecosystem.config.cjs
pm2 save
```

`NEXT_PUBLIC_*` вшиваются при сборке, поэтому `npm run build` запускать с уже загруженным env. Существующий `.env.local` на сервере (например `NEXT_PUBLIC_GOOGLE_*`) не удалять.

## 4. Пустая база

```
psql "postgres://koshuna_app@127.0.0.1:5432/koshuna" -c "select count(*) from listings; select count(*) from shops; select count(*) from users;"
```

Все три счётчика должны быть 0. **Никогда не запускать `npm run db:seed:dev` на сервере.**

## 5. nginx

Внутри блока сервера koshuna.ru, затем проверка и перезагрузка:

```
client_max_body_size 200m;
location /media/ { alias /var/koshuna/media/; expires 30d; add_header X-Content-Type-Options nosniff; }
location /api/internal/ { return 404; }
```

```
nginx -t && systemctl reload nginx
```

## 6. Права на медиа

```
install -d -m 0755 /var/koshuna/media/tmp
```

Файлы пишутся с правами 0644. Группа www-data должна их читать.

## 7. Cron

`crontab -e` у пользователя, под которым работает PM2:

```
7 * * * *    /var/www/koshuna/scripts/run-job.sh listing-reminders
*/15 * * * * /var/www/koshuna/scripts/run-job.sh account-deletions
0 4 * * *    /var/www/koshuna/scripts/run-job.sh cleanup
```

Задания `circles` и `price-stats` в Шаге 4 не ставить. Владелец 2026-10-08 09:41 перенёс их в Шаги 23 и 24. Таблицы в базе есть, логики заданий нет: вызов этих имён вернёт 404.

## 8. Х-08

Новый текст `/privacy` (Шаг 2, «данные хранятся на сервере Timeweb») публикуется в этой же выкладке, если его ещё нет на сайте. Текст политики в этом шаге не меняется.

## 9. Проверка на боевом сервере

- Войти (учебный вход) с телефона 1, опубликовать объявление с фото; открыть его с телефона 2.
- `pm2 restart koshuna` и проверить ещё раз.
- Ролик длиннее 2:00 должен быть отвергнут.
- Первое настоящее видеообъявление публикует владелец (Р-019).
- Тестовое объявление потом удалить, или оставить, если владелец так скажет.

## 10. Откат

```
git checkout <previous commit> && npm ci && npm run build && pm2 restart koshuna
```

Таблицы базы можно оставить: старая сборка их не использует. Старая сборка по-прежнему работает со своими данными в телефоне.

## 11. Необязательно: отдельный пользователь Node

Этого нет в тексте ФИНАЛ Шага 4. Делать только если владелец скажет.

```
useradd -r -s /usr/sbin/nologin koshuna
chown -R koshuna:www-data /var/koshuna/media && chmod -R g+rX /var/koshuna/media
chgrp koshuna /etc/koshuna/backend.env && chmod 640 /etc/koshuna/backend.env
chown -R koshuna /var/www/koshuna
pm2 startup systemd -u koshuna --hp /home/koshuna   # or a systemd unit
```

Cron перенести на этого пользователя.
