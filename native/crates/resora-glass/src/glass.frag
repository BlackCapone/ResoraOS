#version 300 es
precision highp float;
in vec2 vPx;
uniform sampler2D uScene;
uniform sampler2D uBlur;
uniform vec2 uRes;
uniform vec4 uBox;       // центр, полуразмеры
uniform float uRadius;
uniform float uRefract;
uniform float uEdge;
uniform float uDispersion;
uniform float uFrost;
uniform float uSat;
uniform float uBright;
uniform vec4 uTint;
uniform float uSpec;
uniform float uGlow;
out vec4 o;

float sd(vec2 p) {
    vec2 q = abs(p) - uBox.zw + uRadius;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
}
vec3 backdrop(vec2 px) {
    vec2 uv = clamp(vec2(px.x / uRes.x, 1.0 - px.y / uRes.y), 0.001, 0.999);
    return mix(texture(uScene, uv).rgb, texture(uBlur, uv).rgb, uFrost);
}
void main() {
    vec2 p = vPx - uBox.xy;
    float d = sd(p);
    float cov = 1.0 - smoothstep(-0.7, 0.7, d);
    if (cov <= 0.0) { o = vec4(0.0); return; }
    float inside = max(-d, 0.0);

    // нормаль к краю (наружу)
    float e = 0.75;
    vec2 n = normalize(vec2(sd(p + vec2(e, 0.0)) - sd(p - vec2(e, 0.0)),
                            sd(p + vec2(0.0, e)) - sd(p - vec2(0.0, e))) + 1e-6);

    // профиль линзы: сильнее всего у кромки, затухает вглубь
    float t = clamp(inside / uEdge, 0.0, 1.0);
    float lens = pow(1.0 - t, 2.4);
    vec2 shift = -n * uRefract * lens;           // берём цвет из глубины фигуры: край «втягивает» фон

    vec3 c;
    c.r = backdrop(vPx + shift * (1.0 - uDispersion * 2.0)).r;
    c.g = backdrop(vPx + shift).g;
    c.b = backdrop(vPx + shift * (1.0 + uDispersion * 2.0)).b;

    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(vec3(lum), c, uSat) * uBright;
    c = mix(c, uTint.rgb, uTint.a);

    // блик по кромке: ярче со стороны источника (сверху-слева), слабее с противоположной
    vec2 L = normalize(vec2(-0.55, -0.85));
    float facing = dot(n, L);
    float band = exp(-pow(inside / 1.35, 2.0));
    float band2 = exp(-pow(inside / 3.2, 2.0));
    float spec = band * (0.30 + 0.70 * max(facing, 0.0)) + band * 0.35 * max(-facing, 0.0) + band2 * 0.10 * max(facing, 0.0);
    c += vec3(1.0) * spec * uSpec;

    // свечение по краю изнутри
    c += vec3(1.0) * pow(1.0 - t, 3.0) * uGlow * (0.55 + 0.45 * max(facing, 0.0));

    // тонкий тёмный контур снаружи кромки для отделения от фона
    float outline = exp(-pow((inside - 0.0) / 0.9, 2.0)) * 0.06;
    c *= 1.0 - outline;

    o = vec4(clamp(c, 0.0, 1.0) * cov, cov);
}
