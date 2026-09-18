#!/usr/bin/env bash
# Provisions the Steam Genre Market site on a Linux server running Caddy, alongside whatever else Caddy already serves.
# Usage (from your machine, as root):
#   ssh root@SERVER "DOMAIN=example.com bash -s" < deploy/setup.sh
# Idempotent: safe to re-run. Touches nothing but this site's own files, its Caddy snippet and its own log.
set -euo pipefail

: "${DOMAIN:?Set DOMAIN (e.g. DOMAIN=example.com)}"
APP_USER="steammarket"
APP_ROOT="/srv/steam-market"
CADDY_SITE="/etc/caddy/sites/steam-market.caddy"
# Own log file, so these visits stay out of any log analyzer pointed at the shared access.log
LOG_FILE="/var/log/caddy/steam-market.log"

echo "==> Node.js (Ubuntu packages)"
export DEBIAN_FRONTEND=noninteractive
command -v node >/dev/null || { apt-get update -q && apt-get install -y -q nodejs; }
node --version

echo "==> System user ($APP_USER) and app root ($APP_ROOT)"
id "$APP_USER" >/dev/null 2>&1 || useradd --system --home-dir "$APP_ROOT" --shell /usr/sbin/nologin "$APP_USER"
install -d -m 755 -o "$APP_USER" -g "$APP_USER" "$APP_ROOT" "$APP_ROOT/site" "$APP_ROOT/site/data" "$APP_ROOT/data" "$APP_ROOT/data/raw"

echo "==> Caddy site ($CADDY_SITE)"
install -d -m 755 /etc/caddy/sites
cat > "$CADDY_SITE" <<CADDY
# Steam Genre Market — static site, data refreshed daily by steam-market-update.timer
www.$DOMAIN {
	redir https://$DOMAIN{uri} permanent
}

$DOMAIN {
	root * $APP_ROOT/site
	encode zstd gzip
	file_server

	# No build step or hashed filenames: revalidate everything (ETag keeps it cheap)
	header Cache-Control "no-cache"

	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "strict-origin-when-cross-origin"
		Content-Security-Policy "default-src 'self'; img-src 'self' data: https://shared.akamai.steamstatic.com; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
		-Server
	}

	log {
		output file $LOG_FILE {
			roll_size 10MiB
			roll_keep 5
		}
	}
}
CADDY

# If another script regenerates /etc/caddy/Caddyfile from scratch, make sure it keeps this import line too
grep -qxF 'import sites/*.caddy' /etc/caddy/Caddyfile || printf '\nimport sites/*.caddy\n' >> /etc/caddy/Caddyfile

echo "==> Daily data refresh (systemd)"
cat > /etc/systemd/system/steam-market-update.service <<UNIT
[Unit]
Description=Steam Genre Market: refetch Gamalytic + Steam data and rebuild the dataset
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_ROOT
ExecStart=/usr/bin/node scripts/fetch-gamalytic.mjs
ExecStart=/usr/bin/node scripts/fetch-steam.mjs
ExecStart=/usr/bin/node scripts/build-data.mjs
# Contrôle du résultat : une dérive (libellés en double, prix hors bornes, tag introuvable par la
# recherche) fait échouer l'unité et se voit dans `systemctl status` au lieu de passer inaperçue.
ExecStart=/usr/bin/node scripts/check.mjs
Nice=10
# Type=oneshot has no start timeout by default: cap it so a hung fetch cannot
# sit there until the next day's run.
TimeoutStartSec=45min
NoNewPrivileges=yes
PrivateTmp=yes
ProtectHome=yes
ProtectSystem=strict
ReadWritePaths=$APP_ROOT/data $APP_ROOT/site/data
UNIT

cat > /etc/systemd/system/steam-market-update.timer <<UNIT
[Unit]
Description=Daily Steam Genre Market data refresh

[Timer]
OnCalendar=*-*-* 03:30:00
RandomizedDelaySec=30min
Persistent=true

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now steam-market-update.timer

# Create the log as caddy first: `caddy validate` runs as root and would otherwise create it root-owned,
# which makes the reload fail with "permission denied"
touch "$LOG_FILE"
chown caddy:caddy "$LOG_FILE"
chmod 600 "$LOG_FILE"

caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl reload caddy

echo
echo "OK. Site root: $APP_ROOT/site — log: $LOG_FILE"
echo "Next refresh: $(systemctl list-timers steam-market-update.timer --no-pager | sed -n 2p)"
