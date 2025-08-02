/**
 * WebGL/GPU最適化システム
 * 
 * 主な機能:
 * - テクスチャアトラス最適化
 * - シェーダー最適化
 * - 描画コールの削減
 * - GPU使用率の向上
 */

interface WebGLOptimizationConfig {
  enableTextureAtlas: boolean
  enableShaderOptimization: boolean
  enableBatchRendering: boolean
  enableFrustumCulling: boolean
  maxTextureSize: number
  batchSize: number
  cullingMargin: number
}

interface RenderStats {
  drawCalls: number
  triangles: number
  textureSwaps: number
  shaderSwaps: number
  batchedObjects: number
  culledObjects: number
}

export class WebGLOptimizer {
  private readonly scene: Phaser.Scene
  private readonly config: WebGLOptimizationConfig
  private gl: WebGLRenderingContext | null = null
  private renderer: Phaser.Renderer.WebGL.WebGLRenderer | null = null
  
  // テクスチャアトラス管理
  private textureAtlas: Map<string, Phaser.Textures.Texture> = new Map()
  private atlasMaxSize: number = 2048
  private atlasCurrentSize: number = 0
  
  // バッチ処理管理
  private renderBatches: Map<string, Phaser.GameObjects.GameObject[]> = new Map()
  private batchedObjects: Set<Phaser.GameObjects.GameObject> = new Set()
  
  // シェーダー管理
  private customShaders: Map<string, WebGLShader> = new Map()
  private shaderPrograms: Map<string, WebGLProgram> = new Map()
  
  // 統計情報
  private renderStats: RenderStats = {
    drawCalls: 0,
    triangles: 0,
    textureSwaps: 0,
    shaderSwaps: 0,
    batchedObjects: 0,
    culledObjects: 0
  }
  
  // フラストラムカリング境界
  private viewBounds: Phaser.Geom.Rectangle
  
  constructor(scene: Phaser.Scene, config?: Partial<WebGLOptimizationConfig>) {
    this.scene = scene
    this.config = {
      enableTextureAtlas: true,
      enableShaderOptimization: true,
      enableBatchRendering: true,
      enableFrustumCulling: true,
      maxTextureSize: 2048,
      batchSize: 4096,
      cullingMargin: 100,
      ...config
    }
    
    this.viewBounds = new Phaser.Geom.Rectangle(0, 0, scene.cameras.main.width, scene.cameras.main.height)
    this.initialize()
  }

  /**
   * WebGL最適化の初期化
   */
  private initialize(): void {
    const renderer = this.scene.game.renderer
    
    if (renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      this.renderer = renderer
      this.gl = renderer.gl
      
      // WebGLコンテキストの最適化設定
      this.optimizeWebGLContext()
      
      // カスタムシェーダーの初期化
      if (this.config.enableShaderOptimization) {
        this.initializeCustomShaders()
      }
      
      // テクスチャアトラスの初期化
      if (this.config.enableTextureAtlas) {
        this.initializeTextureAtlas()
      }
      
      // レンダリングフックの設定
      this.setupRenderingHooks()
    }
  }

  /**
   * WebGLコンテキストの最適化
   */
  private optimizeWebGLContext(): void {
    if (!this.gl) return
    
    // テクスチャフィルタリング最適化
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
    
    // 深度・ステンシルテストの無効化（2Dゲーム用）
    this.gl.disable(this.gl.DEPTH_TEST)
    this.gl.disable(this.gl.STENCIL_TEST)
    
    // カリング最適化
    this.gl.enable(this.gl.CULL_FACE)
    this.gl.cullFace(this.gl.BACK)
    
    // ブレンディング最適化
    this.gl.enable(this.gl.BLEND)
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
    
    // Viewport最適化
    this.gl.viewport(0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height)
    
    // テクスチャユニット最適化
    const maxTextureUnits = this.gl.getParameter(this.gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS)
    console.log(`WebGL最適化: 利用可能テクスチャユニット ${maxTextureUnits}`)
  }

  /**
   * カスタムシェーダーの初期化
   */
  private initializeCustomShaders(): void {
    if (!this.gl) return
    
    // 高性能スプライトシェーダー
    const spriteVertexShader = this.createShader(this.gl.VERTEX_SHADER, `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      attribute vec4 a_color;
      attribute float a_alpha;
      
      uniform mat3 u_matrix;
      uniform vec2 u_resolution;
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      varying float v_alpha;
      
      void main() {
        vec2 position = (u_matrix * vec3(a_position, 1)).xy;
        position = ((position / u_resolution) * 2.0) - 1.0;
        position.y *= -1.0;
        
        gl_Position = vec4(position, 0, 1);
        v_texCoord = a_texCoord;
        v_color = a_color;
        v_alpha = a_alpha;
      }
    `)
    
    const spriteFragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, `
      precision mediump float;
      
      uniform sampler2D u_texture;
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      varying float v_alpha;
      
      void main() {
        vec4 texColor = texture2D(u_texture, v_texCoord);
        gl_FragColor = texColor * v_color * v_alpha;
      }
    `)
    
