"""Мост между интерфейсом Resora (HTML) и системой. Без зависимостей от GTK, чтобы его можно было тестировать."""
import json, os, re, subprocess

HOME = os.environ.get('HOME', '/home/resora')

# Приложения, которые можно запускать из интерфейса (белый список).
APPS = {
    'browser': ['epiphany'],
    'terminal': ['foot'],
}


def run(cmd, timeout=20, sudo=False, input=None):
    """Запуск внешней команды. Всегда LC_ALL=C: разбираем вывод утилит, а он зависит от языка системы."""
    if sudo:
        cmd = ['sudo', '-n', 'env', 'LC_ALL=C'] + cmd
    env = dict(os.environ, LC_ALL='C')
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, input=input, env=env)
    return p.returncode, p.stdout, p.stderr


def split_nmcli(line):
    """Разбор строки `nmcli -t`: поля через ':', двоеточие и обратная косая в значениях экранируются."""
    out, cur, esc = [], '', False
    for ch in line:
        if esc:
            cur += ch
            esc = False
        elif ch == '\\':
            esc = True
        elif ch == ':':
            out.append(cur)
            cur = ''
        else:
            cur += ch
    out.append(cur)
    return out


def parse_wifi_list(text):
    """IN-USE:SSID:SIGNAL:SECURITY → список сетей без дублей (оставляем сильнейший сигнал)."""
    best = {}
    for line in text.splitlines():
        f = split_nmcli(line)
        if len(f) < 4 or not f[1]:
            continue
        in_use, ssid, signal, sec = f[0], f[1], f[2], f[3]
        try:
            sig = int(signal)
        except ValueError:
            sig = 0
        item = {'ssid': ssid, 'signal': sig, 'secure': bool(sec.strip()) and sec.strip() != '--', 'active': in_use.strip() == '*'}
        old = best.get(ssid)
        if old is None or item['active'] or (not old['active'] and sig > old['signal']):
            best[ssid] = item
    return sorted(best.values(), key=lambda n: (-n['active'], -n['signal']))


def wifi_scan():
    code, out, err = run(['nmcli', '-t', '-f', 'IN-USE,SSID,SIGNAL,SECURITY', 'dev', 'wifi', 'list', '--rescan', 'auto'], timeout=30, sudo=True)
    if code != 0:
        raise RuntimeError(err.strip() or 'Wi-Fi недоступен')
    return parse_wifi_list(out)


def wifi_connect(ssid, password=''):
    if not ssid:
        raise ValueError('Не указано имя сети')
    cmd = ['nmcli', 'dev', 'wifi', 'connect', ssid]
    if password:
        cmd += ['password', password]
    code, out, err = run(cmd, timeout=45, sudo=True)
    if code != 0:
        raise RuntimeError((err or out).strip() or 'Не удалось подключиться')
    return True


def wifi_radio(on):
    code, _, err = run(['nmcli', 'radio', 'wifi', 'on' if on else 'off'], sudo=True)
    if code != 0:
        raise RuntimeError(err.strip())
    return True


def wifi_status():
    code, out, _ = run(['nmcli', '-t', '-f', 'ACTIVE,SSID', 'dev', 'wifi'], sudo=True)
    if code != 0:
        return {'connected': False, 'ssid': ''}
    for line in out.splitlines():
        f = split_nmcli(line)
        if len(f) >= 2 and f[0] == 'yes':
            return {'connected': True, 'ssid': f[1]}
    return {'connected': False, 'ssid': ''}


def parse_wpctl_volume(text):
    m = re.search(r'Volume:\s*([0-9.]+)', text)
    muted = '[MUTED]' in text
    return {'value': int(round(float(m.group(1)) * 100)) if m else 0, 'muted': muted}


def audio_get():
    code, out, _ = run(['wpctl', 'get-volume', '@DEFAULT_AUDIO_SINK@'])
    if code != 0:
        raise RuntimeError('Звуковая подсистема недоступна')
    return parse_wpctl_volume(out)


def audio_set(value):
    v = max(0, min(100, int(value)))
    code, _, err = run(['wpctl', 'set-volume', '@DEFAULT_AUDIO_SINK@', f'{v}%'])
    if code != 0:
        raise RuntimeError(err.strip() or 'Не удалось изменить громкость')
    return v


def parse_brightness(text):
    """Вывод `brightnessctl -m`: имя,класс,текущая,процент,максимум."""
    for line in text.splitlines():
        f = line.split(',')
        if len(f) >= 5 and f[3].endswith('%'):
            return int(f[3].rstrip('%'))
    return None


def brightness_get():
    code, out, _ = run(['brightnessctl', '-c', 'backlight', '-m'])
    val = parse_brightness(out) if code == 0 else None
    if val is None:
        raise RuntimeError('Подсветка экрана недоступна')
    return val


def brightness_set(value):
    v = max(5, min(100, int(value)))
    code, _, err = run(['brightnessctl', '-c', 'backlight', 'set', f'{v}%'])
    if code != 0:
        raise RuntimeError(err.strip() or 'Не удалось изменить яркость')
    return v


