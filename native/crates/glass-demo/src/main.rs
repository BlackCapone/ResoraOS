//! Демо стекла Resora: рисует рабочий стол (обои, меню-бар, стеклянный док и панель управления) в PNG без монитора.
use khronos_egl as egl;
use resora_glass::{Glass, Renderer};
use std::rc::Rc;

const W: i32 = 1440;
const H: i32 = 900;
const ASSETS: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../assets");

fn load_png(path: &str) -> (i32, i32, Vec<u8>) {
    let img = image::open(path).unwrap_or_else(|e| panic!("{path}: {e}")).to_rgba8();
    (img.width() as i32, img.height() as i32, img.into_raw())
}

struct Fonts {
    regular: fontdue::Font,
    bold: fontdue::Font,
}

/// Текст → RGBA-картинка (цвет фиксированный, прозрачность = покрытие глифа).
fn text_image(font: &fontdue::Font, text: &str, px: f32, rgb: [u8; 3]) -> (i32, i32, Vec<u8>) {
    let lm = font.horizontal_line_metrics(px).unwrap();
    let ascent = lm.ascent.ceil();
    let height = (lm.ascent - lm.descent).ceil() as i32 + 2;
    let mut glyphs = vec![];
    let mut x = 0.0f32;
    for ch in text.chars() {
        let (m, bmp) = font.rasterize(ch, px);
        glyphs.push((x, m, bmp));
        x += m.advance_width;
    }
    let width = x.ceil() as i32 + 2;
    let mut buf = vec![0u8; (width * height * 4) as usize];
    for (gx, m, bmp) in glyphs {
        let ox = gx.round() as i32 + m.xmin;
        let oy = ascent as i32 - m.height as i32 - m.ymin;
        for yy in 0..m.height {
            for xx in 0..m.width {
                let a = bmp[yy * m.width + xx];
                let (px_, py_) = (ox + xx as i32, oy + yy as i32);
                if a == 0 || px_ < 0 || py_ < 0 || px_ >= width || py_ >= height {
                    continue;
                }
                let i = ((py_ * width + px_) * 4) as usize;
                if a > buf[i + 3] {
                    buf[i] = rgb[0];
                    buf[i + 1] = rgb[1];
                    buf[i + 2] = rgb[2];
                    buf[i + 3] = a;
                }
            }
        }
    }
    (width, height, buf)
}

fn text(r: &Renderer, font: &fontdue::Font, s: &str, px: f32, x: f32, y: f32, rgb: [u8; 3], opacity: f32) -> f32 {
    let (w, h, buf) = text_image(font, s, px, rgb);
    let tex = r.upload_rgba(w, h, &buf);
    r.draw_image(tex, x.round(), y.round(), w as f32, h as f32, opacity);
    w as f32
}

