<template>
  <canvas 
    ref="canvasRef"
    class="shader-canvas"
    :class="{ 'interactive': interactive }"
    @webglcontextlost.prevent="handleContextLost"
    @webglcontextrestored="handleContextRestored"
    @mousemove="handleMouseMove"
    @click="handleClick"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

interface ShaderEffectProps {
  effect?: 'waves' | 'plasma' | 'noise' | 'distortion' | 'ripple' | 'mandelbrot'
  interactive?: boolean
  intensity?: number
  speed?: number
  colors?: string[]
  resolution?: number
  reduceMotion?: boolean
}

const props = withDefaults(defineProps<ShaderEffectProps>(), {
  effect: 'waves',
  interactive: true,
  intensity: 1.0,
  speed: 1.0,
  colors: () => ['#667eea', '#764ba2', '#f093fb', '#f5576c'],
  resolution: 1.0,
  reduceMotion: false
})

const canvasRef = ref<HTMLCanvasElement>()
const animationId = ref<number>()
const startTime = ref<number>(0)
const mouseX = ref(0.5)
const mouseY = ref(0.5)
const clickX = ref(0.5)
const clickY = ref(0.5)
const clickTime = ref(0)

let gl: WebGLRenderingContext | null = null
let program: WebGLProgram | null = null
let positionBuffer: WebGLBuffer | null = null

// 基本頂点シェーダー
const vertexShaderSource = `
attribute vec2 a_position;
varying vec2 v_texCoord;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = (a_position + 1.0) / 2.0;
}
`

// エフェクト別フラグメントシェーダー
const getFragmentShader = () => {
  const baseUniforms = `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform vec2 u_click;
    uniform float u_clickTime;
    uniform float u_intensity;
    uniform float u_speed;
    uniform vec3 u_color1;
    uniform vec3 u_color2;
    uniform vec3 u_color3;
    uniform vec3 u_color4;
  `

  switch (props.effect) {
    case 'waves':
      return `${baseUniforms  }
        void main() {
            vec2 uv = v_texCoord;
            float time = u_time * u_speed;
            
            // 複数の波の合成
            float wave1 = sin(uv.x * 10.0 + time) * 0.1;
            float wave2 = sin(uv.y * 8.0 + time * 1.5) * 0.1;
            float wave3 = sin((uv.x + uv.y) * 6.0 + time * 0.8) * 0.05;
            
            uv.y += wave1 + wave2 + wave3;
            uv.x += wave2 * 0.5;
            
            // グラデーション色の計算
            float factor = (uv.x + uv.y + sin(time * 0.5)) * 0.5;
            vec3 color = mix(
                mix(u_color1, u_color2, uv.x),
                mix(u_color3, u_color4, uv.x),
                uv.y
            );
            
            // 輝度の調整
            color *= 1.0 + sin(factor * 3.14159) * 0.3 * u_intensity;
            
            gl_FragColor = vec4(color, 1.0);
        }
      `
      
    case 'plasma':
      return `${baseUniforms  }
        void main() {
            vec2 uv = v_texCoord;
            float time = u_time * u_speed;
            
            // プラズマ効果
            float plasma = sin(uv.x * 10.0 + time);
            plasma += sin(uv.y * 10.0 + time * 1.5);
            plasma += sin((uv.x + uv.y) * 10.0 + time * 2.0);
            plasma += sin(sqrt(uv.x * uv.x + uv.y * uv.y) * 10.0 + time * 3.0);
            plasma *= 0.25;
            
            // カラーマッピング
            vec3 color1 = u_color1 * (0.5 + 0.5 * sin(plasma + 0.0));
            vec3 color2 = u_color2 * (0.5 + 0.5 * sin(plasma + 2.094));
            vec3 color3 = u_color3 * (0.5 + 0.5 * sin(plasma + 4.188));
            
            vec3 finalColor = (color1 + color2 + color3) * u_intensity;
            
            gl_FragColor = vec4(finalColor, 1.0);
        }
      `
      
    case 'noise':
      return `${baseUniforms  }
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }
        
        float noise(vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);
            
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));
            
            vec2 u = f * f * (3.0 - 2.0 * f);
            
            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        
        void main() {
            vec2 uv = v_texCoord * 8.0;
            float time = u_time * u_speed;
            
            float n = noise(uv + time * 0.5);
            n += noise(uv * 2.0 + time * 0.3) * 0.5;
            n += noise(uv * 4.0 + time * 0.2) * 0.25;
            n /= 1.75;
            
            vec3 color = mix(
                mix(u_color1, u_color2, n),
                mix(u_color3, u_color4, n),
                smoothstep(0.0, 1.0, n)
            );
            
            color *= u_intensity;
            
            gl_FragColor = vec4(color, 1.0);
        }
      `
      
    case 'ripple':
      return `${baseUniforms  }
        void main() {
            vec2 uv = v_texCoord;
            float time = u_time * u_speed;
            
            // クリック位置からの距離
            float dist = distance(uv, u_click);
            
            // リップル効果
            float ripple = sin(dist * 20.0 - (time - u_clickTime) * 10.0) * 
                          exp(-(time - u_clickTime) * 2.0) * 
                          exp(-dist * 5.0);
            
            // マウス位置からの影響
            float mouseDist = distance(uv, u_mouse);
            float mouseEffect = exp(-mouseDist * 3.0) * 0.2;
            
            // ベースカラー
            vec3 color = mix(
                mix(u_color1, u_color2, uv.x),
                mix(u_color3, u_color4, uv.x),
                uv.y
            );
            
            // エフェクトの合成
            color += ripple * u_intensity * 0.5;
            color += mouseEffect * u_intensity;
            
            gl_FragColor = vec4(color, 1.0);
        }
      `
      
    default:
      return `${baseUniforms  }
        void main() {
            vec2 uv = v_texCoord;
            vec3 color = mix(u_color1, u_color2, uv.x);
            gl_FragColor = vec4(color, 1.0);
        }
      `
  }
}

