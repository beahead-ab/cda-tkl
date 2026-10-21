#!/usr/bin/env bash
# Publishes the installable program to the public repository beahead-ab/cda-tkl-install:
# one commit per release with only what is needed to install and run TKL (the program,
# the installers and the installation guides), without history, documents, tests or
# deployment files. Tagged v<version> the first time a version is published.
#
#   deploy/publish-install.sh            # publishes HEAD
#   deploy/publish-install.sh <commit>   # publishes the given commit
set -euo pipefail
PUBLIC="${CDA_TKL_INSTALL_REMOTE:-https://github.com/beahead-ab/cda-tkl-install.git}"
cd "$(git rev-parse --show-toplevel)"
SOURCE=$(pwd)
FULL=$(git rev-parse "${1:-HEAD}^{commit}")
[ -z "$(git status --porcelain --untracked-files=no)" ] || { echo "Arbetsträdet har ocommittade ändringar."; exit 1; }
VERSION=$(git show "$FULL:package.json" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).version))")
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
git clone -q "$PUBLIC" "$WORK/repo" 2>/dev/null || { mkdir -p "$WORK/repo" && git -C "$WORK/repo" init -q -b main && git -C "$WORK/repo" remote add origin "$PUBLIC"; }
cd "$WORK/repo"
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
(cd "$SOURCE" && git archive "$FULL" install.sh install.ps1 package.json package-lock.json src public profiles packaging \
  scripts/start.mjs scripts/install-raspberry-pi.sh scripts/install-mac.sh scripts/locobuffer-gateway.mjs scripts/serial-port.py scripts/bluetooth-port.py \
  scripts/create-owner.mjs scripts/recover-user.mjs \
  docs/installation.md docs/raspberry-pi.md docs/anvandare.md docs/loconet-anslutning.md) | tar -x -C .
# The installation overview is the front page; its links to the guides that move with it follow along.
sed -e 's|](raspberry-pi.md)|](docs/raspberry-pi.md)|g' -e 's|](loconet-anslutning.md)|](docs/loconet-anslutning.md)|g' \
  docs/installation.md > README.md && rm docs/installation.md
git add -A
if git diff --cached --quiet; then echo "cda-tkl-install har redan innehållet i $VERSION."; exit 0; fi
git commit -q -m "Charlottendal TKL $VERSION"
git rev-parse -q --verify "refs/tags/v$VERSION" >/dev/null || git ls-remote --exit-code --tags origin "v$VERSION" >/dev/null 2>&1 || git tag "v$VERSION"
git push -q origin HEAD:main --tags
echo "Publicerat i $PUBLIC: Charlottendal TKL $VERSION ($(git rev-parse --short HEAD))"
