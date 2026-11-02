#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uHalfPixel;
uniform float uOffset;
out vec4 o;
void main() {
    vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
    vec2 h = uHalfPixel * uOffset;
    vec4 sum = texture(uTex, uv + vec2(-h.x * 2.0, 0.0));
    sum += texture(uTex, uv + vec2(-h.x, h.y)) * 2.0;
    sum += texture(uTex, uv + vec2(0.0, h.y * 2.0));
    sum += texture(uTex, uv + vec2(h.x, h.y)) * 2.0;
    sum += texture(uTex, uv + vec2(h.x * 2.0, 0.0));
    sum += texture(uTex, uv + vec2(h.x, -h.y)) * 2.0;
    sum += texture(uTex, uv + vec2(0.0, -h.y * 2.0));
    sum += texture(uTex, uv + vec2(-h.x, -h.y)) * 2.0;
    o = sum / 12.0;
}
