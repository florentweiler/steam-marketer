# Deployment

Target: any Linux server running Caddy. The site is fully static; this setup only adds its own files,
its own Caddy snippet and its own log, so it can live next to other sites already served by Caddy.

| | Steam Genre Market |
|---|---|
| Files | `/srv/steam-market` (system user `steammarket`) |
| Caddy config | `/etc/caddy/sites/steam-market.caddy`, pulled in by `import sites/*.caddy` |
| Access log | `/var/log/caddy/steam-market.log` — separate from Caddy's shared `access.log` |

## First install

1. DNS at the registrar: `A @ <server IPv4>`, `AAAA @ <server IPv6>`, `CNAME www <domain>.`
2. Provision: `ssh root@my-server "DOMAIN=<domain> bash -s" < deploy/setup.sh`
3. Upload app, data cache and dataset: `SERVER=root@my-server deploy/deploy.sh --with-raw`

## Updates

- Code or site changes: `SERVER=root@my-server deploy/deploy.sh`
- Data: refreshed automatically every day ~03:30 UTC (+ up to 30 min of jitter) by `steam-market-update.timer`.
  The unit ends with `scripts/check.mjs`; if it fails the unit is marked failed and `journalctl -u steam-market-update` says why.
  Run now: `systemctl start steam-market-update` — logs: `journalctl -u steam-market-update`

## Caveat

`setup.sh` appends `import sites/*.caddy` to `/etc/caddy/Caddyfile`. If something else rewrites that
Caddyfile from scratch, re-run `setup.sh` afterwards (or keep the import line in that other script).
