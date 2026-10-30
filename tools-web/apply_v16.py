#!/usr/bin/env python3
"""Собирает Resora-Windows/index.html (v16) из оригинала v15 и файлов в tools/v16/."""
import os
base = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(base, p), encoding='utf-8').read()
src = rd('index.v15.html')

# 1) Пункт управления
a = src.index('<div class="control-popover" id="controlPopover"')
b = src.index('<div class="toast" id="toast"')
src = src[:a] + rd('v16/cc.html').rstrip() + '\n  ' + src[b:]

# 2) Мастер настройки: заменяем окно с боковой панелью на центральную карточку
a = src.index('<div class="setup-window">')
b = src.index('</section>', a)
src = src[:a] + rd('v16/setup.html').rstrip() + '\n  ' + src[b:]

# 3) CSS — после всех существующих стилей
last_style = src.rindex('</style>')
first_script = src.index('<script', last_style)
src = src[:first_script] + '<style id="resora-v16">\n' + rd('v16/v16.css') + '\n</style>\n' + src[first_script:]

# 4) JS — в самом конце, чтобы переопределить прежние функции
end = src.rindex('</body>')
src = src[:end] + '<script id="resora-v16-js">\n' + rd('v16/v16.js') + '\n' + rd('v16/native.js') + '\n</script>\n' + src[end:]

out = os.path.join(base, '..', 'Resora-Windows', 'index.html')
open(out, 'w', encoding='utf-8').write(src)
print('index.html written,', len(src), 'bytes')
