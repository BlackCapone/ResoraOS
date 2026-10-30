#!/bin/bash
# Собирает пакет resora-shell (интерфейс, мост, скрипт сессии). Версия растёт с датой — apt видит новую сборку как обновление.
set -euo pipefail
HERE=$(cd "$(dirname "$0")/.." && pwd)
VERSION=${VERSION:-1.0.$(date -u +%Y%m%d%H%M)}
OUT=${OUT:-$HERE/dist}
mkdir -p "$OUT"
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
P="$T/resora-shell_${VERSION}_all"
mkdir -p "$P/DEBIAN" "$P/usr/share/resora"
cp -a "$HERE/payload/usr/." "$P/usr/"
cp -a "$HERE/ui/." "$P/usr/share/resora/"
find "$P" -name __pycache__ -type d -prune -exec rm -rf {} +
rm -f "$P"/usr/share/resora/*.bat "$P"/usr/share/resora/*.ps1 "$P"/usr/share/resora/Preview-*.png "$P"/usr/share/resora/README.txt
echo "$VERSION" > "$P/usr/share/resora/VERSION"
cat > "$P/DEBIAN/control" <<EOC
Package: resora-shell
Version: $VERSION
Architecture: all
Section: x11
Priority: optional
Maintainer: Resora <noreply@resora.invalid>
Depends: python3, python3-gi, gir1.2-gtk-4.0, gir1.2-webkit-6.0, cage
Description: Resora desktop shell
 Интерфейс Resora, мост к системе и скрипт запуска сессии.
EOC
find "$P" -type d -exec chmod 755 {} +
find "$P/usr" -type f -exec chmod 644 {} +
chmod 755 "$P/usr/lib/resora/shell.py" "$P/usr/bin/resora-session"
dpkg-deb --root-owner-group --build "$P" "$OUT/resora-shell_${VERSION}_all.deb" >/dev/null
echo "$OUT/resora-shell_${VERSION}_all.deb"
