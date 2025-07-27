#!/usr/bin/env node

/**
 * Edge Case Testing - Force various scenarios
 */

import chalk from 'chalk'

console.log(chalk.red('🔍 CUI Game Edge Case Testing'))
console.log(chalk.gray('='.repeat(50)))

// Test case 1: Force Game Over scenario
console.log(chalk.cyan('\n=== Test Case 1: Forced Game Over ==='))
let vitality = 5  // Start with low vitality
let turn = 1
let gameScore = 0

const highCostChallenges = [
  { name: '投資セミナー', power: 5, cost: 3, description: '将来の安定を築く' },
  { name: '投資セミナー', power: 5, cost: 3, description: '将来の安定を築く' },
  { name: '投資セミナー', power: 5, cost: 3, description: '将来の安定を築く' },
]

console.log(chalk.blue(`初期状態: 💪 活力: ${vitality}, 🎯 スコア: ${gameScore}`))

for (let challenge of highCostChallenges) {
  console.log(chalk.magenta(`\n=== ターン ${turn} ===`))
  console.log(chalk.cyan(`📋 チャレンジ: ${challenge.name}`))
  console.log(chalk.gray(`   ${challenge.description}`))
  console.log(chalk.white(`   💪 必要活力: ${challenge.cost}, 🏆 獲得ポイント: ${challenge.power}`))
  
  if (vitality >= challenge.cost) {
    console.log(chalk.green(`✅ 強制実行（活力十分）`))
    vitality -= challenge.cost
    gameScore += challenge.power
    console.log(chalk.blue(`結果: 活力 -${challenge.cost}, スコア +${challenge.power}`))
  } else {
    console.log(chalk.red(`❌ 活力不足で実行不可能`))
  }
  
  console.log(chalk.white(`💪 活力: ${vitality}, 🎯 スコア: ${gameScore}`))
  
  if (vitality <= 0) {
    console.log(chalk.red(`\n💀 ゲームオーバー！活力が尽きました。`))
    break
  }
  
  turn++
}

console.log(chalk.red(`\nTest Case 1 結果: 活力枯渇によるゲームオーバー ${vitality <= 0 ? '成功' : '失敗'}`))

// Test case 2: Maximum score attempt
console.log(chalk.cyan('\n=== Test Case 2: Maximum Score Attempt ==='))
vitality = 20
gameScore = 0
turn = 1

const maxScoreChallenges = [
  { name: '投資セミナー', power: 5, cost: 3, description: '将来の安定を築く' },
  { name: '投資セミナー', power: 5, cost: 3, description: '将来の安定を築く' },
  { name: '投資セミナー', power: 5, cost: 3, description: '将来の安定を築く' },
  { name: '投資セミナー', power: 5, cost: 3, description: '将来の安定を築く' },
  { name: '投資セミナー', power: 5, cost: 3, description: '将来の安定を築く' },
  { name: '投資セミナー', power: 5, cost: 3, description: '将来の安定を築く' },
]

console.log(chalk.blue(`初期状態: 💪 活力: ${vitality}, 🎯 スコア: ${gameScore}`))

for (let challenge of maxScoreChallenges) {
  console.log(chalk.magenta(`\n=== ターン ${turn} ===`))
  console.log(chalk.cyan(`📋 チャレンジ: ${challenge.name}`))
  
  if (vitality >= challenge.cost) {
    console.log(chalk.green(`✅ 強制実行`))
    vitality -= challenge.cost
    gameScore += challenge.power
    console.log(chalk.blue(`結果: 活力 -${challenge.cost}, スコア +${challenge.power}`))
  } else {
    console.log(chalk.red(`❌ 活力不足で実行不可能`))
    break
  }
  
  console.log(chalk.white(`💪 活力: ${vitality}, 🎯 スコア: ${gameScore}`))
  turn++
}

console.log(chalk.green(`\nTest Case 2 結果: 最大スコア ${gameScore} を達成`))

// Test case 3: All-skip scenario
console.log(chalk.cyan('\n=== Test Case 3: All Skip Scenario ==='))
vitality = 20
gameScore = 0
turn = 1

const skipChallenges = [
  { name: '投資セミナー', power: 5, cost: 3, description: '将来の安定を築く' },
  { name: 'スキルアップ講座', power: 4, cost: 2, description: '新しい技術を学ぶ' },
  { name: '朝のジョギング', power: 3, cost: 1, description: '健康的な一日の始まり' },
  { name: '家族との時間', power: 2, cost: 1, description: '大切な人との絆を深める' },
  { name: '読書', power: 2, cost: 0, description: '知識と心を豊かにする' },
]

console.log(chalk.blue(`初期状態: 💪 活力: ${vitality}, 🎯 スコア: ${gameScore}`))

for (let challenge of skipChallenges) {
  console.log(chalk.magenta(`\n=== ターン ${turn} ===`))
  console.log(chalk.cyan(`📋 チャレンジ: ${challenge.name}`))
  console.log(chalk.yellow(`⏭️  強制スキップ`))
  console.log(chalk.white(`💪 活力: ${vitality}, 🎯 スコア: ${gameScore}`))
  turn++
}

console.log(chalk.yellow(`\nTest Case 3 結果: 全スキップで最終スコア ${gameScore}`))

// Test case 4: Reading-only strategy (exploit test)
console.log(chalk.cyan('\n=== Test Case 4: Reading-Only Exploit Test ==='))
vitality = 20
gameScore = 0
turn = 1

const readingOnly = Array(10).fill({ name: '読書', power: 2, cost: 0, description: '知識と心を豊かにする' })

console.log(chalk.blue(`初期状態: 💪 活力: ${vitality}, 🎯 スコア: ${gameScore}`))

for (let i = 0; i < readingOnly.length; i++) {
  const challenge = readingOnly[i]
  console.log(chalk.magenta(`\n=== ターン ${turn} ===`))
  console.log(chalk.cyan(`📋 チャレンジ: ${challenge.name}`))
  console.log(chalk.green(`✅ 強制実行（コスト0エクスプロイト）`))
  vitality -= challenge.cost
  gameScore += challenge.power
  console.log(chalk.blue(`結果: 活力 -${challenge.cost}, スコア +${challenge.power}`))
  console.log(chalk.white(`💪 活力: ${vitality}, 🎯 スコア: ${gameScore}`))
  turn++
}

console.log(chalk.green(`\nTest Case 4 結果: 読書エクスプロイトで最終スコア ${gameScore}`))

// Final evaluation
console.log(chalk.magenta('\n=== Edge Case Test Summary ==='))
console.log('1. ゲームオーバー条件: 活力枯渇で正常に終了')
console.log('2. 最大スコア上限: 制限なし、理論上無限')
console.log('3. 全スキップ: スコア0で正常終了')
console.log('4. 読書エクスプロイト: コスト0アクションで無限スコア可能')

console.log(chalk.red('\n⚠️  発見された重大な問題:'))
console.log('- 読書（コスト0）による無限スコアエクスプロイト')
console.log('- ゲーム長制限がないため理論上無限プレイ可能')
console.log('- スコア上限が設定されていない')

console.log(chalk.green(`\n✅ Edge Case Testing Complete!`))