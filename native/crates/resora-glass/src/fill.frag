#version 300 es
precision highp float;
in vec2 vPx;
uniform vec4 uBox;
uniform float uRadius;
uniform vec4 uColor;
uniform float uRim;
out vec4 o;
float sd(vec2 p) {
    vec2 q = abs(p) - uBox.zw + uRadius;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
}
void main() {
    vec2 p = vPx - uBox.xy;
    float d = sd(p);
    float cov = 1.0 - smoothstep(-0.7, 0.7, d);
    float inside = max(-d, 0.0);
    // тонкая светлая кромка сверху-слева: плитка — заливка, а не второе стекло
    float rim = exp(-inside * inside / 2.2) * uRim * clamp(0.55 - 0.45 * dot(normalize(p + 1e-4), vec2(0.6, 0.8)), 0.0, 1.0);
    vec4 c = uColor;
    c.rgb += vec3(rim);
    c.a = clamp(c.a + rim * 0.4, 0.0, 1.0);
    o = vec4(c.rgb * c.a, c.a) * cov;
}
