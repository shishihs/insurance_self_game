/**
 * レンダリング最適化システム
 * GPU最適化、フラスタムカリング、バッチレンダリングの管理
 */

export interface RenderConfig {
  /** バッチレンダリングの有効化 */
  enableBatching: boolean
  /** フラスタムカリングの有効化 */
  enableFrustumCulling: boolean
  /** オクルージョンカリングの有効化 */
  enableOcclusionCulling: boolean
  /** LOD（Level of Detail）の有効化 */
  enableLOD: boolean
  /** VSync の有効化 */
  enableVSync: boolean
  /** 最大描画オブジェクト数 */
  maxRenderObjects: number
  /** カリング境界の拡張サイズ */
  cullingPadding: number
}

/**
 * レンダリング統計
 */
export interface RenderStats {
  /** 描画されたオブジェクト数 */
  renderedObjects: number
  /** カリングされたオブジェクト数 */
  culledObjects: number
  /** バッチ数 */
  batchCount: number
  /** 描画呼び出し数 */
  drawCalls: number
  /** GPU使用率 */
  gpuUsage: number
  /** フレーム時間 */
  frameTime: number
  /** 頂点数 */
  vertexCount: number
  /** テクスチャ切り替え回数 */
  textureSwaps: number
}

/**
 * GPU最適化レンダラー
 */
export class RenderOptimizer {
  private scene: Phaser.Scene
  private config: RenderConfig
  private stats: RenderStats
  private renderQueue: RenderableObject[] = []
  private batchGroups: Map<string, RenderableObject[]> = new Map()
  private cullingBounds: Phaser.Geom.Rectangle
  private lodLevels: Map<string, LODConfig[]> = new Map()
  
  // GPU最適化
  private webglRenderer: Phaser.Renderer.WebGL.WebGLRenderer | null = null
  private vertexBuffer: WebGLBuffer | null = null
  private indexBuffer: WebGLBuffer | null = null
  private shaderProgram: WebGLProgram | null = null
  
  // パフォーマンス追跡
  private frameTimeHistory: number[] = []
  private renderTimeTracker: PerformanceTracker
  
  constructor(scene: Phaser.Scene, config: Partial<RenderConfig> = {}) {
    this.scene = scene
    this.config = {
      enableBatching: true,
      enableFrustumCulling: true,
      enableOcclusionCulling: false,
      enableLOD: true,
      enableVSync: true,
      maxRenderObjects: 1000,
      cullingPadding: 100,
      ...config
    }
    
    this.initializeOptimizer()
  }
  
  /**
   * 最適化システムの初期化
   */
  private initializeOptimizer(): void {
    this.initializeStats()
    this.setupGPUOptimization()
    this.setupCullingBounds()
    this.setupPerformanceTracking()
    this.setupRenderPipeline()
  }
  
  /**
   * 統計情報の初期化
   */
  private initializeStats(): void {
    this.stats = {
      renderedObjects: 0,
      culledObjects: 0,
      batchCount: 0,
      drawCalls: 0,
      gpuUsage: 0,
      frameTime: 0,
      vertexCount: 0,
      textureSwaps: 0
    }
  }
  
  /**
   * GPU最適化のセットアップ
   */
  private setupGPUOptimization(): void {
    if (this.scene.game.renderer.type === Phaser.WEBGL) {
      this.webglRenderer = this.scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer
      this.initializeWebGLOptimizations()
    }
  }
  
  /**
   * WebGL最適化の初期化
   */
  private initializeWebGLOptimizations(): void {
    if (!this.webglRenderer) return
    
    const gl = this.webglRenderer.gl
    
    // 深度バッファの最適化
    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL)
    
