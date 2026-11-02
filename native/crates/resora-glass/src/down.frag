#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uHalfPixel;
uniform float uOffset;
out vec4 o;
void main() {
    vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
    vec4 sum = texture(uTex, uv) * 4.0;
    sum += texture(uTex, uv - uHalfPixel * uOffset);
    sum += texture(uTex, uv + uHalfPixel * uOffset);
    sum += texture(uTex, uv + vec2(uHalfPixel.x, -uHalfPixel.y) * uOffset);
    sum += texture(uTex, uv - vec2(uHalfPixel.x, -uHalfPixel.y) * uOffset);
    o = sum / 8.0;
}