    if (spriteVertexShader && spriteFragmentShader) {
      const program = this.createShaderProgram(spriteVertexShader, spriteFragmentShader)
      if (program) {
        this.shaderPrograms.set('optimizedSprite', program)
      }
    }
    
    // バッチレンダリング用シェーダー
    this.initializeBatchShader()
  }

  /**
   * バッチレンダリング用シェーダーの初期化
   */
  private initializeBatchShader(): void {
    if (!this.gl) return
    
    const batchVertexShader = this.createShader(this.gl.VERTEX_SHADER, `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      attribute vec4 a_color;
      attribute float a_textureIndex;
      
      uniform mat3 u_matrix;
      uniform vec2 u_resolution;
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      varying float v_textureIndex;
      
      void main() {
        vec2 position = (u_matrix * vec3(a_position, 1)).xy;
        position = ((position / u_resolution) * 2.0) - 1.0;
        position.y *= -1.0;
        
        gl_Position = vec4(position, 0, 1);
        v_texCoord = a_texCoord;
        v_color = a_color;
        v_textureIndex = a_textureIndex;
      }
    `)
    
    const batchFragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, `
      precision mediump float;
      
      uniform sampler2D u_textures[16];
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      varying float v_textureIndex;
      
      void main() {
        vec4 texColor;
        int index = int(v_textureIndex);
        
        // テクスチャサンプリングの最適化
        if (index == 0) texColor = texture2D(u_textures[0], v_texCoord);
        else if (index == 1) texColor = texture2D(u_textures[1], v_texCoord);
        else if (index == 2) texColor = texture2D(u_textures[2], v_texCoord);
        else if (index == 3) texColor = texture2D(u_textures[3], v_texCoord);
        else if (index == 4) texColor = texture2D(u_textures[4], v_texCoord);
        else if (index == 5) texColor = texture2D(u_textures[5], v_texCoord);
        else if (index == 6) texColor = texture2D(u_textures[6], v_texCoord);
        else if (index == 7) texColor = texture2D(u_textures[7], v_texCoord);
        else texColor = texture2D(u_textures[0], v_texCoord); // fallback
        
        gl_FragColor = texColor * v_color;
      }
    `)
    
    if (batchVertexShader && batchFragmentShader) {
      const program = this.createShaderProgram(batchVertexShader, batchFragmentShader)
      if (program) {
        this.shaderPrograms.set('batchRenderer', program)
      }
    }
  }

  /**
   * テクスチャアトラスの初期化
   */
  private initializeTextureAtlas(): void {
    // 動的テクスチャアトラスの作成
    this.createDynamicTextureAtlas()
  }

  /**
   * 動的テクスチャアトラスの作成
   */
  private createDynamicTextureAtlas(): void {
    // 小さなテクスチャを統合してアトラスを作成
    const textureManager = this.scene.textures
    const atlasTextures: Array<{key: string, texture: Phaser.Textures.Texture}> = []
    
    // 統合対象のテクスチャを収集
    textureManager.list.forEach((texture, key) => {
      if (this.shouldIncludeInAtlas(texture, key)) {
        atlasTextures.push({key, texture})
      }
    })
    
    if (atlasTextures.length > 1) {
      // アトラステクスチャの作成
      const atlasKey = 'dynamic_atlas_' + Date.now()
      this.packTexturesIntoAtlas(atlasTextures, atlasKey)
    }
  }

  /**
   * テクスチャをアトラスに含めるべきかチェック
   */
  private shouldIncludeInAtlas(texture: Phaser.Textures.Texture, key: string): boolean {
    // システムテクスチャは除外
    if (key.startsWith('__')) return false
    
    // 大きすぎるテクスチャは除外
    const source = texture.source[0]
    if (source.width > 512 || source.height > 512) return false
    
    // 既にアトラス化されているものは除外
    if (key.includes('atlas')) return false
    
    return true
  }

  /**
   * テクスチャをアトラスにパック
   */
  private packTexturesIntoAtlas(textures: Array<{key: string, texture: Phaser.Textures.Texture}>, atlasKey: string): void {
    // 簡単なパッキングアルゴリズム（実際のプロダクションではより高度なアルゴリズムを使用）
    const canvas = document.createElement('canvas')
    canvas.width = this.atlasMaxSize
    canvas.height = this.atlasMaxSize
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return
    
    let currentX = 0
    let currentY = 0
    let rowHeight = 0
    
    const atlasData: Record<string, any> = {
      frames: {}
    }
    
    for (const {key, texture} of textures) {
      const source = texture.source[0]
      const width = source.width
      const height = source.height
      
      // 行の終端チェック
      if (currentX + width > this.atlasMaxSize) {
        currentX = 0
        currentY += rowHeight
        rowHeight = 0
      }
      
      // アトラスサイズオーバーチェック
      if (currentY + height > this.atlasMaxSize) break
      
      // テクスチャを描画
      ctx.drawImage(source.image, currentX, currentY)
      
      // フレーム情報を記録
      atlasData.frames[key] = {
        frame: { x: currentX, y: currentY, w: width, h: height },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: width, h: height },
        sourceSize: { w: width, h: height }
      }
      
      currentX += width
      rowHeight = Math.max(rowHeight, height)
    }
    
    // アトラステクスチャとして追加
    this.scene.textures.addAtlas(atlasKey, canvas, atlasData)
    this.textureAtlas.set(atlasKey, this.scene.textures.get(atlasKey))
  }

  /**
   * バッチレンダリングの実行
   */
  public batchRender(objects: Phaser.GameObjects.GameObject[]): void {
    if (!this.config.enableBatchRendering) return
    
    // テクスチャ別にグループ化
    const textureGroups = new Map<string, Phaser.GameObjects.GameObject[]>()
    
    for (const obj of objects) {
      if ('texture' in obj) {
        const textureKey = (obj as any).texture.key
        if (!textureGroups.has(textureKey)) {
          textureGroups.set(textureKey, [])
        }
        textureGroups.get(textureKey)!.push(obj)
      }
    }
    
    // グループごとにバッチ処理
    for (const [textureKey, groupObjects] of textureGroups) {
      this.renderBatch(textureKey, groupObjects)
    }
    
    this.renderStats.batchedObjects = objects.length
  }

  /**
   * バッチ処理でレンダリング
   */
  private renderBatch(textureKey: string, objects: Phaser.GameObjects.GameObject[]): void {
    if (!this.gl || objects.length === 0) return
    
    const program = this.shaderPrograms.get('batchRenderer')
    if (!program) return
    
    this.gl.useProgram(program)
    
    // バッチデータの準備
    const vertices: number[] = []
    const indices: number[] = []
    
    let vertexIndex = 0
    
    for (const obj of objects) {
      if ('x' in obj && 'y' in obj && 'width' in obj && 'height' in obj) {
        const x = (obj as any).x
        const y = (obj as any).y
        const w = (obj as any).width
        const h = (obj as any).height
        
        // 四角形の頂点データ
        vertices.push(
          x, y, 0, 0, 1, 1, 1, 1, 0,           // 左上
          x + w, y, 1, 0, 1, 1, 1, 1, 0,       // 右上
          x + w, y + h, 1, 1, 1, 1, 1, 1, 0,   // 右下
          x, y + h, 0, 1, 1, 1, 1, 1, 0        // 左下
        )
        
        // インデックス
        indices.push(
          vertexIndex, vertexIndex + 1, vertexIndex + 2,
          vertexIndex, vertexIndex + 2, vertexIndex + 3
        )
        
        vertexIndex += 4
      }
    }
    
    // VBOとIBOの作成・バインド
    const vertexBuffer = this.gl.createBuffer()
    const indexBuffer = this.gl.createBuffer()
    
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.DYNAMIC_DRAW)
    
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.DYNAMIC_DRAW)
    
    // 描画
    this.gl.drawElements(this.gl.TRIANGLES, indices.length, this.gl.UNSIGNED_SHORT, 0)
    
    this.renderStats.drawCalls++
    this.renderStats.triangles += indices.length / 3
    
    // クリーンアップ
    this.gl.deleteBuffer(vertexBuffer)
    this.gl.deleteBuffer(indexBuffer)
  }

  /**
   * フラストラムカリング
   */
  public performFrustumCulling(objects: Phaser.GameObjects.GameObject[]): Phaser.GameObjects.GameObject[] {
    if (!this.config.enableFrustumCulling) return objects
    
    const camera = this.scene.cameras.main
    const bounds = camera.worldView
    
    // 境界を拡張してポップイン防止
    const expandedBounds = new Phaser.Geom.Rectangle(
      bounds.x - this.config.cullingMargin,
      bounds.y - this.config.cullingMargin,
      bounds.width + this.config.cullingMargin * 2,
      bounds.height + this.config.cullingMargin * 2
    )
    
    const visibleObjects: Phaser.GameObjects.GameObject[] = []
    let culledCount = 0
    
    for (const obj of objects) {
      if (this.isObjectVisible(obj, expandedBounds)) {
        visibleObjects.push(obj)
      } else {
        culledCount++
      }
    }
    
    this.renderStats.culledObjects = culledCount
    return visibleObjects
  }

  /**
   * オブジェクトが可視範囲内にあるかチェック
   */
  private isObjectVisible(obj: Phaser.GameObjects.GameObject, bounds: Phaser.Geom.Rectangle): boolean {
    if (!('getBounds' in obj)) return true
    
    try {
      const objBounds = (obj as any).getBounds()
      return Phaser.Geom.Rectangle.Overlaps(bounds, objBounds)
    } catch (e) {
      // エラーの場合は表示する
      return true
    }
  }

  /**
   * シェーダーの作成
   */
  private createShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null
    
    const shader = this.gl.createShader(type)
    if (!shader) return null
    
    this.gl.shaderSource(shader, source)
    this.gl.compileShader(shader)
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('シェーダーコンパイルエラー:', this.gl.getShaderInfoLog(shader))
      this.gl.deleteShader(shader)
      return null
    }
    
    return shader
  }

  /**
   * シェーダープログラムの作成
   */
  private createShaderProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
    if (!this.gl) return null
    
    const program = this.gl.createProgram()
    if (!program) return null
    
    this.gl.attachShader(program, vertexShader)
    this.gl.attachShader(program, fragmentShader)
    this.gl.linkProgram(program)
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('シェーダープログラムリンクエラー:', this.gl.getProgramInfoLog(program))
      this.gl.deleteProgram(program)
      return null
    }
    
    return program
  }

  /**
   * レンダリングフックの設定
   */
  private setupRenderingHooks(): void {
    // preRenderフックでバッチ処理とカリングを実行
    this.scene.events.on('prerender', () => {
      this.resetRenderStats()
      
      const allObjects = this.scene.children.list
      const visibleObjects = this.performFrustumCulling(allObjects)
      
      if (this.config.enableBatchRendering && visibleObjects.length > 0) {
        this.batchRender(visibleObjects)
      }
    })
  }

  /**
   * レンダリング統計のリセット
   */
  private resetRenderStats(): void {
    this.renderStats = {
      drawCalls: 0,
      triangles: 0,
      textureSwaps: 0,
      shaderSwaps: 0,
      batchedObjects: 0,
      culledObjects: 0
    }
  }

  /**
   * パフォーマンス統計の取得
   */
  public getPerformanceStats(): RenderStats & { gpuUtilization: number, memoryUsage: number } {
    return {
      ...this.renderStats,
      gpuUtilization: this.calculateGPUUtilization(),
      memoryUsage: this.calculateMemoryUsage()
    }
  }

  /**
   * GPU使用率の計算（推定）
   */
  private calculateGPUUtilization(): number {
    // 描画コール数とオブジェクト数から推定
    const drawCallRatio = Math.min(this.renderStats.drawCalls / 100, 1)
    const triangleRatio = Math.min(this.renderStats.triangles / 10000, 1)
    
    return Math.round((drawCallRatio * 0.6 + triangleRatio * 0.4) * 100)
  }

  /**
   * GPU メモリ使用量の計算（推定）
   */
  private calculateMemoryUsage(): number {
    let totalTextureMemory = 0
    
    this.scene.textures.list.forEach(texture => {
      const source = texture.source[0]
      if (source) {
        // 4バイト/ピクセル（RGBA）で推定
        totalTextureMemory += source.width * source.height * 4
      }
    })
    
    return Math.round(totalTextureMemory / 1024 / 1024) // MB
  }

  /**
   * 最適化レベルの動的調整
   */
  public adjustOptimizationLevel(targetFPS: number = 60): void {
    const currentFPS = this.scene.game.loop.actualFps || 0
    
    if (currentFPS < targetFPS * 0.8) {
      // パフォーマンス低下 - 最適化を強化
      this.config.batchSize = Math.min(this.config.batchSize * 1.2, 8192)
      this.config.cullingMargin = Math.max(this.config.cullingMargin * 0.8, 50)
    } else if (currentFPS > targetFPS * 0.95) {
      // パフォーマンス良好 - 品質を向上
      this.config.batchSize = Math.max(this.config.batchSize * 0.9, 2048)
      this.config.cullingMargin = Math.min(this.config.cullingMargin * 1.1, 200)
    }
  }

  /**
   * クリーンアップ
   */
  public cleanup(): void {
    // シェーダープログラムの削除
    if (this.gl) {
      this.shaderPrograms.forEach(program => {
        this.gl!.deleteProgram(program)
      })
    }
    
    // テクスチャアトラスのクリア
    this.textureAtlas.clear()
    this.renderBatches.clear()
    this.batchedObjects.clear()
    
    // イベントリスナーの削除
    this.scene.events.off('prerender')
  }
}