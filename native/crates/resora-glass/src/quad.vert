#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
uniform vec4 uBounds;
uniform vec2 uRes;
out vec2 vPx;
out vec2 vUv;
void main() {
    vec2 px = uBounds.xy + aPos * uBounds.zw;
    vPx = px;
    vUv = aPos;
    vec2 ndc = (px / uRes * 2.0 - 1.0) * vec2(1.0, -1.0);
    gl_Position = vec4(ndc, 0.0, 1.0);
}
