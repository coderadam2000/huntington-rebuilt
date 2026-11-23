#!/bin/bash
# Copies the shared lobby (Minigames/_shared) into every minigame's src (and Zoom, which uses it for online races) and builds them all.
cd "$(dirname "$0")/.."
for d in Minigames/*/ Zoom/; do
  g="${d%/}"; [ "$(basename "$g")" = "_shared" ] && continue; [ -d "$g/src" ] || continue
  # games that do not use the lobby (no <!--@js-->, e.g. Capitalist Realm) are only rebuilt
  if grep -q '<!--@js' "$g/src/shell.html"; then
    mkdir -p "$g/src/js" "$g/src/css"
    cp Minigames/_shared/mg.js "$g/src/js/00-mg.js"; cp Minigames/_shared/mg.css "$g/src/css/00-mg.css"
  fi
  node tools/build-game.js "$g" --check | tail -1
done
