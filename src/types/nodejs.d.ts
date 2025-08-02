/// <reference types="node" />

declare namespace NodeJS {
  interface MemoryUsage {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
    arrayBuffers?: number
  }

  interface Process extends EventEmitter {
    memoryUsage(): MemoryUsage
    setMaxListeners?(n: number): void
  }

  interface Global {
    gc?: () => void
  }
}

interface EventEmitter {
  addListener(event: string | symbol, listener: (...args: any[]) => void): this
  on(event: string | symbol, listener: (...args: any[]) => void): this
  once(event: string | symbol, listener: (...args: any[]) => void): this
  removeListener(event: string | symbol, listener: (...args: any[]) => void): this
  off(event: string | symbol, listener: (...args: any[]) => void): this
  removeAllListeners(event?: string | symbol): this
  setMaxListeners(n: number): this
  getMaxListeners(): number
  listeners(event: string | symbol): Function[]
  rawListeners(event: string | symbol): Function[]
  emit(event: string | symbol, ...args: any[]): boolean
  listenerCount(event: string | symbol): number
  prependListener(event: string | symbol, listener: (...args: any[]) => void): this
  prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this
  eventNames(): Array<string | symbol>
}

declare var global: ReturnType<typeof setTimeout>Global & typeof globalThis