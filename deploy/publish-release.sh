#!/usr/bin/env bash
# Publicerar en hel release till produktionen med omstart av TKL-tjänsten.
# Simulatorn rörs inte. Körs från utvecklingsdatorn.
#
#   deploy/publish-release.sh            # publicerar HEAD
#   deploy/publish-release.sh <commit>   # publicerar angiven commit
#
# Ordning: förkontroll (tjänster, sparade tågvägslås), ny releasekatalog med
# beroenden och prov på servern, backup av driftdata, byte av current, omstart,
# efterkontroll. Vid fel efter bytet återställs current och tjänsten startas om.
set -euo pipefail
# The production host and key are kept out of the repository: deploy/production.env
# (not committed) sets CHARLOTTENDAL_HOST and CHARLOTTENDAL_SSH_KEY.
ENV_FILE="$(dirname "$0")/production.env"
[ -f "$ENV_FILE" ] && . "$ENV_FILE"
HOST="${CHARLOTTENDAL_HOST:?Ange CHARLOTTENDAL_HOST i deploy/production.env}"
KEY="${CHARLOTTENDAL_SSH_KEY:-$HOME/.ssh/id_ed25519}"
BASE=/opt/charlottendal
BACKUPS=/root/charlottendal-backups
STATE=/var/lib/charlottendal-tkl
SSH=(ssh -i "$KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 "$HOST")
remote() { "${SSH[@]}" "export PATH=/usr/local/bin:\$PATH; set -euo pipefail; $1"; }
say() { printf '\n== %s\n' "$*"; }

cd "$(git rev-parse --show-toplevel)"
FULL=$(git rev-parse "${1:-HEAD}^{commit}"); SHA=$(git rev-parse --short "$FULL")
[ -z "$(git status --porcelain --untracked-files=no)" ] || { echo "Arbetsträdet har ocommittade ändringar."; exit 1; }
git fetch -q origin
if ! git merge-base --is-ancestor "$FULL" origin/main; then
  [ "$(git rev-parse HEAD)" = "$FULL" ] && [ "$(git branch --show-current)" = main ] || { echo "$SHA finns inte på origin/main och är inte HEAD på main."; exit 1; }
  say "Pushar $SHA till origin/main"; git push origin main
fi
VERSION=$(node -p "require('./package.json').version")

say "Förkontroll"
OLD=$(remote "basename \"\$(readlink -f $BASE/current)\"")
echo "Körande release: $OLD · ny release: $SHA · version $VERSION"
[ "$OLD" != "$SHA" ] || { echo "$SHA är redan aktiv."; exit 1; }
remote "systemctl is-active charlottendal-tkl charlottendal-simulator" >/dev/null || { echo "Tjänsterna är inte aktiva."; exit 1; }
PID_BEFORE=$(remote "systemctl show -p MainPID --value charlottendal-tkl")
SIM_BEFORE=$(remote "systemctl show -p MainPID --value charlottendal-simulator")
echo "TKL pid $PID_BEFORE · simulator pid $SIM_BEFORE"
ROUTES=$(remote "node -e 'try{const d=JSON.parse(require(\"fs\").readFileSync(\"$STATE/routes.json\",\"utf8\"));console.log((d.routes||[]).length)}catch(e){console.log(0)}'")
echo "Sparade tågvägslås i produktionen: $ROUTES"
if [ "$ROUTES" != "0" ]; then
  # The ssh calls above read standard input too, so a piped answer never reaches `read`;
  # CHARLOTTENDAL_CONFIRM_LOCKS=j answers the question in advance.
  if [ "${CHARLOTTENDAL_CONFIRM_LOCKS:-}" = j ]; then svar=j; echo "Det finns $ROUTES sparade tågvägslås. Fortsätter (CHARLOTTENDAL_CONFIRM_LOCKS=j)."
  else read -r -p "Det finns $ROUTES sparade tågvägslås. Låsen behålls över omstarten men körmedgivanden återupptas inte. Fortsätt? [j/N] " svar; fi
  [ "$svar" = "j" ] || [ "$svar" = "J" ] || { echo "Avbrutet."; exit 1; }
fi
remote "test ! -e $BASE/releases/$SHA" || { echo "$BASE/releases/$SHA finns redan."; exit 1; }

say "Ny releasekatalog $SHA med beroenden"
git archive --format=tar "$FULL" | remote "mkdir -p $BASE/releases/$SHA && tar -x -C $BASE/releases/$SHA"
remote "cd $BASE/releases/$SHA && npm ci --omit=dev --ignore-scripts --no-audit --no-fund >/dev/null && node scripts/check.mjs"

say "Prov på servern"
remote "cd $BASE/releases/$SHA && node --test test/engine.test.mjs test/route-selection.test.mjs test/trainmeet.test.mjs test/trainmeet-clearance.test.mjs test/stream-deck-profile.test.mjs test/stream-deck.test.mjs test/admin-navigation.test.mjs > /tmp/cda-unit.log 2>&1 || { tail -30 /tmp/cda-unit.log; exit 1; }; grep -E '^# (tests|pass|fail)' /tmp/cda-unit.log"
remote "cd $BASE/releases/$SHA && node --test test/integration.mjs test/trainmeet-integration.mjs > /tmp/cda-integration.log 2>&1 || { tail -30 /tmp/cda-integration.log; exit 1; }; grep -E '^# (tests|pass|fail)' /tmp/cda-integration.log"
remote "chown -R --reference=$BASE/releases/$OLD $BASE/releases/$SHA"

say "Backup"
TS=$(date -u +%Y%m%dT%H%M%SZ); BK="$BACKUPS/network-$SHA-$TS"
remote "mkdir -p $BK && readlink $BASE/current > $BK/current.txt && tar -czf $BK/state.tgz -C / var/lib/charlottendal-tkl var/lib/charlottendal-auth etc/charlottendal-tkl 2>/dev/null && (cd $STATE && md5sum *.json > $BK/state.md5)"
echo "Backup: $BK"

rollback() {
  echo "FEL · återställer current till $OLD och startar om TKL"
  remote "ln -sfn $BASE/releases/$OLD $BASE/current.restore && mv -Tf $BASE/current.restore $BASE/current && systemctl restart charlottendal-tkl" || true
}
trap rollback ERR

say "Aktiverar $SHA och startar om TKL"
remote "ln -sfn $BASE/releases/$SHA $BASE/current.new && mv -Tf $BASE/current.new $BASE/current && readlink -f $BASE/current && systemctl restart charlottendal-tkl && sleep 4 && systemctl is-active charlottendal-tkl"

say "Efterkontroll"
remote "systemctl is-active charlottendal-tkl charlottendal-simulator >/dev/null"
PID_AFTER=$(remote "systemctl show -p MainPID --value charlottendal-tkl")
SIM_AFTER=$(remote "systemctl show -p MainPID --value charlottendal-simulator")
[ "$SIM_BEFORE" = "$SIM_AFTER" ] || { echo "Simulatorns process-ID ändrades: $SIM_BEFORE→$SIM_AFTER"; exit 1; }
[ "$PID_BEFORE" != "$PID_AFTER" ] || { echo "TKL startades inte om."; exit 1; }
echo "TKL ny pid $PID_AFTER · simulator pid $SIM_AFTER oförändrad"
CODE=$(remote "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8910/index.html")
echo "TKL svarar lokalt på servern med HTTP $CODE (inloggning kan krävas)"
remote "grep -o 'version [0-9.]*' $BASE/current/public/index.html"
remote "journalctl -u charlottendal-tkl --since '2 minutes ago' -p err --no-pager -q | head -5"
remote "cd $STATE && md5sum -c --quiet $BK/state.md5 && echo 'Driftdata oförändrade.' || echo 'Driftdata ändrade sedan backupen (se ovan); kontrollera att det är väntat.'"
trap - ERR
say "Klart · $SHA (version $VERSION) publicerad $(date '+%Y-%m-%d %H:%M %Z') · backup $BK · föregående release $OLD"
# The same release becomes installable from the public repository (Raspberry Pi, Mac, PC).
if [ -z "${CHARLOTTENDAL_SKIP_INSTALL_REPO:-}" ]; then
  say "Publicerar $SHA i cda-tkl-install"
  deploy/publish-install.sh "$FULL" || echo "Varning: cda-tkl-install uppdaterades inte; kör deploy/publish-install.sh $SHA för hand."
fi

