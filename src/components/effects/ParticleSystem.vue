<template>
  <canvas 
    ref="canvasRef"
    class="particle-canvas"
    :class="{ 'reduced-motion': reduceMotion }"
    @webglcontextlost.prevent="handleContextLost"
    @webglcontextrestored="handleContextRestored"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

interface ParticleSystemProps {
  particleCount?: number
  colorPalette?: string[]
  intensity?: 'low' | 'medium' | 'high'
  speed?: number
  reduceMotion?: boolean
  enabled?: boolean
}

const props = withDefaults(defineProps<ParticleSystemProps>(), {
  particleCount: 200,
  colorPalette: () => ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'],
  intensity: 'medium',
  speed: 1.0,
  reduceMotion: false,
  enabled: true
})

const canvasRef = ref<HTMLCanvasElement>()
const animationId = ref<number>()
const startTime = ref<number>(0)

let gl: WebGLRenderingContext | null = null
let program: WebGLProgram | null = null
let particleBuffer: WebGLBuffer | null = null
let particles: Float32Array | null = null

// シェーダーソース
const vertexShaderSource = `
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
    vec2 position = a_position + a_velocity * u_time;
    position = mod(position, u_resolution);
    
    vec2 normalizedPos = (position / u_resolution) * 2.0 - 1.0;
    normalizedPos.y *= -1.0;
    
    gl_Position = vec4(normalizedPos, 0.0, 1.0);
    gl_PointSize = a_size * u_particleScale;
    
    v_life = a_life;
    v_color = a_color;
    v_alpha = smoothstep(0.0, 0.2, a_life) * smoothstep(1.0, 0.8, a_life);
}
`

const fragmentShaderSource = `
precision mediump float;

varying float v_life;
varying vec3 v_color;
varying float v_alpha;

uniform float u_time;

void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float distance = length(coord);
    
    if (distance > 0.5) {
        discard;
    }
    
    float alpha = 1.0 - smoothstep(0.0, 0.5, distance);
    alpha *= v_alpha;
    
    vec3 finalColor = v_color + sin(u_time * 2.0 + v_life * 10.0) * 0.1;
    
    gl_FragColor = vec4(finalColor, alpha);
}
`

// 強度に基づく設定
const intensitySettings = computed(() => {
  switch (props.intensity) {
    case 'low':
      return { scale: 0.5, alpha: 0.3, count: Math.floor(props.particleCount * 0.5) }
    case 'high':
      return { scale: 1.5, alpha: 0.8, count: Math.floor(props.particleCount * 1.5) }
    default:
      return { scale: 1.0, alpha: 0.6, count: props.particleCount }
  }
})

const createShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
  const shader = gl.createShader(type)
  if (!shader) return null

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('シェーダーコンパイルエラー:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }

  return shader
}

const createProgram = (gl: WebGLRenderingContext): WebGLProgram | null => {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)

  if (!vertexShader || !fragmentShader) return null

  const program = gl.createProgram()
  if (!program) return null

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('プログラムリンクエラー:', gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }

  return program
}

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result 
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
      ]
    : [1, 1, 1]
}

const initParticles = () => {
  if (!canvasRef.value) return

  const canvas = canvasRef.value
  const count = intensitySettings.value.count
  
  // 各パーティクルの属性: position(2) + velocity(2) + life(1) + size(1) + color(3)
  const particleSize = 9
  particles = new Float32Array(count * particleSize)

  for (let i = 0; i < count; i++) {
    const offset = i * particleSize
    
    // 位置 (0-canvas.width, 0-canvas.height)
    particles[offset] = Math.random() * canvas.width
    particles[offset + 1] = Math.random() * canvas.height
    
    // 速度 (-50 to 50 pixels per second)
    particles[offset + 2] = (Math.random() - 0.5) * 100 * props.speed
    particles[offset + 3] = (Math.random() - 0.5) * 100 * props.speed
    
    // ライフ (0.0 - 1.0)
    particles[offset + 4] = Math.random()
    
    // サイズ (2-8 pixels)
    particles[offset + 5] = 2 + Math.random() * 6
    
    // 色 (RGB)
    const color = hexToRgb(props.colorPalette[Math.floor(Math.random() * props.colorPalette.length)])
    particles[offset + 6] = color[0]
    particles[offset + 7] = color[1]
    particles[offset + 8] = color[2]
  }
}

