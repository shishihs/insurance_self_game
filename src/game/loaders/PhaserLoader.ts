/**
 * Phaserライブラリの動的インポートローダー
 * バンドルサイズを最適化するために、Phaserを必要時のみロードする
 */

let phaserCache: typeof import('phaser') | null = null
let loadingPromise: Promise<typeof import('phaser')> | null = null

/**
 * Phaserライブラリを動的インポートで取得
 * 一度ロードしたらキャッシュして再利用する
 */
export async function loadPhaser(): Promise<typeof import('phaser')> {
  // 既にキャッシュされている場合はそれを返す
  if (phaserCache) {
    return phaserCache
  }

  // 既にロード中の場合は、その Promise を返す
  if (loadingPromise) {
    return loadingPromise
  }

  // パフォーマンス計測開始
  performance.mark('phaser-load-start')

  // 動的インポートでPhaserをロード
  loadingPromise = import('phaser').then(phaserModule => {
    phaserCache = phaserModule
    loadingPromise = null

    // パフォーマンス計測終了
    performance.mark('phaser-load-end')
    performance.measure('phaser-loading', 'phaser-load-start', 'phaser-load-end')
    
    const measure = performance.getEntriesByName('phaser-loading')[0]
    console.log(`✅ Phaser loaded dynamically in ${measure.duration.toFixed(2)}ms`)

    return phaserModule
  }).catch(error => {
    loadingPromise = null
    console.error('❌ Failed to load Phaser:', error)
    throw error
  })

  return loadingPromise
}

/**
 * Phaserが既にロードされているかチェック
 */
export function isPhaserLoaded(): boolean {
  return phaserCache !== null
}

/**
 * Phaserのキャッシュをクリア（テスト用）
 */
export function clearPhaserCache(): void {
  phaserCache = null
  loadingPromise = null
}

/**
 * Phaserオブジェクトを取得（同期）
 * 事前にloadPhaser()でロードされている必要がある
 */
export function getPhaser(): typeof import('phaser') {
  if (!phaserCache) {
    throw new Error('Phaser is not loaded yet. Call loadPhaser() first.')
  }
  return phaserCache
}

/**
 * Phaser関連の型定義のエクスポート
 * 静的な型チェックのために必要
 */
export type PhaserTypes = {
  Game: import('phaser').Game
  Scene: import('phaser').Scene
  GameConfig: import('phaser').Types.Core.GameConfig
  GameObject: import('phaser').GameObjects.GameObject
  Container: import('phaser').GameObjects.Container
  Rectangle: import('phaser').GameObjects.Rectangle
  Text: import('phaser').GameObjects.Text
  Image: import('phaser').GameObjects.Image
  Sprite: import('phaser').GameObjects.Sprite
  Graphics: import('phaser').GameObjects.Graphics
}