fn main() {
    // --- EGL без дисплея (программный Mesa) ---
    let lib = unsafe { egl::DynamicInstance::<egl::EGL1_4>::load_required_from_filename("libEGL.so.1") }.expect("libEGL");
    let display = unsafe { lib.get_display(egl::DEFAULT_DISPLAY) }.expect("display");
    lib.initialize(display).expect("egl init");
    let attrs = [egl::SURFACE_TYPE, egl::PBUFFER_BIT, egl::RENDERABLE_TYPE, egl::OPENGL_ES3_BIT,
                 egl::RED_SIZE, 8, egl::GREEN_SIZE, 8, egl::BLUE_SIZE, 8, egl::ALPHA_SIZE, 8, egl::NONE];
    let config = lib.choose_first_config(display, &attrs).unwrap().expect("config");
    lib.bind_api(egl::OPENGL_ES_API).unwrap();
    let ctx = lib.create_context(display, config, None, &[egl::CONTEXT_MAJOR_VERSION, 3, egl::CONTEXT_MINOR_VERSION, 0, egl::NONE]).expect("context");
    let surf = lib.create_pbuffer_surface(display, config, &[egl::WIDTH, 16, egl::HEIGHT, 16, egl::NONE]).expect("pbuffer");
    lib.make_current(display, Some(surf), Some(surf), Some(ctx)).unwrap();
    let gl = unsafe { glow::Context::from_loader_function(|s| lib.get_proc_address(s).map_or(std::ptr::null(), |p| p as *const _)) };
    let r = Renderer::new(Rc::new(gl), W, H);

    let fonts = Fonts {
        regular: fontdue::Font::from_bytes(std::fs::read(format!("{ASSETS}/Inter-Regular.otf")).unwrap(), fontdue::FontSettings::default()).unwrap(),
        bold: fontdue::Font::from_bytes(std::fs::read(format!("{ASSETS}/Inter-Bold.otf")).unwrap(), fontdue::FontSettings::default()).unwrap(),
    };
    let args: Vec<String> = std::env::args().collect();
    let out_path = args.get(1).cloned().unwrap_or_else(|| "glass.png".into());
    let refract: f32 = std::env::var("REFRACT").ok().and_then(|v| v.parse().ok()).unwrap_or(34.0);
    let frost: f32 = std::env::var("FROST").ok().and_then(|v| v.parse().ok()).unwrap_or(0.22);
    let only = std::env::var("ONLY").unwrap_or_default();
    let tint: f32 = std::env::var("TINT").ok().and_then(|v| v.parse().ok()).unwrap_or(0.04);
    let sat: f32 = std::env::var("SAT").ok().and_then(|v| v.parse().ok()).unwrap_or(1.3);

    // --- 1. фон ---
    let (ww, wh, wp) = load_png(&format!("{ASSETS}/wallpaper.png"));
    let wall = r.upload_rgba(ww, wh, &wp);
    r.bind(&r.scene, false);
    r.draw_image(wall, 0.0, 0.0, W as f32, H as f32, 1.0);

    // --- 2. размытие ---
    r.blur_scene(4, 1.6);

    // --- 3. кадр: копия сцены + тени + стекло ---
    r.bind(&r.out, false);
    r.blit_target(r.scene.tex);
    r.bind(&r.out, true);

    // док
    let names = ["finder", "launchpad", "safari", "messages", "mail", "maps", "photos", "facetime", "calendar", "reminders",
                 "notes", "terminal", "calculator", "weather", "tv", "music", "appstore", "settings", "|", "downloads", "trash"];
    let (icon, gap, pad_x, pad_y) = (50.0f32, 7.0f32, 14.0f32, 11.0f32);
    let n_icons = names.iter().filter(|n| **n != "|").count() as f32;
    let dock_w = n_icons * icon + (n_icons - 1.0) * gap + 2.0 * pad_x + 16.0;
    let dock_h = icon + 2.0 * pad_y;
    let dock = [(W as f32 - dock_w) / 2.0, H as f32 - dock_h - 10.0, dock_w, dock_h];

    // панель управления
    let (pw, ph) = (362.0f32, 482.0f32);
    let panel = [W as f32 - pw - 10.0, 36.0, pw, ph];

    let g_dock = Glass { radius: 28.0, refract, frost, saturation: sat, tint: [1.0, 1.0, 1.0, tint], ..Glass::regular() };
    let g_panel = Glass { radius: 30.0, refract: refract * 0.85, edge: 26.0, frost: (frost + 0.15).min(1.0), saturation: sat, tint: [1.0, 1.0, 1.0, tint * 1.2], ..Glass::regular() };

    if only != "panel" {
        r.draw_shadow(dock, 28.0, 14.0, 20.0, 0.30);
        r.draw_glass(dock, &g_dock);
    }
    if only != "dock" {
        r.draw_shadow(panel, 30.0, 18.0, 26.0, 0.32);
        r.draw_glass(panel, &g_panel);
    }

    // --- 4. содержимое ---
    // иконки дока
    if only != "panel" {
        let mut x = dock[0] + pad_x + 8.0;
        for n in names {
            if n == "|" {
                r.draw_fill([x + 1.0, dock[1] + 14.0, 1.5, dock[3] - 28.0], 0.75, [1.0, 1.0, 1.0, 0.45], 0.0);
                x += 12.0;
                continue;
            }
            let (iw, ih, buf) = load_png(&format!("{ASSETS}/icons/{n}.png"));
            let tex = r.upload_rgba(iw, ih, &buf);
            r.draw_image(tex, x, dock[1] + pad_y, icon, icon, 1.0);
            x += icon + gap;
        }
    }

    // панель: плитки — плоские заливки, не второе стекло
    if only != "dock" {
        let white = [255u8, 255, 255];
        let tile = [1.0f32, 1.0, 1.0, 0.15];
        let accent = [0.04f32, 0.48, 1.0, 1.0];
        let (px, py) = (panel[0], panel[1]);
        let mw = (pw - 24.0 - 10.0) / 2.0;
        let circle = |cx: f32, cy: f32, d: f32, on: bool| {
            r.draw_fill([cx, cy, d, d], d / 2.0, if on { accent } else { [1.0, 1.0, 1.0, 0.24] }, 0.25);
        };
        let mediums = [("Wi-Fi", "Atlantus", true), ("Bluetooth", "Вкл.", true), ("AirDrop", "Только контакты", true), ("Фокус", "Выкл.", false)];
        for (i, (t, s, on)) in mediums.iter().enumerate() {
            let (cx, cy) = (px + 12.0 + (i % 2) as f32 * (mw + 10.0), py + 12.0 + (i / 2) as f32 * 78.0);
            r.draw_fill([cx, cy, mw, 68.0], 22.0, tile, 0.35);
            circle(cx + 13.0, cy + 15.0, 38.0, *on);
            text(&r, &fonts.bold, t, 13.0, cx + 62.0, cy + 17.0, white, 1.0);
            text(&r, &fonts.regular, s, 11.5, cx + 62.0, cy + 36.0, white, 0.78);
        }
        let slider = |y: f32, label: &str, p: f32| {
            r.draw_fill([px + 12.0, y, pw - 24.0, 68.0], 22.0, tile, 0.35);
            text(&r, &fonts.bold, label, 12.5, px + 28.0, y + 10.0, white, 1.0);
            let (tx, ty, tw) = (px + 24.0, y + 30.0, pw - 48.0);
            r.draw_fill([tx, ty, tw, 30.0], 15.0, [1.0, 1.0, 1.0, 0.24], 0.0);
            r.draw_fill([tx, ty, 30.0 + (tw - 30.0) * p, 30.0], 15.0, [1.0, 1.0, 1.0, 0.96], 0.0);
        };
        slider(py + 12.0 + 156.0 + 0.0, "Дисплей", 0.75);
        slider(py + 12.0 + 156.0 + 78.0, "Звук", 0.60);
        // «Музыка»
        let my = py + 12.0 + 156.0 + 156.0;
        r.draw_fill([px + 12.0, my, pw - 24.0, 68.0], 22.0, tile, 0.35);
        let (iw, ih, buf) = load_png(&format!("{ASSETS}/icons/music.png"));
        let tex = r.upload_rgba(iw, ih, &buf);
        r.draw_image(tex, px + 24.0, my + 11.0, 46.0, 46.0, 1.0);
        text(&r, &fonts.bold, "Музыка", 13.0, px + 82.0, my + 17.0, white, 1.0);
        text(&r, &fonts.regular, "Не воспроизводится", 11.5, px + 82.0, my + 36.0, white, 0.78);
        // малые плитки
        let sw = (pw - 24.0 - 30.0) / 4.0;
        let sy = my + 78.0;
        for i in 0..4 {
            let cx = px + 12.0 + i as f32 * (sw + 10.0);
            r.draw_fill([cx, sy, sw, 68.0], 22.0, tile, 0.35);
            circle(cx + (sw - 40.0) / 2.0, sy + 14.0, 40.0, i == 0);
        }
        text(&r, &fonts.regular, "Изменить элементы…", 12.0, px + 20.0, sy + 80.0 - 2.0, white, 0.8);
    }

    // меню-бар: прозрачный, текст прямо на обоях
    let white = [255u8, 255, 255];
    let w1 = text(&r, &fonts.bold, "Finder", 13.0, 62.0, 6.0, white, 1.0);
    let mut x = 62.0 + w1 + 18.0;
    for item in ["Файл", "Правка", "Вид", "Переход", "Окно", "Справка"] {
        let w = text(&r, &fonts.regular, item, 13.0, x, 6.0, white, 1.0);
        x += w + 16.0;
    }
    let (iw, ih, buf) = load_png(&format!("{ASSETS}/icons/finder.png"));
    let _ = (iw, ih, buf);
    text(&r, &fonts.regular, "Пт 30 окт.  04:12", 13.0, W as f32 - 150.0, 6.0, white, 1.0);

    // --- 5. сохранить ---
    let pixels = r.read(&r.out);
    image::save_buffer(&out_path, &pixels, W as u32, H as u32, image::ColorType::Rgba8).unwrap();
    println!("saved {out_path}");
}
