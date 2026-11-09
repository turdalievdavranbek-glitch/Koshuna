# Шаг 6 — выкладка (геолокация и карта)

Родитель запускает это на сервере. Строитель не деплоит.

1. Бэкап: текущий коммит и `.next` в `/var/backups/koshuna/pre-step6`. База не меняется; всё равно сделать обычный `pg_dump`.
2. В `/etc/koshuna/backend.env` (права 600), если строк ещё нет:
   - `NEXT_PUBLIC_MAP_TILES=2gis`
   - `NEXT_PUBLIC_NEAR_RADIUS_KM=5`
   - запасной вариант: `NEXT_PUBLIC_MAP_TILES=osm` (пересборка, без правки кода)
3. `git checkout <merge> && npm ci && set -a; . /etc/koshuna/backend.env; set +a && npm run build && pm2 reload ecosystem.config.cjs`
4. Проверки: `curl` 200 на `/`, `/location`, `/map`, `/post`; `curl -sI /sw.js` содержит `no-cache`; пустая лента остаётся пустой; в собранных чанках нет `2gis.kg" target`.
5. Откат: предыдущий коммит, пересборка, `pm2 reload`.
6. APK сейчас не собирать. Правка `MainActivity.java` вступит в силу со следующей сборкой APK.