    // カリングの設定
    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.BACK)
    gl.frontFace(gl.CCW)
    
    // ブレンディングの最適化
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    
    // アニソトロピックフィルタリング
    const ext = gl.getExtension('EXT_texture_filter_anisotropic')\n    if (ext) {\n      const maxAnisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)\n      // テクスチャに適用\n      gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(4, maxAnisotropy))\n    }\n    \n    // インスタンス化描画の準備\n    this.setupInstancedRendering()\n  }\n  \n  /**\n   * インスタンス化描画のセットアップ\n   */\n  private setupInstancedRendering(): void {\n    if (!this.webglRenderer) return\n    \n    const gl = this.webglRenderer.gl\n    \n    // 頂点バッファの作成\n    this.vertexBuffer = gl.createBuffer()\n    this.indexBuffer = gl.createBuffer()\n    \n    // シェーダープログラムの作成\n    this.shaderProgram = this.createOptimizedShader()\n  }\n  \n  /**\n   * 最適化されたシェーダーの作成\n   */\n  private createOptimizedShader(): WebGLProgram | null {\n    if (!this.webglRenderer) return null\n    \n    const gl = this.webglRenderer.gl\n    \n    const vertexShaderSource = `\n      attribute vec3 a_position;\n      attribute vec2 a_texCoord;\n      attribute mat4 a_instanceMatrix;\n      \n      uniform mat4 u_projectionMatrix;\n      uniform mat4 u_viewMatrix;\n      \n      varying vec2 v_texCoord;\n      \n      void main() {\n        gl_Position = u_projectionMatrix * u_viewMatrix * a_instanceMatrix * vec4(a_position, 1.0);\n        v_texCoord = a_texCoord;\n      }\n    `\n    \n    const fragmentShaderSource = `\n      precision mediump float;\n      \n      uniform sampler2D u_texture;\n      varying vec2 v_texCoord;\n      \n      void main() {\n        gl_FragColor = texture2D(u_texture, v_texCoord);\n      }\n    `\n    \n    const vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource)\n    const fragmentShader = this.compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)\n    \n    if (!vertexShader || !fragmentShader) return null\n    \n    const program = gl.createProgram()\n    if (!program) return null\n    \n    gl.attachShader(program, vertexShader)\n    gl.attachShader(program, fragmentShader)\n    gl.linkProgram(program)\n    \n    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {\n      console.error('シェーダープログラムのリンクに失敗:', gl.getProgramInfoLog(program))\n      return null\n    }\n    \n    return program\n  }\n  \n  /**\n   * シェーダーのコンパイル\n   */\n  private compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {\n    const shader = gl.createShader(type)\n    if (!shader) return null\n    \n    gl.shaderSource(shader, source)\n    gl.compileShader(shader)\n    \n    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {\n      console.error('シェーダーのコンパイルに失敗:', gl.getShaderInfoLog(shader))\n      gl.deleteShader(shader)\n      return null\n    }\n    \n    return shader\n  }\n  \n  /**\n   * カリング境界のセットアップ\n   */\n  private setupCullingBounds(): void {\n    const camera = this.scene.cameras.main\n    this.cullingBounds = new Phaser.Geom.Rectangle(\n      camera.worldView.x - this.config.cullingPadding,\n      camera.worldView.y - this.config.cullingPadding,\n      camera.worldView.width + this.config.cullingPadding * 2,\n      camera.worldView.height + this.config.cullingPadding * 2\n    )\n  }\n  \n  /**\n   * パフォーマンス追跡のセットアップ\n   */\n  private setupPerformanceTracking(): void {\n    this.renderTimeTracker = new PerformanceTracker('render')\n  }\n  \n  /**\n   * レンダリングパイプラインのセットアップ\n   */\n  private setupRenderPipeline(): void {\n    // フレーム開始時の処理\n    this.scene.sys.events.on('prerender', () => {\n      this.onFrameStart()\n    })\n    \n    // フレーム終了時の処理\n    this.scene.sys.events.on('postrender', () => {\n      this.onFrameEnd()\n    })\n  }\n  \n  /**\n   * フレーム開始時の処理\n   */\n  private onFrameStart(): void {\n    this.renderTimeTracker.start()\n    this.resetStats()\n    this.updateCullingBounds()\n    this.prepareRenderQueue()\n  }\n  \n  /**\n   * フレーム終了時の処理\n   */\n  private onFrameEnd(): void {\n    this.stats.frameTime = this.renderTimeTracker.end()\n    this.updateFrameTimeHistory()\n    this.updateGPUUsage()\n  }\n  \n  /**\n   * 統計情報のリセット\n   */\n  private resetStats(): void {\n    this.stats.renderedObjects = 0\n    this.stats.culledObjects = 0\n    this.stats.batchCount = 0\n    this.stats.drawCalls = 0\n    this.stats.vertexCount = 0\n    this.stats.textureSwaps = 0\n  }\n  \n  /**\n   * カリング境界の更新\n   */\n  private updateCullingBounds(): void {\n    const camera = this.scene.cameras.main\n    this.cullingBounds.setTo(\n      camera.worldView.x - this.config.cullingPadding,\n      camera.worldView.y - this.config.cullingPadding,\n      camera.worldView.width + this.config.cullingPadding * 2,\n      camera.worldView.height + this.config.cullingPadding * 2\n    )\n  }\n  \n  /**\n   * レンダーキューの準備\n   */\n  private prepareRenderQueue(): void {\n    this.renderQueue.length = 0\n    this.batchGroups.clear()\n    \n    // シーン内のオブジェクトを収集\n    this.collectRenderableObjects()\n    \n    // フラスタムカリングの実行\n    if (this.config.enableFrustumCulling) {\n      this.performFrustumCulling()\n    }\n    \n    // LODの適用\n    if (this.config.enableLOD) {\n      this.applyLevelOfDetail()\n    }\n    \n    // バッチングの準備\n    if (this.config.enableBatching) {\n      this.prepareBatching()\n    }\n  }\n  \n  /**\n   * レンダリング可能オブジェクトの収集\n   */\n  private collectRenderableObjects(): void {\n    this.scene.children.list.forEach(child => {\n      if (this.isRenderable(child)) {\n        this.renderQueue.push(child as RenderableObject)\n      }\n    })\n  }\n  \n  /**\n   * オブジェクトがレンダリング可能かチェック\n   */\n  private isRenderable(obj: Phaser.GameObjects.GameObject): boolean {\n    return obj.visible && \n           obj.active && \n           'x' in obj && \n           'y' in obj &&\n           ('texture' in obj || 'fillColor' in obj)\n  }\n  \n  /**\n   * フラスタムカリングの実行\n   */\n  private performFrustumCulling(): void {\n    const visibleObjects: RenderableObject[] = []\n    \n    for (const obj of this.renderQueue) {\n      if (this.isObjectInView(obj)) {\n        visibleObjects.push(obj)\n        this.stats.renderedObjects++\n      } else {\n        this.stats.culledObjects++\n      }\n    }\n    \n    this.renderQueue = visibleObjects\n  }\n  \n  /**\n   * オブジェクトが視界内にあるかチェック\n   */\n  private isObjectInView(obj: RenderableObject): boolean {\n    const bounds = obj.getBounds ? obj.getBounds() : new Phaser.Geom.Rectangle(obj.x, obj.y, 32, 32)\n    return Phaser.Geom.Rectangle.Overlaps(this.cullingBounds, bounds)\n  }\n  \n  /**\n   * LOD（Level of Detail）の適用\n   */\n  private applyLevelOfDetail(): void {\n    const camera = this.scene.cameras.main\n    const cameraDistance = camera.zoom\n    \n    for (const obj of this.renderQueue) {\n      const lodConfig = this.lodLevels.get(obj.texture?.key || '')\n      if (lodConfig) {\n        this.applyLODToObject(obj, cameraDistance, lodConfig)\n      }\n    }\n  }\n  \n  /**\n   * 個別オブジェクトにLODを適用\n   */\n  private applyLODToObject(obj: RenderableObject, distance: number, lodConfig: LODConfig[]): void {\n    for (const lod of lodConfig) {\n      if (distance >= lod.minDistance && distance <= lod.maxDistance) {\n        // テクスチャの品質調整\n        if (lod.textureScale && obj.setScale) {\n          obj.setScale(lod.textureScale)\n        }\n        \n        // アニメーション品質の調整\n        if (lod.animationQuality && 'anims' in obj) {\n          (obj as any).anims.timeScale = lod.animationQuality\n        }\n        \n        break\n      }\n    }\n  }\n  \n  /**\n   * バッチングの準備\n   */\n  private prepareBatching(): void {\n    // テクスチャ別にグループ化\n    for (const obj of this.renderQueue) {\n      const textureKey = obj.texture?.key || 'default'\n      const group = this.batchGroups.get(textureKey) || []\n      group.push(obj)\n      this.batchGroups.set(textureKey, group)\n    }\n    \n    this.stats.batchCount = this.batchGroups.size\n  }\n  \n  /**\n   * 最適化されたレンダリングの実行\n   */\n  render(): void {\n    if (!this.config.enableBatching) {\n      this.renderStandard()\n    } else {\n      this.renderBatched()\n    }\n  }\n  \n  /**\n   * 標準レンダリング\n   */\n  private renderStandard(): void {\n    for (const obj of this.renderQueue) {\n      this.renderObject(obj)\n      this.stats.drawCalls++\n    }\n  }\n  \n  /**\n   * バッチレンダリング\n   */\n  private renderBatched(): void {\n    for (const [textureKey, objects] of this.batchGroups) {\n      this.renderBatch(textureKey, objects)\n      this.stats.drawCalls++\n      this.stats.textureSwaps++\n    }\n  }\n  \n  /**\n   * 個別オブジェクトのレンダリング\n   */\n  private renderObject(obj: RenderableObject): void {\n    // 標準のPhaser描画処理\n    if ('render' in obj && typeof obj.render === 'function') {\n      obj.render()\n    }\n    \n    this.stats.vertexCount += this.estimateVertexCount(obj)\n  }\n  \n  /**\n   * バッチのレンダリング\n   */\n  private renderBatch(textureKey: string, objects: RenderableObject[]): void {\n    if (!this.webglRenderer || !this.shaderProgram) {\n      // フォールバック: 標準レンダリング\n      objects.forEach(obj => this.renderObject(obj))\n      return\n    }\n    \n    // インスタンス化描画の実行\n    this.renderInstancedBatch(objects)\n  }\n  \n  /**\n   * インスタンス化バッチレンダリング\n   */\n  private renderInstancedBatch(objects: RenderableObject[]): void {\n    if (!this.webglRenderer || !this.shaderProgram) return\n    \n    const gl = this.webglRenderer.gl\n    \n    // シェーダープログラムの使用\n    gl.useProgram(this.shaderProgram)\n    \n    // インスタンスマトリックスの準備\n    const instanceMatrices = objects.map(obj => this.createInstanceMatrix(obj))\n    \n    // バッファの更新\n    this.updateInstanceBuffer(instanceMatrices)\n    \n    // 描画の実行\n    const instanceCount = objects.length\n    gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, instanceCount)\n    \n    this.stats.vertexCount += objects.length * 4 // quad per instance\n  }\n  \n  /**\n   * インスタンスマトリックスの作成\n   */\n  private createInstanceMatrix(obj: RenderableObject): Float32Array {\n    const matrix = new Float32Array(16)\n    \n    // 変換行列の作成（位置、回転、スケール）\n    const x = obj.x || 0\n    const y = obj.y || 0\n    const scaleX = obj.scaleX || 1\n    const scaleY = obj.scaleY || 1\n    const rotation = obj.rotation || 0\n    \n    // 簡易的な変換行列（実際はもっと複雑）\n    matrix[0] = Math.cos(rotation) * scaleX\n    matrix[1] = Math.sin(rotation) * scaleX\n    matrix[4] = -Math.sin(rotation) * scaleY\n    matrix[5] = Math.cos(rotation) * scaleY\n    matrix[12] = x\n    matrix[13] = y\n    matrix[15] = 1\n    \n    return matrix\n  }\n  \n  /**\n   * インスタンスバッファの更新\n   */\n  private updateInstanceBuffer(matrices: Float32Array[]): void {\n    if (!this.webglRenderer) return\n    \n    const gl = this.webglRenderer.gl\n    const instanceData = new Float32Array(matrices.length * 16)\n    \n    matrices.forEach((matrix, index) => {\n      instanceData.set(matrix, index * 16)\n    })\n    \n    // バッファに送信\n    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)\n    gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.DYNAMIC_DRAW)\n  }\n  \n  /**\n   * 頂点数の推定\n   */\n  private estimateVertexCount(obj: RenderableObject): number {\n    // オブジェクトの種類に基づく推定\n    if ('texture' in obj) {\n      return 4 // quad\n    }\n    if ('radius' in obj) {\n      return 32 // circle approximation\n    }\n    if ('points' in obj) {\n      return (obj as any).points.length\n    }\n    return 4 // default quad\n  }\n  \n  /**\n   * フレーム時間履歴の更新\n   */\n  private updateFrameTimeHistory(): void {\n    this.frameTimeHistory.push(this.stats.frameTime)\n    if (this.frameTimeHistory.length > 60) {\n      this.frameTimeHistory.shift()\n    }\n  }\n  \n  /**\n   * GPU使用率の更新\n   */\n  private updateGPUUsage(): void {\n    // GPU使用率の推定（実際のGPU使用率は取得困難）\n    const avgFrameTime = this.frameTimeHistory.length > 0 ?\n      this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length : 0\n    \n    const targetFrameTime = 1000 / 60 // 60fps\n    this.stats.gpuUsage = Math.min(100, (avgFrameTime / targetFrameTime) * 100)\n  }\n  \n  /**\n   * LOD設定の登録\n   */\n  registerLOD(textureKey: string, lodLevels: LODConfig[]): void {\n    this.lodLevels.set(textureKey, lodLevels.sort((a, b) => a.minDistance - b.minDistance))\n  }\n  \n  /**\n   * 統計情報の取得\n   */\n  getStats(): RenderStats {\n    return { ...this.stats }\n  }\n  \n  /**\n   * 詳細統計情報の取得\n   */\n  getDetailedStats(): {\n    basic: RenderStats\n    performance: {\n      averageFrameTime: number\n      frameTimeStability: number\n      cullingEfficiency: number\n      batchingEfficiency: number\n    }\n    gpu: {\n      webglEnabled: boolean\n      instancedRenderingEnabled: boolean\n      shaderOptimizationEnabled: boolean\n    }\n    config: RenderConfig\n  } {\n    const avgFrameTime = this.frameTimeHistory.length > 0 ?\n      this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length : 0\n    \n    const cullingEfficiency = this.stats.renderedObjects + this.stats.culledObjects > 0 ?\n      (this.stats.culledObjects / (this.stats.renderedObjects + this.stats.culledObjects)) * 100 : 0\n    \n    const batchingEfficiency = this.stats.renderedObjects > 0 ?\n      (this.stats.renderedObjects / this.stats.drawCalls) : 1\n    \n    return {\n      basic: this.getStats(),\n      performance: {\n        averageFrameTime: Math.round(avgFrameTime * 100) / 100,\n        frameTimeStability: this.calculateFrameTimeStability(),\n        cullingEfficiency,\n        batchingEfficiency\n      },\n      gpu: {\n        webglEnabled: !!this.webglRenderer,\n        instancedRenderingEnabled: !!this.shaderProgram,\n        shaderOptimizationEnabled: !!this.shaderProgram\n      },\n      config: { ...this.config }\n    }\n  }\n  \n  /**\n   * フレーム時間安定性の計算\n   */\n  private calculateFrameTimeStability(): number {\n    if (this.frameTimeHistory.length < 2) return 1\n    \n    const mean = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length\n    const variance = this.frameTimeHistory.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / this.frameTimeHistory.length\n    const standardDeviation = Math.sqrt(variance)\n    \n    return Math.max(0, 1 - (standardDeviation / mean))\n  }\n  \n  /**\n   * 設定の更新\n   */\n  updateConfig(newConfig: Partial<RenderConfig>): void {\n    this.config = { ...this.config, ...newConfig }\n    \n    // 設定変更に応じた再初期化\n    if (newConfig.cullingPadding !== undefined) {\n      this.setupCullingBounds()\n    }\n  }\n  \n  /**\n   * リソースのクリーンアップ\n   */\n  cleanup(): void {\n    if (this.webglRenderer) {\n      const gl = this.webglRenderer.gl\n      \n      if (this.vertexBuffer) {\n        gl.deleteBuffer(this.vertexBuffer)\n        this.vertexBuffer = null\n      }\n      \n      if (this.indexBuffer) {\n        gl.deleteBuffer(this.indexBuffer)\n        this.indexBuffer = null\n      }\n      \n      if (this.shaderProgram) {\n        gl.deleteProgram(this.shaderProgram)\n        this.shaderProgram = null\n      }\n    }\n    \n    this.renderQueue.length = 0\n    this.batchGroups.clear()\n    this.lodLevels.clear()\n    this.frameTimeHistory.length = 0\n  }\n}\n\n/**\n * レンダリング可能オブジェクトのインターフェース\n */\ninterface RenderableObject extends Phaser.GameObjects.GameObject {\n  x: number\n  y: number\n  scaleX?: number\n  scaleY?: number\n  rotation?: number\n  texture?: Phaser.Textures.Texture\n  getBounds?(): Phaser.Geom.Rectangle\n  setScale?(scale: number): this\n  render?(): void\n}\n\n/**\n * LOD設定\n */\ninterface LODConfig {\n  minDistance: number\n  maxDistance: number\n  textureScale?: number\n  animationQuality?: number\n  particleCount?: number\n}\n\n/**\n * パフォーマンス追跡クラス\n */\nclass PerformanceTracker {\n  private name: string\n  private startTime: number = 0\n  \n  constructor(name: string) {\n    this.name = name\n  }\n  \n  start(): void {\n    this.startTime = performance.now()\n  }\n  \n  end(): number {\n    const endTime = performance.now()\n    const duration = endTime - this.startTime\n    return duration\n  }\n}\n\n/**\n * オクルージョンカリング（遮蔽カリング）システム\n */\nexport class OcclusionCuller {\n  private scene: Phaser.Scene\n  private occluders: Phaser.Geom.Rectangle[] = []\n  \n  constructor(scene: Phaser.Scene) {\n    this.scene = scene\n  }\n  \n  /**\n   * 遮蔽物の追加\n   */\n  addOccluder(bounds: Phaser.Geom.Rectangle): void {\n    this.occluders.push(bounds)\n  }\n  \n  /**\n   * オブジェクトが遮蔽されているかチェック\n   */\n  isOccluded(objectBounds: Phaser.Geom.Rectangle): boolean {\n    const camera = this.scene.cameras.main\n    const viewBounds = camera.worldView\n    \n    // カメラビューとオブジェクトの間に遮蔽物があるかチェック\n    for (const occluder of this.occluders) {\n      if (this.isObjectBehindOccluder(objectBounds, occluder, viewBounds)) {\n        return true\n      }\n    }\n    \n    return false\n  }\n  \n  /**\n   * オブジェクトが遮蔽物の後ろにあるかチェック\n   */\n  private isObjectBehindOccluder(\n    objectBounds: Phaser.Geom.Rectangle,\n    occluder: Phaser.Geom.Rectangle,\n    viewBounds: Phaser.Geom.Rectangle\n  ): boolean {\n    // 簡易的な実装 - 実際にはより複雑な3D計算が必要\n    return Phaser.Geom.Rectangle.Contains(occluder, objectBounds.centerX, objectBounds.centerY) &&\n           Phaser.Geom.Rectangle.Overlaps(occluder, viewBounds)\n  }\n  \n  /**\n   * 遮蔽物のクリア\n   */\n  clearOccluders(): void {\n    this.occluders.length = 0\n  }\n}