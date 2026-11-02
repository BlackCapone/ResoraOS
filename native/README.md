# Resora native: настоящее «жидкое стекло» на GPU

Здесь начинается нативная Resora без браузера: собственный рендерер стекла на OpenGL ES.
`crates/resora-glass` — библиотека (размытие dual Kawase, преломление края как у линзы, хроматическая дисперсия, блики,
тени, плоские плитки). `crates/glass-demo` — рисует рабочий стол (обои, док, панель управления, меню-бар) в PNG без монитора.

Запуск (нужны Rust и Mesa): `EGL_PLATFORM=surfaceless cargo run --release -p glass-demo -- out.png`
Параметры через переменные: `REFRACT` (сила линзы, px), `FROST` (размытие 0..1), `TINT`, `SAT`, `ONLY=dock|panel`.

Дальше: композитор (Wayland) с этим шейдером, нативные док и меню-бар, дистрибутив на Buildroot.
