//! Рендерер «жидкого стекла» Resora на OpenGL ES 3.0.
//! Этапы кадра: фон → размытие (dual Kawase) → стекло (преломление, дисперсия, блики) → содержимое.
use glow::HasContext;
use std::collections::HashMap;
use std::rc::Rc;

const VERT: &str = include_str!("quad.vert");

pub struct Target {
    pub fbo: glow::Framebuffer,
    pub tex: glow::Texture,
    pub w: i32,
    pub h: i32,
}

/// Параметры материала стекла.
#[derive(Clone, Copy)]
pub struct Glass {
    pub radius: f32,
    /// Сила преломления у края, px.
    pub refract: f32,
    /// Ширина зоны линзы от края внутрь, px.
    pub edge: f32,
    /// Хроматическая дисперсия (0 — нет).
    pub dispersion: f32,
    /// 0 — фон чёткий, 1 — максимально размытый.
    pub frost: f32,
    pub saturation: f32,
    pub brightness: f32,
    /// rgb + сила подкраски.
    pub tint: [f32; 4],
    pub specular: f32,
    pub glow: f32,
}

impl Glass {
    /// Светлое стекло для дока и панелей.
    pub fn regular() -> Self {
        Glass { radius: 28.0, refract: 26.0, edge: 22.0, dispersion: 0.035, frost: 0.55, saturation: 1.55,
                brightness: 1.06, tint: [1.0, 1.0, 1.0, 0.10], specular: 1.0, glow: 0.22 }
    }
}

pub struct Renderer {
    pub gl: Rc<glow::Context>,
    pub w: i32,
    pub h: i32,
    vao: glow::VertexArray,
    progs: HashMap<&'static str, glow::Program>,
    pub scene: Target,
    pub out: Target,
    blur: Vec<Target>,
    pub blurred: glow::Texture,
}

unsafe fn compile(gl: &glow::Context, vs: &str, fs: &str) -> glow::Program {
    let p = gl.create_program().unwrap();
    let mut shaders = vec![];
    for (kind, src) in [(glow::VERTEX_SHADER, vs), (glow::FRAGMENT_SHADER, fs)] {
        let s = gl.create_shader(kind).unwrap();
        gl.shader_source(s, src);
        gl.compile_shader(s);
        if !gl.get_shader_compile_status(s) {
            panic!("shader error: {}\n{}", gl.get_shader_info_log(s), src);
        }
        gl.attach_shader(p, s);
        shaders.push(s);
    }
    gl.link_program(p);
    if !gl.get_program_link_status(p) {
        panic!("link error: {}", gl.get_program_info_log(p));
    }
    for s in shaders {
        gl.delete_shader(s);
    }
    p
}

unsafe fn make_target(gl: &glow::Context, w: i32, h: i32) -> Target {
    let tex = gl.create_texture().unwrap();
    gl.bind_texture(glow::TEXTURE_2D, Some(tex));
    gl.tex_image_2d(glow::TEXTURE_2D, 0, glow::RGBA8 as i32, w, h, 0, glow::RGBA, glow::UNSIGNED_BYTE, None);
    gl.tex_parameter_i32(glow::TEXTURE_2D, glow::TEXTURE_MIN_FILTER, glow::LINEAR as i32);
    gl.tex_parameter_i32(glow::TEXTURE_2D, glow::TEXTURE_MAG_FILTER, glow::LINEAR as i32);
    gl.tex_parameter_i32(glow::TEXTURE_2D, glow::TEXTURE_WRAP_S, glow::CLAMP_TO_EDGE as i32);
    gl.tex_parameter_i32(glow::TEXTURE_2D, glow::TEXTURE_WRAP_T, glow::CLAMP_TO_EDGE as i32);
    let fbo = gl.create_framebuffer().unwrap();
    gl.bind_framebuffer(glow::FRAMEBUFFER, Some(fbo));
    gl.framebuffer_texture_2d(glow::FRAMEBUFFER, glow::COLOR_ATTACHMENT0, glow::TEXTURE_2D, Some(tex), 0);
    Target { fbo, tex, w, h }
}

impl Renderer {
    pub fn new(gl: Rc<glow::Context>, w: i32, h: i32) -> Self {
        unsafe {
            let vao = gl.create_vertex_array().unwrap();
            gl.bind_vertex_array(Some(vao));
            let vbo = gl.create_buffer().unwrap();
            gl.bind_buffer(glow::ARRAY_BUFFER, Some(vbo));
            let quad: [f32; 12] = [0., 0., 1., 0., 0., 1., 1., 0., 1., 1., 0., 1.];
            let bytes: Vec<u8> = quad.iter().flat_map(|f| f.to_le_bytes()).collect();
            gl.buffer_data_u8_slice(glow::ARRAY_BUFFER, &bytes, glow::STATIC_DRAW);
            gl.enable_vertex_attrib_array(0);
            gl.vertex_attrib_pointer_f32(0, 2, glow::FLOAT, false, 8, 0);

            let mut progs = HashMap::new();
            progs.insert("tex", compile(&gl, VERT, include_str!("tex.frag")));
            progs.insert("down", compile(&gl, VERT, include_str!("down.frag")));
            progs.insert("up", compile(&gl, VERT, include_str!("up.frag")));
            progs.insert("glass", compile(&gl, VERT, include_str!("glass.frag")));
            progs.insert("shadow", compile(&gl, VERT, include_str!("shadow.frag")));
            progs.insert("fill", compile(&gl, VERT, include_str!("fill.frag")));

            let scene = make_target(&gl, w, h);
            let out = make_target(&gl, w, h);
            let mut blur = vec![];
            let (mut bw, mut bh) = (w, h);
            for _ in 0..5 {
                bw = (bw / 2).max(1);
                bh = (bh / 2).max(1);
                blur.push(make_target(&gl, bw, bh));
            }
            let blurred = blur[0].tex;
            Renderer { gl, w, h, vao, progs, scene, out, blur, blurred }
        }
    }

