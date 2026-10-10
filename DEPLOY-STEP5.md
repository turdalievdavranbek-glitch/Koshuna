# Шаг 5 deploy

No migrations. Optional env (default is already 120): `NEXT_PUBLIC_VOICE_MAX_SECONDS=120` in `/etc/koshuna/backend.env`.

```
git checkout <merge>
npm ci
set -a; . /etc/koshuna/backend.env; set +a
npm run build
pm2 restart koshuna
```

Check `curl -sI https://koshuna.ru/sw.js` includes `cache-control: no-cache`. If nginx caches root `.js`, add:

```
location = /sw.js { proxy_pass http://127.0.0.1:43123; add_header Cache-Control "no-cache"; }
```

Check `https://koshuna.ru/shops/new` returns 200.

Rollback: previous commit, `npm run build`, `pm2 restart koshuna`. To drop the service worker, deploy a `sw.js` that calls `self.registration.unregister()`.

Native offline page (`server.errorPath`) needs an APK rebuild in Шаг 26. The web offline page works after one online visit.

Owner check on a phone: record until 2:00 (it stops itself), publish on mobile data, airplane mode mid-upload, kill the app, reopen online — the upload continues.
