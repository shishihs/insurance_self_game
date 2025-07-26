import { readFileSync } from 'fs'
import { createInterface } from 'readline'

const principles = readFileSync('./docs/PRINCIPLES.md', 'utf-8')
console.log(principles.match(/タスク完了時の復唱[\s\S]*?---/)[0])
// 対話的な確認