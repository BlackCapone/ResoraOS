#!/usr/bin/env python3
"""Генератор иконок Resora (64x64). Finder, Фото, Заметки, FaceTime, Календарь не трогаем."""
import math, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'Resora-Windows', 'assets', 'icons')

COMMON_DEFS = '''<linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff" stop-opacity=".34"/><stop offset=".5" stop-color="#fff" stop-opacity=".09"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="ed" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".7"/><stop offset=".5" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity=".3"/></linearGradient>
<linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>'''

def lin(id_, c0, c1, x1=0, y1=0, x2=0, y2=1, units=None):
    u = f' gradientUnits="{units}"' if units else ''
    return f'<linearGradient id="{id_}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"{u}><stop stop-color="{c0}"/><stop offset="1" stop-color="{c1}"/></linearGradient>'

def squircle(defs, bg, body):
    """Скруглённый квадрат с глянцем, нижней тенью и световой гранью — общий стиль набора."""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-hidden="true"><defs>{COMMON_DEFS}{defs}</defs><rect x="3" y="3" width="58" height="58" rx="14.5" fill="{bg}"/>{body}<rect x="3" y="3" width="58" height="58" rx="14.5" fill="url(#sh)"/><path d="M17.5 3.5h29A14 14 0 0 1 60.5 17.5V27H3.5V17.5A14 14 0 0 1 17.5 3.5Z" fill="url(#gl)" opacity=".62"/><rect x="3.6" y="3.6" width="56.8" height="56.8" rx="14" fill="none" stroke="url(#ed)" stroke-width="1.1"/></svg>'''

def plain(defs, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-hidden="true"><defs>{COMMON_DEFS}{defs}</defs>{body}</svg>'

icons = {}

# ---- Launchpad: серебристая плитка с цветной сеткой приложений ----
tiles = [['#ff5f57', '#ff9f0a', '#ffd60a'], ['#34c759', '#2bd3c6', '#0a84ff'], ['#bf5af2', '#ff375f', '#98989d']]
tb = ''
for r, row in enumerate(tiles):
    for c, col in enumerate(row):
        x, y = 13.5 + c * 13.2, 13.5 + r * 13.2
        tb += f'<rect x="{x:.1f}" y="{y:.1f}" width="10.4" height="10.4" rx="3" fill="{col}"/><rect x="{x:.1f}" y="{y:.1f}" width="10.4" height="10.4" rx="3" fill="url(#tl)"/>'
icons['launchpad'] = squircle(lin('bg', '#f1f3f8', '#aeb6c6') + '<linearGradient id="tl" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff" stop-opacity=".45"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>', 'url(#bg)', tb)

# ---- Safari ----
ticks = '<circle cx="32" cy="32" r="18.46" fill="none" stroke="#7aa9de" stroke-width="2.4" stroke-dasharray="0.6 2.3" opacity=".75"/>'
needle = ('<polygon points="44.5,19.5 34.7,34.7 29.3,29.3" fill="#ff3b30"/>'
          '<polygon points="19.5,44.5 34.7,34.7 29.3,29.3" fill="#f4f7fb"/>'
          '<polygon points="44.5,19.5 34.7,34.7 29.3,29.3" fill="none" stroke="#c42b22" stroke-width=".4"/>'
          '<circle cx="32" cy="32" r="2" fill="#fff" stroke="#9aa7bb" stroke-width=".6"/>')
icons['safari'] = squircle(lin('bg', '#4cc6ff', '#0a63e6') + lin('dial', '#ffffff', '#cfe2f7') + '<radialGradient id="rg" cx=".5" cy=".4" r=".7"><stop stop-color="#fff" stop-opacity=".0"/><stop offset="1" stop-color="#0a4fb8" stop-opacity=".28"/></radialGradient>',
    'url(#bg)',
    '<circle cx="32" cy="32" r="23.6" fill="url(#dial)" stroke="#e8f3ff" stroke-width="1.2"/><circle cx="32" cy="32" r="23" fill="url(#rg)"/><circle cx="32" cy="32" r="21.2" fill="none" stroke="#9cc3ee" stroke-width=".8"/>' + ticks + needle)

# ---- Сообщения ----
bubble = 'M32 13.5C19.9 13.5 11 20.9 11 30.2c0 5.6 3.3 10.4 8.5 13.4-.6 3.2-2.4 5.8-5 7.8 5-.4 9-2.4 11.7-5 1.9.4 3.8.6 5.8.6 12.1 0 21-7.4 21-16.8S44.100 13.5 32 13.500Z'
icons['messages'] = squircle(lin('bg', '#62f47e', '#0bb43c'), 'url(#bg)',
    f'<path d="{bubble}" fill="#000" opacity=".12" transform="translate(0 1.6)"/><path d="{bubble}" fill="url(#bb)"/>') .replace('<defs>', '<defs>' + lin('bb', '#ffffff', '#e3f6e8') , 1)

# ---- Почта ----
icons['mail'] = squircle(lin('bg', '#59c8ff', '#0a66ee') + lin('env', '#ffffff', '#dfeafa'), 'url(#bg)',
    '<rect x="10.5" y="19.5" width="43" height="27" rx="5" fill="#000" opacity=".14" transform="translate(0 1.4)"/>'
    '<rect x="10.5" y="19" width="43" height="27" rx="5" fill="url(#env)"/>'
    '<path d="M12 24 32 38.200 52 24" fill="none" stroke="#5aa4f0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'
    '<path d="M12.500 44.500 26 32M51.500 44.500 38 32" fill="none" stroke="#c7dbf3" stroke-width="1.5" stroke-linecap="round"/>')

# ---- Карты ----
icons['maps'] = squircle(
    '<clipPath id="cp"><rect x="3" y="3" width="58" height="58" rx="14.5"/></clipPath>' + lin('grn', '#9fe08f', '#6cc562') + lin('wat', '#8fd0ff', '#4aa8f0') + lin('pin', '#ff6a5e', '#e8281d'),
    '#f4f0e6',
    '<g clip-path="url(#cp)">'
    '<rect x="3" y="3" width="58" height="58" fill="#f4f0e6"/>'
    '<path d="M3 36 Q18 28 26 38 T40 61 L3 61Z" fill="url(#grn)"/>'
    '<path d="M44 3 Q50 16 40 26 T61 38 V3Z" fill="url(#wat)"/>'
    '<path d="M-2 22 L66 52" stroke="#fff" stroke-width="9" stroke-linecap="round"/>'
    '<path d="M-2 22 L66 52" stroke="#ffd34d" stroke-width="5" stroke-linecap="round"/>'
    '<path d="M10 3 L26 61" stroke="#fff" stroke-width="5"/>'
    '<path d="M34 61 Q44 44 61 44" stroke="#fff" stroke-width="3.5" fill="none"/>'
    '<path d="M14 50 Q26 40 36 36 T50 26" stroke="#2f80ff" stroke-width="2.4" stroke-dasharray="1 3.4" stroke-linecap="round" fill="none"/>'
    '</g>'
    '<path d="M38 16c-5.500 0-9.500 4.300-9.500 9.400 0 6.800 9.500 15.100 9.500 15.100s9.500-8.300 9.500-15.100C47.500 20.300 43.500 16 38 16Z" fill="#000" opacity=".16" transform="translate(0 1.4)"/>'
    '<path d="M38 15c-5.500 0-9.500 4.300-9.500 9.400 0 6.800 9.500 15.100 9.500 15.100s9.500-8.300 9.500-15.100C47.500 19.300 43.500 15 38 15Z" fill="url(#pin)"/><circle cx="38" cy="24.200" r="3.600" fill="#fff"/>')

# ---- Напоминания ----
rows = ''
for y, col in ((21, '#ff453a'), (32, '#ff9f0a'), (43, '#0a84ff')):
    rows += f'<circle cx="17.500" cy="{y}" r="4" fill="none" stroke="{col}" stroke-width="2"/><circle cx="17.500" cy="{y}" r="1.700" fill="{col}"/><path d="M27 {y}H49" stroke="#d3d6dd" stroke-width="2.800" stroke-linecap="round"/>'
icons['reminders'] = squircle(lin('bg', '#ffffff', '#eceef3'), 'url(#bg)', rows)

# ---- Терминал ----
icons['terminal'] = squircle(lin('bg', '#3b3f48', '#0c0d10') + lin('bz', '#6a707d', '#2a2d34'), 'url(#bg)',
    '<rect x="8.500" y="8.500" width="47" height="47" rx="9" fill="none" stroke="url(#bz)" stroke-width="1.2" opacity=".8"/>'
    '<path d="M17 25.500 27 32.500 17 39.500" fill="none" stroke="#f5f7fa" stroke-width="3.600" stroke-linecap="round" stroke-linejoin="round"/>'
    '<path d="M31.500 41.500H46" fill="none" stroke="#f5f7fa" stroke-width="3.600" stroke-linecap="round"/>')

# ---- Калькулятор ----
kb = ''
cols = [10.5, 22.3, 34.1, 45.9]
for r, y in enumerate((27.5, 37.5, 47.5)):
    for c, x in enumerate(cols):
        fill = 'url(#ko)' if c == 3 else ('url(#kg2)' if r == 0 else 'url(#kg)')
        kb += f'<rect x="{x}" y="{y}" width="9.6" height="8.4" rx="2.800" fill="{fill}"/>'
icons['calculator'] = squircle(lin('bg', '#454953', '#17191d') + lin('kg', '#80858f', '#5a5e68') + lin('kg2', '#a5a9b2', '#7b808b') + lin('ko', '#ffb340', '#ff8a00'), 'url(#bg)',
    '<rect x="10.500" y="10.500" width="43" height="13.500" rx="4" fill="#0b0c0f"/>'
    '<text x="50" y="21.800" font-family="Inter,Arial,sans-serif" font-size="10.500" font-weight="500" fill="#f5f6f8" text-anchor="end">0</text>' + kb)

# ---- Погода ----
cloud = ('<g fill="url(#cl)"><circle cx="23.500" cy="41" r="8.500"/><circle cx="34.500" cy="35.500" r="11.500"/><circle cx="46" cy="41.500" r="8"/><rect x="17" y="38" width="36" height="12" rx="6"/></g>')
icons['weather'] = squircle(lin('bg', '#2f78ee', '#78cbff', 0, 0, 0.6, 1) +
    '<radialGradient id="sun" cx=".4" cy=".35" r=".8"><stop stop-color="#fff6a8"/><stop offset=".55" stop-color="#ffd23f"/><stop offset="1" stop-color="#ff9f0a"/></radialGradient>' +
    '<linearGradient id="cl" x1="0" y1="26" x2="0" y2="52" gradientUnits="userSpaceOnUse"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#cfe0f6"/></linearGradient>',
    'url(#bg)',
    '<circle cx="42" cy="22.500" r="16" fill="#fff0a0" opacity=".28"/><circle cx="42" cy="22.500" r="10.500" fill="url(#sun)"/>'
    '<g opacity=".18" transform="translate(0 2.200)" fill="#0a3b8f"><circle cx="23.500" cy="41" r="8.500"/><circle cx="34.500" cy="35.500" r="11.500"/><circle cx="46" cy="41.500" r="8"/><rect x="17" y="38" width="36" height="12" rx="6"/></g>' + cloud)

# ---- TV ----
icons['tv'] = squircle(lin('bg', '#2a2b31', '#050506') + lin('tx', '#ffffff', '#cfd4de'), 'url(#bg)',
    '<path d="M27.500 17.500 32 21.800 36.500 17.500" fill="none" stroke="#5ac8fa" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"/>'
    '<g fill="none" stroke="url(#tx)" stroke-width="4.200" stroke-linecap="round" stroke-linejoin="round"><path d="M20 30.500H30M24.500 25.500V38c0 2.800 1.600 4 4 4h1.500"/><path d="M33 31 38.500 42 44 31"/></g>')

# ---- Музыка ----
icons['music'] = squircle(lin('bg', '#ff6f8a', '#f81f3d') + lin('nt', '#ffffff', '#ffe3e8'), 'url(#bg)',
    '<g fill="url(#nt)"><ellipse cx="25" cy="43" rx="5.600" ry="4.300" transform="rotate(-18 25 43)"/><ellipse cx="42.500" cy="39" rx="5.600" ry="4.300" transform="rotate(-18 42.500 39)"/>'
    '<rect x="28.500" y="20" width="3" height="23"/><rect x="46" y="16" width="3" height="23"/><path d="M28.500 20.500 49 15.500V22L28.500 27Z"/></g>')

# ---- App Store ----
icons['appstore'] = squircle(lin('bg', '#34c0ff', '#0a58f2'), 'url(#bg)',
    '<g fill="none" stroke="#fff" stroke-width="4.600" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M32 16 21 45"/><path d="M32 16 43 45"/><path d="M19.500 38.500H44.500" stroke-width="4"/></g>'
    '<path d="M16 46.500H25" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".0"/>')

# ---- Системные настройки ----
def gear(cx, cy, ro, ri, n):
    pts = []
    w = 2 * math.pi / n
    for k in range(n):
        a0 = w * k
        for ang, r in ((a0 - .30 * w, ri), (a0 - .17 * w, ro), (a0 + .17 * w, ro), (a0 + .30 * w, ri)):
            pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    return 'M' + ' L'.join(f'{x:.2f} {y:.2f}' for x, y in pts) + 'Z'
g = gear(32, 32, 21.5, 17.2, 12)
icons['settings'] = squircle(lin('bg', '#d3d7df', '#8f95a3') + lin('gr', '#7c8290', '#3c404a') + lin('hl', '#e6e9ef', '#a9afbd'), 'url(#bg)',
    f'<path d="{g}" fill="#000" opacity=".2" transform="translate(0 1.500)"/><path d="{g}" fill="url(#gr)" stroke="url(#gr)" stroke-width="1.600" stroke-linejoin="round"/>'
    '<circle cx="32" cy="32" r="13.200" fill="none" stroke="#2f323a" stroke-width="1.400" opacity=".55"/>'
    '<circle cx="32" cy="32" r="8" fill="url(#hl)" stroke="#2c2f37" stroke-width="1.200"/>'
    '<circle cx="32" cy="32" r="3.200" fill="#4a4e59"/>')

# ---- Загрузки (папка) ----
icons['downloads'] = plain(lin('bk', '#4aa8f5', '#1769d8') + lin('fr', '#7fd2ff', '#2b94f4') + lin('ar', '#ffffff', '#d9ecff'),
    '<path d="M7 17.500A5.500 5.500 0 0 1 12.500 12H24l5 5.500h22.500A5.500 5.500 0 0 1 57 23v27.500a5.500 5.500 0 0 1-5.500 5.500H12.500A5.500 5.500 0 0 1 7 50.500Z" fill="url(#bk)"/>'
    '<path d="M7 26.500A5.500 5.500 0 0 1 12.500 21h39A5.500 5.500 0 0 1 57 26.500v24A5.500 5.500 0 0 1 51.500 56h-39A5.500 5.500 0 0 1 7 50.500Z" fill="url(#fr)"/>'
    '<path d="M12.500 21.500h39A5 5 0 0 1 56.500 26.500v1H7.500v-1A5 5 0 0 1 12.500 21.500Z" fill="#fff" opacity=".35"/>'
    '<g fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M32 30.500V45"/><path d="M25 38.500 32 45.500 39 38.500"/></g>')

# ---- Корзина ----
ribs = ''.join(f'<path d="M{x} 27V50" stroke="#fff" stroke-opacity=".5" stroke-width="1.300" stroke-linecap="round"/>' for x in (24, 28, 32, 36, 40))
icons['trash'] = plain(lin('bn', '#eef1f7', '#a5acbb') + lin('lid', '#d6dbe6', '#8d95a6'),
    '<path d="M15.500 23.500h33l-2.600 29.500A4 4 0 0 1 41.900 56H22.100a4 4 0 0 1-4-3.500Z" fill="#000" opacity=".12" transform="translate(0 1.200)"/>'
    '<path d="M15.500 23.500h33l-2.600 29.500A4 4 0 0 1 41.900 56H22.100a4 4 0 0 1-4-3.500Z" fill="url(#bn)" stroke="#fff" stroke-opacity=".6" stroke-width="1"/>' + ribs +
    '<rect x="12" y="17" width="40" height="6.500" rx="3.250" fill="url(#lid)" stroke="#fff" stroke-opacity=".55" stroke-width=".9"/>'
    '<rect x="26" y="12.500" width="12" height="5" rx="2.500" fill="url(#lid)"/>')

if __name__ == '__main__':
    for name, svg in icons.items():
        with open(os.path.join(OUT, name + '.svg'), 'w', encoding='utf-8') as f:
            f.write(svg)
    print('written', len(icons), 'icons:', ', '.join(icons))
