#version 300 es
precision highp float;
in vec2 vPx;
uniform vec4 uBox;
uniform float uRadius;
uniform float uSigma;
uniform float uOpacity;
out vec4 o;
float sd(vec2 p) {
    vec2 q = abs(p) - uBox.zw + uRadius;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
}
void main() {
    float d = sd(vPx - uBox.xy);
    float a = exp(-pow(max(d, 0.0) / (uSigma * 1.1), 2.0)) * uOpacity;
    a *= 1.0 - smoothstep(-uSigma * 0.6, 0.0, d) * 0.0;
    o = vec4(0.0, 0.0, 0.0, a);
}
