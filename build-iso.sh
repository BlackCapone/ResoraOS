#!/bin/bash
# Сборка загрузочного ISO Resora OS (Ubuntu 24.04 + live-boot + cage + WebKitGTK).
# Запуск: sudo ./build-iso.sh      (нужны root, интернет и ~8 ГБ свободного места)
# Переменные: SUITE, MIRROR, SECURITY, WORK, OUT, UI_DIR, FIRMWARE=1|0, SQUASH_COMP=zstd|xz, ISO_NAME
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
SUITE=${SUITE:-noble}
MIRROR=${MIRROR:-http://archive.ubuntu.com/ubuntu}
SECURITY=${SECURITY:-http://security.ubuntu.com/ubuntu}
WORK=${WORK:-$HERE/work}
OUT=${OUT:-$HERE/out}
UI_DIR=${UI_DIR:-$HERE/ui}
FIRMWARE=${FIRMWARE:-1}
SQUASH_COMP=${SQUASH_COMP:-zstd}
ISO_NAME=${ISO_NAME:-resora-os.iso}
# Репозиторий обновлений Resora (необязательно): RESORA_APT_URL=https://<user>.github.io/<repo>  RESORA_APT_KEY=путь/к/resora.gpg
RESORA_APT_URL=${RESORA_APT_URL:-}
RESORA_APT_KEY=${RESORA_APT_KEY:-}
ROOT=$WORK/rootfs; ISO=$WORK/iso; STAMP=$WORK/.stamps
[ "$(id -u)" = 0 ] || { echo "Нужен root: sudo $0" >&2; exit 1; }
[ -f "$UI_DIR/index.html" ] || { echo "Нет $UI_DIR/index.html (скопируйте туда папку Resora-Windows)" >&2; exit 1; }
mkdir -p "$WORK" "$OUT" "$STAMP"

log() { echo -e "\n=== $(date +%H:%M:%S) $* ==="; }
stage() { local name=$1; shift; if [ -e "$STAMP/$name" ]; then log "пропуск: $name (уже сделано)"; else log "$name"; "$@"; touch "$STAMP/$name"; fi; }

mounts() { mount -t proc proc "$ROOT/proc"; mount -t sysfs sysfs "$ROOT/sys"; mount --bind /dev "$ROOT/dev"; mount -t devpts devpts "$ROOT/dev/pts"; }
umounts() { for m in dev/pts dev sys proc; do mountpoint -q "$ROOT/$m" && umount -lf "$ROOT/$m" || true; done; }
trap umounts EXIT

host_tools() {
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq debootstrap squashfs-tools xorriso grub-pc-bin grub-efi-amd64-bin grub-common mtools
}

bootstrap() {
  rm -rf "$ROOT"
  debootstrap --variant=minbase --arch=amd64 --components=main,universe "$SUITE" "$ROOT" "$MIRROR"
}

packages() {
  cp /etc/resolv.conf "$ROOT/etc/resolv.conf"
  cat > "$ROOT/etc/apt/sources.list" <<EOS
deb $MIRROR $SUITE main universe
deb $MIRROR $SUITE-updates main universe
deb $SECURITY $SUITE-security main universe
EOS
  rm -f "$ROOT/etc/apt/sources.list.d/"*.sources 2>/dev/null || true
  mounts
  local extra=""
  [ "$FIRMWARE" = 1 ] && extra="linux-firmware wireless-regdb"
  chroot "$ROOT" /bin/bash -eu <<EOS
export DEBIAN_FRONTEND=noninteractive LC_ALL=C
echo 'APT::Install-Recommends "false";' > /etc/apt/apt.conf.d/99norecommends
cat > /etc/dpkg/dpkg.cfg.d/01-resora-slim <<EOD
path-exclude=/usr/share/doc/*
path-exclude=/usr/share/man/*
path-exclude=/usr/share/info/*
path-exclude=/usr/share/lintian/*
path-exclude=/usr/share/locale/*
path-include=/usr/share/locale/en*/*
path-include=/usr/share/locale/ru*/*
path-include=/usr/share/locale/locale.alias
EOD
printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d; chmod +x /usr/sbin/policy-rc.d
apt-get update
# Сначала подтягиваем всё, что вышло после релиза Ubuntu, — в образ не должны попадать устаревшие пакеты с известными уязвимостями.
apt-get -y dist-upgrade
apt-get install -y initramfs-tools live-boot live-boot-initramfs-tools linux-image-generic $extra \
  systemd-sysv systemd-resolved libpam-systemd dbus dbus-user-session udev sudo ca-certificates locales tzdata \
  network-manager wpasupplicant iw rfkill iproute2 iputils-ping nano \
  cage python3 python3-gi gir1.2-gtk-4.0 gir1.2-webkit-6.0 \
  libgl1-mesa-dri libegl1 libgbm1 libglx-mesa0 libgles2 mesa-vulkan-drivers xkb-data libinput10 xdg-utils \
  fonts-inter fonts-dejavu-core fonts-droid-fallback \
  pipewire pipewire-pulse wireplumber alsa-utils brightnessctl \
  foot foot-terminfo epiphany-browser gstreamer1.0-plugins-base gstreamer1.0-plugins-good \
  unattended-upgrades apt-utils grub-efi-amd64-bin grub-pc-bin grub-common efibootmgr parted gdisk dosfstools e2fsprogs squashfs-tools
EOS
}

customize() {
  mountpoint -q "$ROOT/proc" || mounts
  cp -a "$HERE/overlay/." "$ROOT/"
  # Интерфейс Resora ставится обычным deb-пакетом — тогда его можно обновлять через apt.
  VERSION=${VERSION:-1.0.$(date -u +%Y%m%d%H%M)} OUT="$WORK/deb" bash "$HERE/packaging/build-deb.sh"
  cp "$WORK"/deb/resora-shell_*_all.deb "$ROOT/tmp/"
  chroot "$ROOT" /bin/bash -c 'DEBIAN_FRONTEND=noninteractive dpkg -i /tmp/resora-shell_*_all.deb && rm -f /tmp/resora-shell_*_all.deb'
  if [ -n "$RESORA_APT_URL" ]; then
    mkdir -p "$ROOT/etc/apt/keyrings"
    if [ -n "$RESORA_APT_KEY" ] && [ -f "$RESORA_APT_KEY" ]; then
      if grep -q "BEGIN PGP" "$RESORA_APT_KEY"; then gpg --dearmor < "$RESORA_APT_KEY" > "$ROOT/etc/apt/keyrings/resora.gpg"; else cp "$RESORA_APT_KEY" "$ROOT/etc/apt/keyrings/resora.gpg"; fi
    fi
    printf 'Types: deb\nURIs: %s/apt\nSuites: stable\nComponents: main\nSigned-By: /etc/apt/keyrings/resora.gpg\n' "$RESORA_APT_URL" > "$ROOT/etc/apt/sources.list.d/resora.sources"
  fi
  for d in Desktop Documents Downloads Pictures Music Videos; do mkdir -p "$ROOT/etc/skel/$d"; done
  cp "$ROOT/usr/share/resora/assets/wallpaper.svg" "$ROOT/etc/skel/Pictures/" 2>/dev/null || true
  printf 'Добро пожаловать в Resora OS!\nЭто живая сессия: изменения не сохраняются после выключения.\n' > "$ROOT/etc/skel/Desktop/Добро пожаловать.txt"
  echo resora > "$ROOT/etc/hostname"
  printf '127.0.0.1 localhost\n127.0.1.1 resora\n' > "$ROOT/etc/hosts"
  printf 'XKBLAYOUT="us,ru"\nXKBOPTIONS="grp:alt_shift_toggle"\n' > "$ROOT/etc/default/keyboard"
  printf 'NAME="Resora OS"\nPRETTY_NAME="Resora OS 1.0"\nID=resora\nID_LIKE=ubuntu\nVERSION_ID="1.0"\nHOME_URL="https://resora.local"\n' > "$ROOT/etc/os-release.resora"
  chroot "$ROOT" /bin/bash -eu <<'EOS'
export DEBIAN_FRONTEND=noninteractive LC_ALL=C
sed -i 's/^# *\(en_US.UTF-8\)/\1/; s/^# *\(ru_RU.UTF-8\)/\1/' /etc/locale.gen
locale-gen
update-locale LANG=ru_RU.UTF-8
id resora >/dev/null 2>&1 || useradd -m -s /bin/bash -G sudo,video,audio,input,render,netdev,plugdev,dialout resora 2>/dev/null || useradd -m -s /bin/bash resora
for g in sudo video audio input render netdev plugdev dialout; do getent group $g >/dev/null && usermod -aG $g resora || true; done
passwd -d resora
cp -n /etc/skel/.bash_profile /home/resora/.bash_profile; chown -R resora:resora /home/resora
: > /etc/machine-id
systemctl enable NetworkManager.service systemd-resolved.service || true
systemctl --global enable pipewire.socket pipewire-pulse.socket wireplumber.service || true
systemctl disable systemd-networkd-wait-online.service NetworkManager-wait-online.service 2>/dev/null || true
systemctl mask apt-daily.timer apt-daily-upgrade.timer motd-news.timer 2>/dev/null || true
systemctl set-default multi-user.target
chmod 755 /usr/lib/resora/shell.py /usr/bin/resora-session
update-initramfs -u -k all
EOS
  mv "$ROOT/etc/os-release.resora" "$ROOT/etc/os-release.new"
  # Название системы: подменяем только PRETTY_NAME/NAME, ID оставляем ubuntu-совместимым для пакетных скриптов.
  sed -i 's/^PRETTY_NAME=.*/PRETTY_NAME="Resora OS 1.0"/; s/^NAME=.*/NAME="Resora OS"/' "$ROOT/etc/os-release"
  rm -f "$ROOT/etc/os-release.new"
}

cleanup_root() {
  chroot "$ROOT" /bin/bash -eu <<'EOS'
apt-get clean
rm -rf /var/lib/apt/lists/* /var/cache/apt/* /var/cache/debconf/*-old /tmp/* /var/tmp/* /root/.cache
rm -f /usr/sbin/policy-rc.d
find /var/log -type f -exec truncate -s 0 {} +
EOS
  rm -f "$ROOT/etc/resolv.conf"; ln -s ../run/systemd/resolve/stub-resolv.conf "$ROOT/etc/resolv.conf"
  umounts
}

kernel() {
  mkdir -p "$ISO/live" "$ISO/boot/grub"
  local k i
  k=$(ls "$ROOT"/boot/vmlinuz-* | sort -V | tail -1); i=$(ls "$ROOT"/boot/initrd.img-* | sort -V | tail -1)
  cp "$k" "$ISO/live/vmlinuz"; cp "$i" "$ISO/live/initrd.img"
}

squash() {
  rm -f "$ISO/live/filesystem.squashfs"
  local opts="-comp $SQUASH_COMP"
  [ "$SQUASH_COMP" = zstd ] && opts="$opts -Xcompression-level 10"
  mksquashfs "$ROOT" "$ISO/live/filesystem.squashfs" -noappend -b 262144 $opts -e boot/grub
  du -h "$ISO/live/filesystem.squashfs"
}

make_iso() {
  cat > "$ISO/boot/grub/grub.cfg" <<'EOS'
set timeout=4
set default=0
insmod all_video
menuentry "Resora OS" {
    linux /live/vmlinuz boot=live components quiet loglevel=3 ---
    initrd /live/initrd.img
}
menuentry "Resora OS - безопасная графика (без ускорения)" {
    linux /live/vmlinuz boot=live components quiet loglevel=3 resora.safe=1 ---
    initrd /live/initrd.img
}
menuentry "Resora OS - ускорение GPU (экспериментально)" {
    linux /live/vmlinuz boot=live components quiet loglevel=3 resora.gpu=1 ---
    initrd /live/initrd.img
}
EOS
  rm -f "$OUT/$ISO_NAME"
  grub-mkrescue -o "$OUT/$ISO_NAME" "$ISO" -- -volid RESORA_OS
  ls -lh "$OUT/$ISO_NAME"
}

stage host_tools host_tools
stage bootstrap bootstrap
stage packages packages
stage customize customize
stage cleanup cleanup_root
stage kernel kernel
stage squash squash
rm -f "$STAMP/iso"; stage iso make_iso
log "ГОТОВО: $OUT/$ISO_NAME"