    pub fn upload_rgba(&self, w: i32, h: i32, rgba: &[u8]) -> glow::Texture {
        unsafe {
            let gl = &self.gl;
            let tex = gl.create_texture().unwrap();
            gl.bind_texture(glow::TEXTURE_2D, Some(tex));
            gl.tex_image_2d(glow::TEXTURE_2D, 0, glow::RGBA8 as i32, w, h, 0, glow::RGBA, glow::UNSIGNED_BYTE, Some(rgba));
            gl.tex_parameter_i32(glow::TEXTURE_2D, glow::TEXTURE_MIN_FILTER, glow::LINEAR as i32);
            gl.tex_parameter_i32(glow::TEXTURE_2D, glow::TEXTURE_MAG_FILTER, glow::LINEAR as i32);
            gl.tex_parameter_i32(glow::TEXTURE_2D, glow::TEXTURE_WRAP_S, glow::CLAMP_TO_EDGE as i32);
            gl.tex_parameter_i32(glow::TEXTURE_2D, glow::TEXTURE_WRAP_T, glow::CLAMP_TO_EDGE as i32);
            tex
        }
    }

    fn use_prog(&self, name: &str, bounds: [f32; 4], res: [f32; 2]) -> glow::Program {
        let p = self.progs[name];
        unsafe {
            self.gl.use_program(Some(p));
            self.gl.bind_vertex_array(Some(self.vao));
            self.gl.uniform_4_f32(self.gl.get_uniform_location(p, "uBounds").as_ref(), bounds[0], bounds[1], bounds[2], bounds[3]);
            self.gl.uniform_2_f32(self.gl.get_uniform_location(p, "uRes").as_ref(), res[0], res[1]);
        }
        p
    }

    fn u1(&self, p: glow::Program, n: &str, v: f32) {
        unsafe { self.gl.uniform_1_f32(self.gl.get_uniform_location(p, n).as_ref(), v) }
    }
    fn u2(&self, p: glow::Program, n: &str, a: f32, b: f32) {
        unsafe { self.gl.uniform_2_f32(self.gl.get_uniform_location(p, n).as_ref(), a, b) }
    }
    fn u4(&self, p: glow::Program, n: &str, v: [f32; 4]) {
        unsafe { self.gl.uniform_4_f32(self.gl.get_uniform_location(p, n).as_ref(), v[0], v[1], v[2], v[3]) }
    }
    fn tex_unit(&self, p: glow::Program, n: &str, unit: u32, tex: glow::Texture) {
        unsafe {
            self.gl.active_texture(glow::TEXTURE0 + unit);
            self.gl.bind_texture(glow::TEXTURE_2D, Some(tex));
            self.gl.uniform_1_i32(self.gl.get_uniform_location(p, n).as_ref(), unit as i32);
        }
    }

    pub fn bind(&self, t: &Target, blend: bool) {
        unsafe {
            self.gl.bind_framebuffer(glow::FRAMEBUFFER, Some(t.fbo));
            self.gl.viewport(0, 0, t.w, t.h);
            if blend {
                self.gl.enable(glow::BLEND);
                self.gl.blend_func(glow::ONE, glow::ONE_MINUS_SRC_ALPHA);
            } else {
                self.gl.disable(glow::BLEND);
            }
        }
    }

    fn draw(&self) {
        unsafe { self.gl.draw_arrays(glow::TRIANGLES, 0, 6) }
    }

    /// Текстура-картинка (строки сверху вниз) в прямоугольник; opacity — общая прозрачность.
    pub fn draw_image(&self, tex: glow::Texture, x: f32, y: f32, w: f32, h: f32, opacity: f32) {
        let p = self.use_prog("tex", [x, y, w, h], [self.w as f32, self.h as f32]);
        self.tex_unit(p, "uTex", 0, tex);
        self.u1(p, "uFlip", 0.0);
        self.u1(p, "uOpacity", opacity);
        self.draw();
    }

    /// Копирует текстуру цели (ориентация FBO) во весь кадр без смешивания.
    pub fn blit_target(&self, tex: glow::Texture) {
        let p = self.use_prog("tex", [0.0, 0.0, self.w as f32, self.h as f32], [self.w as f32, self.h as f32]);
        self.tex_unit(p, "uTex", 0, tex);
        self.u1(p, "uFlip", 1.0);
        self.u1(p, "uOpacity", 1.0);
        self.draw();
    }

