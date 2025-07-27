#!/usr/bin/env node

/**
 * 統一ゲームランチャー
 * CUIとGUIの両方を同じGameControllerとGameRendererで実行
 * 
 * 特徴:
 * - 同一のドメインロジック (Game.ts)
 * - 同一のコントローラー (GameController.ts)
 * - レンダラーの差し替えのみ (CUI/GUI)
 * - DDDアーキテクチャの実証
 */

import chalk from 'chalk'
import inquirer from 'inquirer'

console.log(chalk.blue.bold('🎮 人生充実ゲーム - 統一ランチャー'))
console.log(chalk.gray('CUI・GUI両対応 - 同一ドメインロジック使用\n'))

// 起動オプション選択
const { gameMode } = await inquirer.prompt([
  {
    type: 'list',
    name: 'gameMode',
    message: 'ゲームモードを選択してください:',
    choices: [
      {
        name: '🖥️  GUI版 (Phaser + Vue) - ブラウザーでプレイ',
        value: 'gui'
      },
      {
        name: '⌨️  CUI版 (Terminal) - コマンドラインでプレイ',
        value: 'cui'
      },
      {
        name: '🔧 CUIプレイテスト - 自動ログ生成',
        value: 'cui-test'
      },
      {
        name: '📊 技術実証デモ - アーキテクチャ説明',
        value: 'demo'
      }
    ]
  }
])

console.log(chalk.green(`\n✅ ${gameMode}モードを選択しました\n`))

switch (gameMode) {
  case 'gui':
    await launchGUI()
    break
  case 'cui':
    await launchCUI()
    break
  case 'cui-test':
    await launchCUITest()
    break
  case 'demo':
    await launchDemo()
    break
}

// === モード別実装 ===

async function launchGUI() {
  console.log(chalk.blue('🌐 GUI版を起動します...'))
  console.log(chalk.gray('- Vue.js + Phaser.js'))
  console.log(chalk.gray('- PhaserGameRenderer使用'))
  console.log(chalk.gray('- 同一GameControllerとGame.tsドメイン使用\n'))
  
  try {
    const { exec } = await import('child_process')
    // const { promisify } = await import('util') // 未使用
    // const execAsync = promisify(exec) // 未使用のため一時的にコメントアウト
    
    console.log(chalk.yellow('📦 開発サーバーを起動中...'))
    console.log(chalk.gray('💡 ブラウザーが自動で開きます'))
    console.log(chalk.gray('💡 Ctrl+C で終了\n'))
    
    // 開発サーバー起動
    exec('pnpm dev', (error, stdout, stderr) => {
      if (stdout) console.log(stdout)
      if (stderr) console.log(stderr)
      if (error) {
        console.error(chalk.red('❌ 開発サーバー起動エラー:'), error.message)
        console.log(chalk.yellow('💡 "pnpm install" を実行してからやり直してください'))
      }
    })
    
  } catch (error) {
    console.error(chalk.red('❌ GUI起動エラー:'), error.message)
    console.log(chalk.yellow('💡 "pnpm install" を実行してからやり直してください'))
  }
}

async function launchCUI() {
  console.log(chalk.blue('⌨️  CUI版を起動します...'))
  console.log(chalk.gray('- InteractiveCUIRenderer使用'))
  console.log(chalk.gray('- 同一GameControllerとGame.tsドメイン使用\n'))
  
  try {
    // CUIオプション選択
    const { cuiMode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'cuiMode',
        message: 'CUIモードを選択:',
        choices: [
          { name: '🎮 通常プレイ', value: 'play' },
          { name: '🤖 AIデモ', value: 'demo' },
          { name: '🎓 チュートリアル', value: 'tutorial' },
          { name: '⚡ ベンチマーク', value: 'benchmark' }
        ]
      }
    ])

    const { exec } = await import('child_process')
    
    let command = 'node dist/cui/cli.js'
    switch (cuiMode) {
      case 'play':
        command += ' play'
        break
      case 'demo':
        command += ' demo'
        break
      case 'tutorial':
        command += ' tutorial'
        break
      case 'benchmark':
        command += ' benchmark --games 50'
        break
    }
    
    console.log(chalk.yellow('🔧 ビルド確認...'))
    exec('pnpm build', (buildError) => {
      if (buildError) {
        console.error(chalk.red('❌ ビルドエラー:'), buildError.message)
        return
      }
      
      console.log(chalk.green('✅ ビルド完了'))
      console.log(chalk.blue(`🚀 実行中: ${command}\n`))
      
      exec(command, (error, stdout, stderr) => {
        if (stdout) console.log(stdout)
        if (stderr) console.log(stderr)
        if (error) {
          console.error(chalk.red('❌ CUI実行エラー:'), error.message)
        }
      })
    })
    
  } catch (error) {
    console.error(chalk.red('❌ CUI起動エラー:'), error.message)
  }
}

