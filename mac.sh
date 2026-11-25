#!/bin/sh
# Mac'te hicbir sey kurmadan terminalde buketi acar.
# Kullanim (Terminal uygulamasina yapistir):
#   curl -fsSL https://raw.githubusercontent.com/egejpg/ascii-flowers/main/mac.sh | sh
# Node.js'i kurmaz; gecici klasore indirip oradan calistirir.
set -e

V=v22.12.0
case "$(uname -m)" in
  arm64) A=arm64 ;;
  *) A=x64 ;;
esac

D="${TMPDIR:-/tmp}/ascii-flowers"
mkdir -p "$D"
cd "$D"

if [ ! -x "node-$V-darwin-$A/bin/node" ]; then
  echo "hazirlaniyor (ilk seferde ~1 dakika)..."
  curl -fsSL "https://nodejs.org/dist/$V/node-$V-darwin-$A.tar.gz" | tar xz
fi

rm -rf ascii-flowers-main
curl -fsSL https://github.com/egejpg/ascii-flowers/archive/refs/heads/main.tar.gz | tar xz

printf '\033[8;50;160t' 2>/dev/null || true # pencereyi buyutmeyi dene
exec "./node-$V-darwin-$A/bin/node" ascii-flowers-main/buket.js "$@" < /dev/tty
