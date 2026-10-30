#!/bin/bash
# Делает apt-репозиторий из deb-файлов в dist/ → каталог repo/ (его публикуют на GitHub Pages или любой веб-сервер).
# Подпись: GPG_KEY_ID=<id ключа в связке gpg>. Без подписи клиентам пришлось бы доверять репозиторию вслепую — не делайте так.
set -euo pipefail
HERE=$(cd "$(dirname "$0")/.." && pwd)
SRC=${SRC:-$HERE/dist}; REPO=${REPO:-$HERE/repo}
rm -rf "$REPO"; mkdir -p "$REPO/pool/main" "$REPO/dists/stable/main/binary-amd64"
cp "$SRC"/*.deb "$REPO/pool/main/"
cd "$REPO"
apt-ftparchive packages pool > dists/stable/main/binary-amd64/Packages
gzip -kf dists/stable/main/binary-amd64/Packages
apt-ftparchive -o APT::FTPArchive::Release::Origin=Resora -o APT::FTPArchive::Release::Label=Resora \
  -o APT::FTPArchive::Release::Suite=stable -o APT::FTPArchive::Release::Codename=stable \
  -o APT::FTPArchive::Release::Architectures=amd64 -o APT::FTPArchive::Release::Components=main \
  release dists/stable > dists/stable/Release
if [ -n "${GPG_KEY_ID:-}" ]; then
  gpg --batch --yes --pinentry-mode loopback ${GPG_PASSPHRASE:+--passphrase "$GPG_PASSPHRASE"} -u "$GPG_KEY_ID" --clearsign -o dists/stable/InRelease dists/stable/Release
  gpg --batch --yes --pinentry-mode loopback ${GPG_PASSPHRASE:+--passphrase "$GPG_PASSPHRASE"} -u "$GPG_KEY_ID" -abs -o dists/stable/Release.gpg dists/stable/Release
  gpg --export "$GPG_KEY_ID" > "$REPO/resora.gpg"
else
  echo "ВНИМАНИЕ: репозиторий не подписан (GPG_KEY_ID не задан)" >&2
fi
echo "repo: $REPO"
