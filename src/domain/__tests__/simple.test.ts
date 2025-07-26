// 最も基本的なテスト
import { test, expect } from 'vitest'

test('arithmetic', () => {
  expect(2 + 2).toBe(4)
})

test('string', () => {
  expect('test').toBe('test')
})

test('boolean', () => {
  expect(true).toBe(true)
})