    /// Размытие сцены (dual Kawase): результат в `self.blurred`.
    pub fn blur_scene(&self, levels: usize, offset: f32) {
        let levels = levels.min(self.blur.len());
        let mut src = self.scene.tex;
        unsafe { self.gl.disable(glow::BLEND) };
        for i in 0..levels {
            let t = &self.blur[i];
            self.bind(t, false);
            let p = self.use_prog("down", [0.0, 0.0, t.w as f32, t.h as f32], [t.w as f32, t.h as f32]);
            self.tex_unit(p, "uTex", 0, src);
            self.u2(p, "uHalfPixel", 0.5 / t.w as f32, 0.5 / t.h as f32);
            self.u1(p, "uOffset", offset);
            self.draw();
            src = t.tex;
        }
        for i in (0..levels.saturating_sub(1)).rev() {
            let t = &self.blur[i];
            self.bind(t, false);
            let p = self.use_prog("up", [0.0, 0.0, t.w as f32, t.h as f32], [t.w as f32, t.h as f32]);
            self.tex_unit(p, "uTex", 0, src);
            self.u2(p, "uHalfPixel", 0.5 / t.w as f32, 0.5 / t.h as f32);
            self.u1(p, "uOffset", offset);
            self.draw();
            src = t.tex;
        }
    }

    /// Мягкая тень скруглённого прямоугольника.
    pub fn draw_shadow(&self, rect: [f32; 4], radius: f32, dy: f32, sigma: f32, opacity: f32) {
        let m = sigma * 3.0 + 4.0;
        let b = [rect[0] - m, rect[1] - m + dy, rect[2] + 2.0 * m, rect[3] + 2.0 * m];
        let p = self.use_prog("shadow", b, [self.w as f32, self.h as f32]);
        self.u4(p, "uBox", [rect[0] + rect[2] / 2.0, rect[1] + rect[3] / 2.0 + dy, rect[2] / 2.0, rect[3] / 2.0]);
        self.u1(p, "uRadius", radius);
        self.u1(p, "uSigma", sigma);
        self.u1(p, "uOpacity", opacity);
        self.draw();
    }

    /// Плоская скруглённая заливка с тонкой внутренней кромкой (плитки внутри стеклянной панели).
    pub fn draw_fill(&self, rect: [f32; 4], radius: f32, color: [f32; 4], rim: f32) {
        let b = [rect[0] - 2.0, rect[1] - 2.0, rect[2] + 4.0, rect[3] + 4.0];
        let p = self.use_prog("fill", b, [self.w as f32, self.h as f32]);
        self.u4(p, "uBox", [rect[0] + rect[2] / 2.0, rect[1] + rect[3] / 2.0, rect[2] / 2.0, rect[3] / 2.0]);
        self.u1(p, "uRadius", radius);
        self.u4(p, "uColor", color);
        self.u1(p, "uRim", rim);
        self.draw();
    }

    /// Стекло: читает `scene` и `blurred`, рисует в текущую цель.
    pub fn draw_glass(&self, rect: [f32; 4], g: &Glass) {
        let b = [rect[0] - 2.0, rect[1] - 2.0, rect[2] + 4.0, rect[3] + 4.0];
        let p = self.use_prog("glass", b, [self.w as f32, self.h as f32]);
        self.tex_unit(p, "uScene", 0, self.scene.tex);
        self.tex_unit(p, "uBlur", 1, self.blurred);
        self.u4(p, "uBox", [rect[0] + rect[2] / 2.0, rect[1] + rect[3] / 2.0, rect[2] / 2.0, rect[3] / 2.0]);
        self.u1(p, "uRadius", g.radius);
        self.u1(p, "uRefract", g.refract);
        self.u1(p, "uEdge", g.edge);
        self.u1(p, "uDispersion", g.dispersion);
        self.u1(p, "uFrost", g.frost);
        self.u1(p, "uSat", g.saturation);
        self.u1(p, "uBright", g.brightness);
        self.u4(p, "uTint", g.tint);
        self.u1(p, "uSpec", g.specular);
        self.u1(p, "uGlow", g.glow);
        self.draw();
    }

    /// Пиксели цели, строки сверху вниз.
    pub fn read(&self, t: &Target) -> Vec<u8> {
        let mut buf = vec![0u8; (t.w * t.h * 4) as usize];
        unsafe {
            self.gl.bind_framebuffer(glow::FRAMEBUFFER, Some(t.fbo));
            self.gl.read_pixels(0, 0, t.w, t.h, glow::RGBA, glow::UNSIGNED_BYTE, glow::PixelPackData::Slice(&mut buf));
        }
        let row = (t.w * 4) as usize;
        let mut out = vec![0u8; buf.len()];
        for y in 0..t.h as usize {
            let src = (t.h as usize - 1 - y) * row;
            out[y * row..(y + 1) * row].copy_from_slice(&buf[src..src + row]);
        }
        out
    }
}
