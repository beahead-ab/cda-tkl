#!/usr/bin/env bash
# Publishes a station's own repository from cda-tkl, for example Träkvista in beahead-ab/Tk-TKL: the program, the
# station's folder, its documents (installation.docs in stations/<id>/station.json), the installers, the tests that
# do not need Charlottendal's files, and a GitHub workflow that runs them on every pull request. Charlottendal's
# data, the work journal, the deployment files and the history stay in cda-tkl. One commit per publication.
#
#   deploy/publish-station.sh trakvista                  # publishes HEAD
#   deploy/publish-station.sh trakvista <commit>         # publishes the given commit
#   deploy/publish-station.sh trakvista HEAD --first     # the first time: replaces the repository's history
#
# Changes made in the station's repository after the last publication (Benny's corrections) must be in cda-tkl
# first; otherwise the script stops and lists them (docs/stationer.md). STATION_REMOTE picks another repository
# (tests), STATION_NO_TEST=1 skips the tests, STATION_NO_PUSH=1 commits without pushing and keeps the folder.
set -euo pipefail
ID="${1:?Ange stationen: deploy/publish-station.sh trakvista}"
FIRST=false; [ "${3:-}" = --first ] && FIRST=true
cd "$(git rev-parse --show-toplevel)"
SOURCE=$(pwd)
FULL=$(git rev-parse "${2:-HEAD}^{commit}")
[ -z "$(git status --porcelain --untracked-files=no)" ] || { echo "Arbetsträdet har ocommittade ändringar."; exit 1; }
STATION=$(git show "$FULL:stations/$ID/station.json")
field() { printf '%s' "$STATION" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const v=JSON.parse(s).installation?.[process.argv[1]];console.log(Array.isArray(v)?v.join(' '):v??'')})" "$1"; }
REPOSITORY=$(field repository); NAME=$(field name); DOCS=$(field docs)
[ -n "$REPOSITORY" ] && [ -n "$NAME" ] || { echo "stations/$ID/station.json saknar installation.repository och installation.name."; exit 1; }
REMOTE="${STATION_REMOTE:-https://github.com/$REPOSITORY.git}"
VERSION=$(git show "$FULL:package.json" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).version))")
MARK="Publicerad från cda-tkl"
# Charlottendal's own tools and the tests that read its data (deploy/charlottendal-only.txt) stay in cda-tkl.
CHARLOTTENDAL_ONLY=$(git show "$FULL:deploy/charlottendal-only.txt" | grep -v '^#' | grep .)

WORK=$(mktemp -d)
[ "${STATION_NO_PUSH:-}" = 1 ] || trap 'rm -rf "$WORK"' EXIT
git clone -q "$REMOTE" "$WORK/repo" 2>/dev/null || { mkdir -p "$WORK/repo" && git -C "$WORK/repo" init -q -b main && git -C "$WORK/repo" remote add origin "$REMOTE"; }
cd "$WORK/repo"
for key in user.name user.email; do value=$(git -C "$SOURCE" config "$key" || true); [ -z "$value" ] || git config "$key" "$value"; done
OLD=$(git rev-parse -q --verify HEAD || true)
LAST="" CHANGED=""
if [ -n "$OLD" ] && [ "$FIRST" = false ]; then
  LAST=$(git log --format=%H --grep="^$MARK" -1)
  [ -n "$LAST" ] || { echo "$REPOSITORY är inte publicerat med det här skriptet; första gången: deploy/publish-station.sh $ID HEAD --first"; exit 1; }
  CHANGED=$(git diff --name-only "$LAST" HEAD)
fi

find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
(cd "$SOURCE" && git archive "$FULL" install.sh install.ps1 package.json package-lock.json .gitignore var/.gitkeep \
  src public scripts packaging test deploy/render/start.mjs deploy/render/entrypoint.sh "stations/$ID" $DOCS) | tar -x -C .
rm -rf public/data $CHARLOTTENDAL_ONLY
node scripts/make-station-repository.mjs "$ID" >/dev/null
# The tests run on GitHub for every pull request in the station's repository.
mkdir -p .github/workflows && cp packaging/github/station-tests.yml .github/workflows/prov.yml

# The station's own changes since the last publication must be in what is published now.
MISSING=""
for f in $CHANGED; do
  if git cat-file -e "HEAD:$f" 2>/dev/null; then git diff --quiet HEAD -- "$f" || MISSING="$MISSING $f"
  elif [ -e "$f" ]; then MISSING="$MISSING $f"; fi
done
if [ -n "$MISSING" ]; then
  echo "$REPOSITORY har ändringar som inte finns i cda-tkl än:"
  git log --oneline "$LAST..HEAD"
  printf '  %s\n' $MISSING
  echo "Ta in dem i cda-tkl först (docs/stationer.md) och publicera igen."
  exit 1
fi

if [ "${STATION_NO_TEST:-}" != 1 ]; then
  echo "Provar $NAME TKL $VERSION …"
  npm ci --ignore-scripts --no-audit --no-fund --loglevel=error >/dev/null
  npm test >"$WORK/test.log" 2>&1 || { grep -E "^not ok|^# (pass|fail)" "$WORK/test.log"; echo "Proven gick inte igenom; inget är publicerat. Loggen: $WORK/test.log"; trap - EXIT; exit 1; }
  grep -E "^# (pass|fail)" "$WORK/test.log"
  npm run -s "verify:$ID" >>"$WORK/test.log" 2>&1 || { echo "Stationens genererade filer stämmer inte; inget är publicerat. Loggen: $WORK/test.log"; trap - EXIT; exit 1; }
  npm run -s test:station-traffic >>"$WORK/test.log" 2>&1 || { echo "Stationens trafikprov gick inte igenom; inget är publicerat. Loggen: $WORK/test.log"; trap - EXIT; exit 1; }
  rm -rf node_modules
fi

[ "$FIRST" = true ] && git checkout -q --orphan publish
git add -A
EMPTY=""
if [ "$FIRST" = false ] && git diff --cached --quiet; then
  # The station's own changes are in cda-tkl now: an empty publication marks where the two are in step.
  if [ -z "$OLD" ] || [ "$(git rev-parse HEAD)" = "$LAST" ]; then echo "$REPOSITORY har redan innehållet i $VERSION."; exit 0; fi
  EMPTY=--allow-empty
fi
printf '%s %s · %s TKL %s\n%s' "$MARK" "$(git -C "$SOURCE" rev-parse --short "$FULL")" "$NAME" "$VERSION" "${STATION_MESSAGE:+
$STATION_MESSAGE
}" | git commit -q $EMPTY -F -
if [ "$FIRST" = true ]; then git branch -q -M main; fi
if [ "${STATION_NO_PUSH:-}" = 1 ]; then echo "Inte pushat: $WORK/repo"; exit 0; fi
if [ "$FIRST" = true ] && [ -n "$OLD" ]; then git push -q --force-with-lease="main:$OLD" origin HEAD:main; else git push -q origin HEAD:main; fi
echo "Publicerat i ${STATION_REMOTE:-$REPOSITORY}: $NAME TKL $VERSION ($(git rev-parse --short HEAD))"
