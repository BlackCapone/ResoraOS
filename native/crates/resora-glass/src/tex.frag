#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform float uFlip;
uniform float uOpacity;
out vec4 o;
void main() {
    vec2 uv = vec2(vUv.x, mix(vUv.y, 1.0 - vUv.y, uFlip));
    vec4 c = texture(uTex, uv);
    o = vec4(c.rgb * c.a, c.a) * uOpacity;   // картинки — с непрямой альфой, переводим в premultiplied
    if (uFlip > 0.5) o = vec4(c.rgb, 1.0);   // копия цели — непрозрачная
}