const setupWebGL = () => {
  if (!canvasRef.value) return false

  const canvas = canvasRef.value
  gl = canvas.getContext('webgl', { 
    alpha: true, 
    premultipliedAlpha: false,
    antialias: true 
  })

  if (!gl) {
    console.warn('WebGLがサポートされていません')
    return false
  }

  program = createProgram(gl)
  if (!program) return false

  // バッファを作成
  particleBuffer = gl.createBuffer()
  if (!particleBuffer) return false

  // パーティクルデータを初期化
  initParticles()

  if (!particles) return false

  // バッファにデータをアップロード
  gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, particles, gl.DYNAMIC_DRAW)

  // 属性の設定
  const particleSize = 9 * 4 // 9 floats * 4 bytes per float

  // 位置
  const positionLocation = gl.getAttribLocation(program, 'a_position')
  gl.enableVertexAttribArray(positionLocation)
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, particleSize, 0)

  // 速度
  const velocityLocation = gl.getAttribLocation(program, 'a_velocity')
  gl.enableVertexAttribArray(velocityLocation)
  gl.vertexAttribPointer(velocityLocation, 2, gl.FLOAT, false, particleSize, 8)

  // ライフ
  const lifeLocation = gl.getAttribLocation(program, 'a_life')
  gl.enableVertexAttribArray(lifeLocation)
  gl.vertexAttribPointer(lifeLocation, 1, gl.FLOAT, false, particleSize, 16)

  // サイズ
  const sizeLocation = gl.getAttribLocation(program, 'a_size')
  gl.enableVertexAttribArray(sizeLocation)
  gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, particleSize, 20)

  // 色
  const colorLocation = gl.getAttribLocation(program, 'a_color')
  gl.enableVertexAttribArray(colorLocation)
  gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, particleSize, 24)

  // ブレンディングを有効化
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  return true
}

const resizeCanvas = () => {
  if (!canvasRef.value || !gl) return

  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const pixelRatio = window.devicePixelRatio || 1

  canvas.width = rect.width * pixelRatio
  canvas.height = rect.height * pixelRatio

  gl.viewport(0, 0, canvas.width, canvas.height)
}

const render = (currentTime: number) => {
  if (!gl || !program || !props.enabled || props.reduceMotion) {
    if (props.enabled && !props.reduceMotion) {
      animationId.value = requestAnimationFrame(render)
    }
    return
  }

  if (startTime.value === 0) {
    startTime.value = currentTime
  }

  const elapsedTime = (currentTime - startTime.value) / 1000 // 秒に変換

  // クリア
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  // プログラムを使用
  gl.useProgram(program)

  // ユニフォームを設定
  const timeLocation = gl.getUniformLocation(program, 'u_time')
  gl.uniform1f(timeLocation, elapsedTime)

  const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
  gl.uniform2f(resolutionLocation, canvasRef.value!.width, canvasRef.value!.height)

  const scaleLocation = gl.getUniformLocation(program, 'u_particleScale')
  gl.uniform1f(scaleLocation, intensitySettings.value.scale)

  // パーティクルを描画
  gl.drawArrays(gl.POINTS, 0, intensitySettings.value.count)

  animationId.value = requestAnimationFrame(render)
}

const startAnimation = () => {
  if (animationId.value) return
  startTime.value = 0
  animationId.value = requestAnimationFrame(render)
}

const stopAnimation = () => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
    animationId.value = undefined
  }
}

const handleContextLost = () => {
  console.warn('WebGLコンテキストが失われました')
  stopAnimation()
}

const handleContextRestored = () => {
  console.info('WebGLコンテキストが復元されました')
  if (setupWebGL()) {
    startAnimation()
  }
}

// リサイズ監視
const resizeObserver = new ResizeObserver(() => {
  resizeCanvas()
  initParticles()
  if (gl && particleBuffer && particles) {
    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, particles, gl.DYNAMIC_DRAW)
  }
})

watch(() => props.enabled, (enabled) => {
  if (enabled && !props.reduceMotion) {
    startAnimation()
  } else {
    stopAnimation()
  }
})

watch(() => props.reduceMotion, (reduced) => {
  if (reduced) {
    stopAnimation()
  } else if (props.enabled) {
    startAnimation()
  }
})

onMounted(() => {
  if (!canvasRef.value) return

  resizeObserver.observe(canvasRef.value)
  resizeCanvas()

  if (setupWebGL()) {
    if (props.enabled && !props.reduceMotion) {
      startAnimation()
    }
  }
})

onUnmounted(() => {
  stopAnimation()
  resizeObserver.disconnect()
  
  if (gl) {
    if (particleBuffer) gl.deleteBuffer(particleBuffer)
    if (program) gl.deleteProgram(program)
  }
})
</script>

<style scoped>
.particle-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  opacity: 0.6;
  transition: opacity 0.3s ease;
}

.particle-canvas.reduced-motion {
  opacity: 0.2;
}

@media (prefers-reduced-motion: reduce) {
  .particle-canvas {
    opacity: 0.1;
    animation: none;
  }
}

/* パフォーマンス最適化 */
.particle-canvas {
  will-change: transform;
  transform: translateZ(0);
}
</style>