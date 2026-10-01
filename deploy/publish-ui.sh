#!/usr/bin/env bash
# Publicerar en ren gränssnittsändring (endast public/) till produktionen utan omstart,
# enligt mönstret från 0.39.3: ny releasekatalog med tester, backup, atomär filinstallation
# i den körande releasen och flytt av current. Körs från utvecklingsdatorn.
#
#   deploy/publish-ui.sh            # publicerar HEAD
#   deploy/publish-ui.sh <commit>   # publicerar angiven commit
#
# Ändringar i src/, profiles/, scripts/ eller beroenden avvisas; de kräver den vanliga
# publiceringen med omstart. Vid fel efter att filer börjat bytas återställs de från backupen.
set -euo pipefail
HOST="${CHARLOTTENDAL_HOST:-root@161.35.25.62}"
KEY="${CHARLOTTENDAL_SSH_KEY:-$HOME/.ssh/trainmeet_digitalocean}"
BASE=/opt/charlottendal
BACKUPS=/root/charlottendal-backups
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

say "Förkontroll"
OLD=$(remote "basename \"\$(readlink -f $BASE/current)\"")
echo "Körande release: $OLD · ny release: $SHA"
git cat-file -e "$OLD^{commit}" || { echo "Den körande releasen $OLD finns inte i lokalt git."; exit 1; }
[ "$OLD" != "$SHA" ] || { echo "$SHA är redan aktiv."; exit 1; }
CHANGED=$(git diff --name-only --diff-filter=AM "$OLD" "$FULL" -- public/)
DELETED=$(git diff --name-only --diff-filter=D "$OLD" "$FULL" -- public/ || true)
[ -n "$CHANGED" ] || { echo "Inga ändrade filer under public/."; exit 1; }
[ -z "$DELETED" ] || { echo "Borttagna filer stöds inte av UI-publiceringen:"; echo "$DELETED"; exit 1; }
OUTSIDE=$(git diff --name-only "$OLD" "$FULL" -- src profiles scripts test/*integration* deploy ':!deploy/publish-ui.sh' || true)
[ -z "$OUTSIDE" ] || { echo "Ändringar utanför gränssnittet kräver publicering med omstart:"; echo "$OUTSIDE"; exit 1; }
DEPS=$(git diff "$OLD" "$FULL" -- package.json package-lock.json | grep -E '^[-+][^-+]' | grep -v '"version"' || true)
[ -z "$DEPS" ] || { echo "package.json/package-lock.json ändrar mer än versionsnumret:"; echo "$DEPS"; exit 1; }
echo "Filer som byts:"; echo "$CHANGED" | sed 's/^/  /'

EXPECTED=""
for f in $CHANGED; do
  if git cat-file -e "$OLD:$f" 2>/dev/null; then EXPECTED+="$(git show "$OLD:$f" | md5 -q)  $BASE/releases/$OLD/$f"$'\n'; fi
done
printf '%s' "$EXPECTED" | remote "md5sum -c --quiet -" || { echo "Körande filer avviker från $OLD. Avbryter."; exit 1; }
echo "Körande gränssnittsfiler är identiska med $OLD."
remote "systemctl is-active charlottendal-tkl charlottendal-simulator" >/dev/null || { echo "Tjänsterna är inte aktiva."; exit 1; }
PID_BEFORE=$(remote "systemctl show -p MainPID --value charlottendal-tkl")
SIM_BEFORE=$(remote "systemctl show -p MainPID --value charlottendal-simulator")
echo "TKL pid $PID_BEFORE · simulator pid $SIM_BEFORE"
remote "test ! -e $BASE/releases/$SHA" || { echo "$BASE/releases/$SHA finns redan."; exit 1; }

say "Ny releasekatalog $SHA med beroenden och tester"
git archive --format=tar "$FULL" | remote "mkdir -p $BASE/releases/$SHA && tar -x -C $BASE/releases/$SHA"
remote "cd $BASE/releases/$SHA && npm ci --omit=dev --ignore-scripts --no-audit --no-fund >/dev/null && node scripts/check.mjs && node --test test/admin-navigation.test.mjs test/panel-rendering.test.mjs test/panel-zoom.test.mjs test/route-presentation.test.mjs test/configuration.test.mjs 2>&1 | grep -E '^# (tests|pass|fail)'"
remote "chown -R --reference=$BASE/releases/$OLD $BASE/releases/$SHA"

say "Backup"
TS=$(date -u +%Y%m%dT%H%M%SZ); BK="$BACKUPS/ui-$SHA-$TS"
remote "mkdir -p $BK && readlink $BASE/current > $BK/current.txt && tar -czf $BK/state.tgz -C / var/lib/charlottendal-tkl && cd $BASE/releases/$OLD && for f in $(echo $CHANGED); do if [ -e \"\$f\" ]; then install -D -p \"\$f\" \"$BK/\$f\"; fi; done"
echo "Backup: $BK"

rollback() {
  echo "FEL · återställer gränssnittsfilerna från $BK"
  remote "cd $BASE/releases/$OLD && for f in $(echo $CHANGED); do if [ -e \"$BK/\$f\" ]; then cp -p \"$BK/\$f\" \"\$f.restore\" && mv -f \"\$f.restore\" \"\$f\"; else rm -f \"\$f\"; fi; done; ln -sfn \"\$(cat $BK/current.txt)\" $BASE/current.restore && mv -Tf $BASE/current.restore $BASE/current" || true
}
trap rollback ERR

say "Installerar filer atomärt i den körande releasen $OLD"
remote "cd $BASE/releases/$OLD && for f in $(echo $CHANGED); do mkdir -p \"\$(dirname \"\$f\")\" && cp -p \"$BASE/releases/$SHA/\$f\" \"\$f.new\" && mv -f \"\$f.new\" \"\$f\"; done"

say "Flyttar current till $SHA"
remote "ln -sfn $BASE/releases/$SHA $BASE/current.new && mv -Tf $BASE/current.new $BASE/current && readlink -f $BASE/current"

say "Efterkontroll"
INSTALLED=""
for f in $CHANGED; do INSTALLED+="$(git show "$FULL:$f" | md5 -q)  $BASE/releases/$OLD/$f"$'\n'; done
printf '%s' "$INSTALLED" | remote "md5sum -c --quiet -"
echo "Alla bytta filer är identiska med $SHA."
PID_AFTER=$(remote "systemctl show -p MainPID --value charlottendal-tkl")
SIM_AFTER=$(remote "systemctl show -p MainPID --value charlottendal-simulator")
[ "$PID_BEFORE" = "$PID_AFTER" ] && [ "$SIM_BEFORE" = "$SIM_AFTER" ] || { echo "Process-ID ändrades: TKL $PID_BEFORE→$PID_AFTER, simulator $SIM_BEFORE→$SIM_AFTER"; exit 1; }
echo "Ingen omstart: TKL pid $PID_AFTER, simulator pid $SIM_AFTER"
CODE=$(remote "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8910/index.html")
echo "TKL svarar lokalt på servern med HTTP $CODE (inloggning kan krävas)"
remote "systemctl is-active charlottendal-tkl charlottendal-simulator; journalctl -u charlottendal-tkl --since '2 minutes ago' -p err --no-pager -q | head -5"
trap - ERR
say "Klart · $SHA publicerad $(date '+%Y-%m-%d %H:%M %Z') · backup $BK · föregående release $OLD"