// 色をRGBに変換
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
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, getFragmentShader())

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

  // 全画面を覆う四角形の頂点
  const positions = [
    -1, -1,
     1, -1,
    -1,  1,
     1,  1,
  ]

  positionBuffer = gl.createBuffer()
  if (!positionBuffer) return false

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

  const positionLocation = gl.getAttribLocation(program, 'a_position')
  gl.enableVertexAttribArray(positionLocation)
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

  return true
}

const resizeCanvas = () => {
  if (!canvasRef.value || !gl) return

  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const pixelRatio = Math.min(window.devicePixelRatio || 1, props.resolution * 2)

  canvas.width = rect.width * pixelRatio
  canvas.height = rect.height * pixelRatio

  gl.viewport(0, 0, canvas.width, canvas.height)
}

const render = (currentTime: number) => {
  if (!gl || !program || props.reduceMotion) {
    if (!props.reduceMotion) {
      animationId.value = requestAnimationFrame(render)
    }
    return
  }

  if (startTime.value === 0) {
    startTime.value = currentTime
  }

  const elapsedTime = (currentTime - startTime.value) / 1000

  gl.useProgram(program)

  // ユニフォームの設定
  const timeLocation = gl.getUniformLocation(program, 'u_time')
  gl.uniform1f(timeLocation, elapsedTime)

  const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
  gl.uniform2f(resolutionLocation, canvasRef.value!.width, canvasRef.value!.height)

  const mouseLocation = gl.getUniformLocation(program, 'u_mouse')
  gl.uniform2f(mouseLocation, mouseX.value, 1.0 - mouseY.value)

  const clickLocation = gl.getUniformLocation(program, 'u_click')
  gl.uniform2f(clickLocation, clickX.value, 1.0 - clickY.value)

  const clickTimeLocation = gl.getUniformLocation(program, 'u_clickTime')
  gl.uniform1f(clickTimeLocation, clickTime.value)

  const intensityLocation = gl.getUniformLocation(program, 'u_intensity')
  gl.uniform1f(intensityLocation, props.intensity)

  const speedLocation = gl.getUniformLocation(program, 'u_speed')
  gl.uniform1f(speedLocation, props.speed)

  // カラーユニフォーム
  const colors = props.colors.map(hexToRgb)
  for (let i = 0; i < 4; i++) {
    const colorLocation = gl.getUniformLocation(program, `u_color${i + 1}`)
    const color = colors[i] || [1, 1, 1]
    gl.uniform3f(colorLocation, color[0], color[1], color[2])
  }

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

  animationId.value = requestAnimationFrame(render)
}

const handleMouseMove = (event: MouseEvent) => {
  if (!props.interactive || !canvasRef.value) return

  const rect = canvasRef.value.getBoundingClientRect()
  mouseX.value = (event.clientX - rect.left) / rect.width
  mouseY.value = (event.clientY - rect.top) / rect.height
}

const handleClick = (event: MouseEvent) => {
  if (!props.interactive || !canvasRef.value) return

  const rect = canvasRef.value.getBoundingClientRect()
  clickX.value = (event.clientX - rect.left) / rect.width
  clickY.value = (event.clientY - rect.top) / rect.height
  clickTime.value = performance.now() / 1000
}

const handleContextLost = () => {
  console.warn('WebGLコンテキストが失われました')
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
    animationId.value = undefined
  }
}

const handleContextRestored = () => {
  console.info('WebGLコンテキストが復元されました')
  if (setupWebGL()) {
    startTime.value = 0
    animationId.value = requestAnimationFrame(render)
  }
}

const resizeObserver = new ResizeObserver(() => {
  resizeCanvas()
})

watch(() => props.effect, () => {
  if (gl && program) {
    gl.deleteProgram(program)
    program = createProgram(gl)
  }
})

onMounted(() => {
  if (!canvasRef.value) return

  resizeObserver.observe(canvasRef.value)
  resizeCanvas()

  if (setupWebGL() && !props.reduceMotion) {
    animationId.value = requestAnimationFrame(render)
  }
})

onUnmounted(() => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
  }
  
  resizeObserver.disconnect()
  
  if (gl) {
    if (positionBuffer) gl.deleteBuffer(positionBuffer)
    if (program) gl.deleteProgram(program)
  }
})
</script>

<style scoped>
.shader-canvas {
  width: 100%;
  height: 100%;
  display: block;
  will-change: transform;
  transform: translateZ(0);
}

.shader-canvas.interactive {
  cursor: crosshair;
}

@media (prefers-reduced-motion: reduce) {
  .shader-canvas {
    opacity: 0.5;
  }
}
</style>