async function launchCUITest() {
  console.log(chalk.blue('🔧 CUIプレイテストを起動します...'))
  console.log(chalk.gray('- 自動プレイテストログ生成'))
  console.log(chalk.gray('- インクリメント番号管理'))
  console.log(chalk.gray('- 本物のGameControllerとGame.tsドメイン使用\n'))
  
  try {
    // テスト目的を入力
    const { purpose } = await inquirer.prompt([
      {
        type: 'input',
        name: 'purpose',
        message: 'テストの目的を入力してください:',
        default: 'CUIテスト'
      }
    ])
    
    console.log(chalk.green(`🎯 テスト目的: ${purpose}`))
    console.log(chalk.blue('🚀 プレイテスト開始...\n'))
    
    const { exec } = await import('child_process')
    
    exec(`node cui-playtest.mjs "${purpose}"`, (error, stdout, stderr) => {
      if (stdout) console.log(stdout)
      if (stderr) console.log(stderr)
      if (error) {
        console.error(chalk.red('❌ プレイテスト実行エラー:'), error.message)
        console.log(chalk.yellow('💡 "pnpm build" を実行してからやり直してください'))
      }
    })
    
  } catch (error) {
    console.error(chalk.red('❌ プレイテスト起動エラー:'), error.message)
  }
}

async function launchDemo() {
  console.log(chalk.blue('📊 DDD技術実証デモ'))
  console.log(chalk.gray('アーキテクチャの説明とデモンストレーション\n'))
  
  console.log(chalk.cyan('🏗️  Domain-Driven Design (DDD) アーキテクチャ'))
  console.log(chalk.white(''))
  console.log(chalk.white('┌─────────────────────────────────────────┐'))
  console.log(chalk.white('│             Presentation Layer          │'))
  console.log(chalk.white('│  ┌─────────────┐  ┌─────────────────────┐│'))
  console.log(chalk.white('│  │   Vue.js    │  │    Terminal CUI     ││'))
  console.log(chalk.white('│  │  + Phaser   │  │   + Inquirer.js     ││'))
  console.log(chalk.white('│  └─────────────┘  └─────────────────────┘│'))
  console.log(chalk.white('└─────────────────────────────────────────┘'))
  console.log(chalk.white('           │                    │           '))
  console.log(chalk.yellow('┌─────────────────────────────────────────┐'))
  console.log(chalk.yellow('│            Interface Layer              │'))
  console.log(chalk.yellow('│  ┌─────────────────────────────────────┐ │'))
  console.log(chalk.yellow('│  │        GameRenderer                 │ │'))
  console.log(chalk.yellow('│  │  (共通インターフェース)                │ │'))
  console.log(chalk.yellow('│  └─────────────────────────────────────┘ │'))
  console.log(chalk.yellow('└─────────────────────────────────────────┘'))
  console.log(chalk.yellow('                     │                     '))
  console.log(chalk.green('┌─────────────────────────────────────────┐'))
  console.log(chalk.green('│           Application Layer             │'))
  console.log(chalk.green('│  ┌─────────────────────────────────────┐ │'))
  console.log(chalk.green('│  │        GameController               │ │'))
  console.log(chalk.green('│  │    (レンダラー非依存制御)              │ │'))
  console.log(chalk.green('│  └─────────────────────────────────────┘ │'))
  console.log(chalk.green('└─────────────────────────────────────────┘'))
  console.log(chalk.green('                     │                     '))
  console.log(chalk.blue('┌─────────────────────────────────────────┐'))
  console.log(chalk.blue('│              Domain Layer               │'))
  console.log(chalk.blue('│  ┌───────────┐ ┌───────────┐ ┌─────────┐ │'))
  console.log(chalk.blue('│  │  Game.ts  │ │  Card.ts  │ │ 値ＯＢ  │ │'))
  console.log(chalk.blue('│  │ (エンティティ)│ │(エンティティ)│ │(VO)     │ │'))
  console.log(chalk.blue('│  └───────────┘ └───────────┘ └─────────┘ │'))
  console.log(chalk.blue('└─────────────────────────────────────────┘'))
  console.log('')
  
  console.log(chalk.cyan('✨ 主要な特徴:'))
  console.log(chalk.white('1. 🎯 同一ドメインロジック - Game.tsがCUI・GUI両方で動作'))
  console.log(chalk.white('2. 🔌 レンダラー抽象化 - GameRendererで完全分離'))
  console.log(chalk.white('3. 🏗️ 依存性注入 - GameController(config, renderer)'))
  console.log(chalk.white('4. 🧪 テスタビリティ - 各層が独立してテスト可能'))
  console.log(chalk.white('5. 🚀 拡張性 - 新UI技術への対応が容易'))
  
  const { demoChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'demoChoice',
      message: '実際にデモを実行しますか？',
      choices: [
        { name: '🎮 CUI版でクイックデモ', value: 'cui-demo' },
        { name: '🌐 GUI版を起動', value: 'gui-demo' },
        { name: '🔚 説明のみで終了', value: 'exit' }
      ]
    }
  ])
  
  switch (demoChoice) {
    case 'cui-demo':
      console.log(chalk.blue('\n🚀 CUI版デモを開始...'))
      await launchCUITest()
      break
    case 'gui-demo':
      console.log(chalk.blue('\n🚀 GUI版デモを開始...'))
      await launchGUI()
      break
    case 'exit':
      console.log(chalk.green('\n👋 ありがとうございました！'))
      break
  }
}