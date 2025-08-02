attribute vec2 a_position;
attribute vec2 a_velocity;
attribute float a_life;
attribute float a_size;
attribute vec3 a_color;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_particleScale;

varying float v_life;
varying vec3 v_color;
varying float v_alpha;

void main() {
    // パーティクルの位置を時間と速度で更新
    vec2 position = a_position + a_velocity * u_time;
    
    // 画面端で折り返し
    position = mod(position, u_resolution);
    
    // 正規化された座標系に変換
    vec2 normalizedPos = (position / u_resolution) * 2.0 - 1.0;
    normalizedPos.y *= -1.0; // Y軸を反転
    
    gl_Position = vec4(normalizedPos, 0.0, 1.0);
    gl_PointSize = a_size * u_particleScale;
    
    // フラグメントシェーダーに渡す値
    v_life = a_life;
    v_color = a_color;
    v_alpha = smoothstep(0.0, 0.2, a_life) * smoothstep(1.0, 0.8, a_life);
}