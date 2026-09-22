#!/bin/zsh
cd -- "${0:A:h}"
charlottendal_node="$(command -v node 2>/dev/null)"
if [[ -z "$charlottendal_node" ]]; then
  for candidate in "$HOME"/.nvm/versions/node/v*/bin/node(N); do
    if "$candidate" -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)' 2>/dev/null; then charlottendal_node="$candidate"; fi
  done
fi
if [[ -z "$charlottendal_node" ]] || ! "$charlottendal_node" -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)'; then
  print 'Node.js 22 eller senare behövs. Installera från nodejs.org och starta igen.'
  read -r '?Tryck Retur för att stänga.'
  exit 1
fi
if [[ ! -d node_modules/jose ]]; then
  print 'Installerar appens beroenden första gången…'
  PATH="${charlottendal_node:h}:$PATH" "${charlottendal_node:h}/npm" ci --ignore-scripts || exit 1
fi
print 'Charlottendal startar. Öppna http://127.0.0.1:8910 och http://127.0.0.1:8911'
print 'Låt detta fönster vara öppet. Avsluta med Ctrl+C.'
"$charlottendal_node" scripts/start.mjs
read -r '?Charlottendal är avslutad. Tryck Retur för att stänga.'
