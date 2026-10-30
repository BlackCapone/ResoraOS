# Автозапуск Resora на первой консоли.
if [ -z "${WAYLAND_DISPLAY:-}" ] && [ "$(tty)" = "/dev/tty1" ]; then
    exec resora-session
fi
