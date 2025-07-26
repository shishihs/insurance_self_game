import { describe, it, expect } from 'vitest'

describe('Simple Test', () => {
  it('should pass basic arithmetic', () => {
    expect(1 + 1).toBe(2)
  })

  it('should pass string comparison', () => {
    expect('hello').toBe('hello')
  })

  it('should pass array check', () => {
    const arr = [1, 2, 3]
    expect(arr).toHaveLength(3)
    expect(arr).toContain(2)
  })
})