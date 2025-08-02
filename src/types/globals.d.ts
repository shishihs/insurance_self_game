/// <reference types="vite/client" />

declare global {
  const process: {
    env: {
      NODE_ENV: 'development' | 'production' | 'test'
      [key: string]: string | undefined
    }
    setMaxListeners?: (n: number) => void
    memoryUsage: () => NodeJS.MemoryUsage
    listenerCount: (event: string) => number
    on: (event: string, listener: (...args: any[]) => void) => void
  }

  interface Window {
    gtag?: (...args: any[]) => void
    dataLayer?: any[]
  }

  function gtag(...args: any[]): void
  
  function generateCSRFToken(): string
  function validateCSRFToken(token: string): boolean
}

export {}