/**
 * オブジェクトプールクラス
 * メモリ使用量を最適化するため、オブジェクトの再利用を管理
 */
export class ObjectPool<T> {
  private readonly pool: T[] = []
  private readonly createFn: () => T
  private readonly resetFn?: (obj: T) => void
  private readonly maxSize: number

  constructor(
    createFn: () => T,
    resetFn?: (obj: T) => void,
    maxSize: number = 100
  ) {
    this.createFn = createFn
    this.resetFn = resetFn
    this.maxSize = maxSize
  }

  /**
   * オブジェクトを取得（再利用または新規作成）
   */
  get(): T {
    const obj = this.pool.pop()
    if (obj) {
      this.resetFn?.(obj)
      return obj
    }
    return this.createFn()
  }

  /**
   * オブジェクトをプールに返却
   */
  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj)
    }
  }

  /**
   * プールをクリア
   */
  clear(): void {
    this.pool.length = 0
  }

  /**
   * プールの統計情報
   */
  getStats() {
    return {
      poolSize: this.pool.length,
      maxSize: this.maxSize,
      utilized: this.maxSize - this.pool.length
    }
  }
}

/**
 * パフォーマンス管理用のメモリプール
 */
export class MemoryPoolManager {
  private readonly pools: Map<string, ObjectPool<any>> = new Map()

  /**
   * プールを登録
   */
  registerPool<T>(name: string, pool: ObjectPool<T>): void {
    this.pools.set(name, pool)
  }

  /**
   * プールを取得
   */
  getPool<T>(name: string): ObjectPool<T> | undefined {
    return this.pools.get(name)
  }

  /**
   * 全プールをクリア
   */
  clearAll(): void {
    this.pools.forEach(pool => { pool.clear(); })
  }

  /**
   * メモリ使用状況の統計
   */
  getMemoryStats() {
    const stats: Record<string, any> = {}
    this.pools.forEach((pool, name) => {
      stats[name] = pool.getStats()
    })
    return stats
  }
}