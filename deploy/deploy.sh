#!/usr/bin/env bash
# Ships the app (code + site + current data) to the server. Run from the project root, in Git Bash:
#   SERVER=root@my-server deploy/deploy.sh            # code and site only
#   SERVER=root@my-server deploy/deploy.sh --with-raw # also upload the local data/raw cache (first deploy)
# Uses tar over ssh (rsync isn't bundled with Git for Windows). Data refreshed on the server is never overwritten
# unless --with-raw is passed; site/data/dataset.json is only uploaded if the server has none yet.
set -euo pipefail

: "${SERVER:?Set SERVER (e.g. SERVER=root@my-server)}"
APP_ROOT="/srv/steam-market"
cd "$(dirname "$0")/.."

paths=(package.json README.md scripts site/index.html site/style.css site/js site/fonts data/dev-ease.json data/tag-classes.json)
[[ "${1:-}" == "--with-raw" ]] && paths+=(data/raw)

echo "==> Uploading ${paths[*]}"
tar -czf - "${paths[@]}" | ssh "$SERVER" "tar -xzf - -C $APP_ROOT --no-same-owner"

echo "==> Initial dataset (only if missing)"
if ssh "$SERVER" "test -s $APP_ROOT/site/data/dataset.json"; then
  echo "    server already has a dataset, kept"
else
  tar -czf - site/data/dataset.json | ssh "$SERVER" "tar -xzf - -C $APP_ROOT --no-same-owner"
fi

ssh "$SERVER" "chown -R steammarket:steammarket $APP_ROOT && find $APP_ROOT -type d -exec chmod 755 {} + && find $APP_ROOT -type f -exec chmod 644 {} +"
echo "OK"
