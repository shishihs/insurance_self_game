precision mediump float;

varying float v_life;
varying vec3 v_color;
varying float v_alpha;

uniform float u_time;

void main() {
    // 円形のパーティクルを作成
    vec2 coord = gl_PointCoord - vec2(0.5);
    float distance = length(coord);
    
    if (distance > 0.5) {
        discard;
    }
    
    // パーティクルの中心から外側への透明度グラデーション
    float alpha = 1.0 - smoothstep(0.0, 0.5, distance);
    alpha *= v_alpha;
    
    // 色にわずかな輝度変化を追加
    vec3 finalColor = v_color + sin(u_time * 2.0 + v_life * 10.0) * 0.1;
    
    gl_FragColor = vec4(finalColor, alpha);
}