def battery(base='/sys/class/power_supply'):
    """Первая батарея или None (настольный компьютер)."""
    try:
        names = sorted(os.listdir(base))
    except OSError:
        return None
    for n in names:
        d = os.path.join(base, n)
        try:
            if open(os.path.join(d, 'type')).read().strip() != 'Battery':
                continue
            cap = int(open(os.path.join(d, 'capacity')).read().strip())
            status = open(os.path.join(d, 'status')).read().strip()
            return {'percent': cap, 'charging': status in ('Charging', 'Full')}
        except (OSError, ValueError):
            continue
    return None


def power(action):
    cmds = {'poweroff': ['systemctl', 'poweroff'], 'reboot': ['systemctl', 'reboot'], 'suspend': ['systemctl', 'suspend']}
    if action not in cmds:
        raise ValueError('Неизвестное действие')
    code, _, err = run(cmds[action], sudo=True)
    if code != 0:
        raise RuntimeError(err.strip())
    return True


def launch(app):
    if app not in APPS:
        raise ValueError('Приложение недоступно')
    subprocess.Popen(APPS[app], start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return True


def open_path(path):
    path = os.path.realpath(path)
    if not os.path.exists(path):
        raise FileNotFoundError('Файл не найден')
    subprocess.Popen(['xdg-open', path], start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return True


def fs_list(path, limit=800):
    """Список файлов каталога (только чтение). Скрытые файлы не показываем."""
    path = os.path.realpath(os.path.expanduser(path or '~'))
    if not os.path.isdir(path):
        raise NotADirectoryError('Это не папка')
    items = []
    with os.scandir(path) as it:
        for e in it:
            if e.name.startswith('.'):
                continue
            try:
                st = e.stat()
                is_dir = e.is_dir()
            except OSError:
                continue
            items.append({'name': e.name, 'dir': is_dir, 'size': 0 if is_dir else st.st_size, 'mtime': int(st.st_mtime)})
    items.sort(key=lambda x: (not x['dir'], x['name'].lower()))
    return {'path': path, 'parent': os.path.dirname(path) if path != '/' else None, 'items': items[:limit]}


def fs_read(path, limit=200000):
    """Текст небольшого файла для быстрого просмотра."""
    path = os.path.realpath(os.path.expanduser(path or ''))
    if not os.path.isfile(path):
        raise FileNotFoundError('Файл не найден')
    with open(path, 'rb') as f:
        data = f.read(limit + 1)
    return {'text': data[:limit].decode('utf-8', errors='replace'), 'truncated': len(data) > limit}


def sys_info():
    def read(p, default=''):
        try:
            return open(p).read().strip()
        except OSError:
            return default
    cpu = next((l.split(':', 1)[1].strip() for l in read('/proc/cpuinfo').splitlines() if l.startswith('model name')), '')
    mem_kb = next((int(l.split()[1]) for l in read('/proc/meminfo').splitlines() if l.startswith('MemTotal')), 0)
    pretty = next((l.split('=', 1)[1].strip('"') for l in read('/etc/os-release').splitlines() if l.startswith('PRETTY_NAME=')), 'Resora OS')
    live = 'boot=live' in read('/proc/cmdline')
    return {'hostname': read('/etc/hostname'), 'kernel': read('/proc/sys/kernel/osrelease'), 'cpu': cpu, 'memory_gb': round(mem_kb / 1024 / 1024), 'os': pretty, 'home': HOME,
            'live': live, 'shell_version': read('/usr/share/resora/VERSION', 'dev')}


def set_timezone(tz):
    if not re.fullmatch(r'[A-Za-z_]+(/[A-Za-z0-9_+-]+)*', tz or ''):
        raise ValueError('Некорректный часовой пояс')
    code, _, err = run(['timedatectl', 'set-timezone', tz], sudo=True)
    if code != 0:
        raise RuntimeError(err.strip())
    return True


# ---------------- Обновления системы (apt) ----------------
APT_LINE = re.compile(r'^(?P<name>[^/\s]+)/(?P<src>\S+)\s+(?P<cand>\S+)\s+(?P<arch>\S+)\s+\[upgradable from:\s*(?P<cur>[^\]]+)\]')
AUTO_FILE = '/etc/apt/apt.conf.d/20auto-upgrades'
STAMP_FILE = '/var/lib/apt/periodic/update-success-stamp'
REBOOT_FLAG = '/var/run/reboot-required'
_UPDATE = {'proc': None, 'log': '/tmp/resora-update.log'}


def parse_upgradable(text):
    """Вывод `apt list --upgradable` → список пакетов; security — если источник содержит -security."""
    out = []
    for line in text.splitlines():
        m = APT_LINE.match(line.strip())
        if m:
            d = m.groupdict()
            out.append({'name': d['name'], 'current': d['cur'], 'candidate': d['cand'], 'security': '-security' in d['src'],
                        'resora': d['name'].startswith('resora')})
    return sorted(out, key=lambda p: (not p['resora'], not p['security'], p['name']))


def last_check_time(path=STAMP_FILE):
    try:
        return int(os.stat(path).st_mtime)
    except OSError:
        return None


def update_check():
    code, _, err = run(['apt-get', 'update', '-q'], timeout=240, sudo=True)
    if code != 0:
        low = err.lower()
        if 'could not resolve' in low or 'temporary failure' in low or 'failed to fetch' in low or 'unreachable' in low:
            raise RuntimeError('Нет подключения к интернету или сервер обновлений недоступен')
        raise RuntimeError((err.strip().splitlines() or ['Не удалось проверить обновления'])[-1])
    _, out, _ = run(['apt', 'list', '--upgradable'], timeout=60)
    pk = parse_upgradable(out)
    return {'packages': pk, 'count': len(pk), 'security': sum(1 for p in pk if p['security']),
            'reboot_required': os.path.exists(REBOOT_FLAG), 'checked': last_check_time()}


def update_install():
    p = _UPDATE['proc']
    if p is not None and p.poll() is None:
        raise RuntimeError('Обновление уже выполняется')
    log = open(_UPDATE['log'], 'w')
    _UPDATE['proc'] = subprocess.Popen(
        ['sudo', '-n', 'env', 'LC_ALL=C', 'DEBIAN_FRONTEND=noninteractive', 'apt-get', '-y', '-o', 'Dpkg::Options::=--force-confold',
         '-o', 'APT::Color=0', 'upgrade'], stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    return True


def update_status():
    p = _UPDATE['proc']
    running = p is not None and p.poll() is None
    lines, steps = [], 0
    try:
        with open(_UPDATE['log'], errors='replace') as f:
            text = f.read()
        lines = [l for l in text.splitlines() if l.strip()][-5:]
        steps = sum(1 for l in text.splitlines() if l.startswith('Setting up '))
    except OSError:
        pass
    return {'started': p is not None, 'running': running, 'done': p is not None and not running,
            'ok': p is not None and p.returncode == 0, 'lines': lines, 'steps': steps,
            'reboot_required': os.path.exists(REBOOT_FLAG)}


def auto_enabled(text):
    return bool(re.search(r'Unattended-Upgrade\s+"1"', text or ''))


def auto_get():
    try:
        return {'enabled': auto_enabled(open(AUTO_FILE).read())}
    except OSError:
        return {'enabled': False}


def auto_set(on):
    content = ('APT::Periodic::Update-Package-Lists "1";\n'
               'APT::Periodic::Unattended-Upgrade "%d";\n'
               'APT::Periodic::AutocleanInterval "7";\n') % (1 if on else 0)
    code, _, err = run(['tee', AUTO_FILE], sudo=True, input=content)
    if code != 0:
        raise RuntimeError(err.strip() or 'Не удалось сохранить настройку')
    timers = ['apt-daily.timer', 'apt-daily-upgrade.timer']
    if on:
        run(['systemctl', 'unmask'] + timers, sudo=True)
        run(['systemctl', 'enable', '--now'] + timers, sudo=True)
    else:
        run(['systemctl', 'disable', '--now'] + timers, sudo=True)
    return {'enabled': bool(on)}


COMMANDS = {
    'power': lambda a: power(a.get('action')),
    'wifi.scan': lambda a: wifi_scan(),
    'wifi.connect': lambda a: wifi_connect(a.get('ssid', ''), a.get('password', '')),
    'wifi.radio': lambda a: wifi_radio(bool(a.get('on'))),
    'wifi.status': lambda a: wifi_status(),
    'audio.get': lambda a: audio_get(),
    'audio.set': lambda a: audio_set(a.get('value', 0)),
    'brightness.get': lambda a: brightness_get(),
    'brightness.set': lambda a: brightness_set(a.get('value', 50)),
    'battery': lambda a: battery(),
    'app.launch': lambda a: launch(a.get('app')),
    'app.open': lambda a: open_path(a.get('path', '')),
    'fs.list': lambda a: fs_list(a.get('path', '~')),
    'fs.read': lambda a: fs_read(a.get('path', '')),
    'sys.info': lambda a: sys_info(),
    'update.check': lambda a: update_check(),
    'update.install': lambda a: update_install(),
    'update.status': lambda a: update_status(),
    'update.auto.get': lambda a: auto_get(),
    'update.auto.set': lambda a: auto_set(bool(a.get('on'))),
    'time.zone': lambda a: set_timezone(a.get('tz', '')),
}


def dispatch(raw):
    """Принимает JSON {id, cmd, args}; возвращает (id, ok, data). Ошибки уходят в интерфейс, а не исключением."""
    try:
        msg = json.loads(raw)
        mid = msg.get('id')
    except (ValueError, AttributeError):
        return (None, False, 'Некорректное сообщение')
    handler = COMMANDS.get(msg.get('cmd'))
    if handler is None:
        return (mid, False, 'Неизвестная команда')
    try:
        return (mid, True, handler(msg.get('args') or {}))
    except Exception as e:
        return (mid, False, str(e) or e.__class__.__name__)
