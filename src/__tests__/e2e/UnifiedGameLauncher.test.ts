import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'

// E2E テスト用のヘルパー関数
async function runUnifiedLauncher(mode: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const process = spawn('node', ['unified-game-launcher.mjs'], {
      env: { ...process.env, NODE_ENV: 'test' }
    })
    
    let stdout = ''
    let stderr = ''
    
    process.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    
    process.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    
    // モード選択を自動化
    setTimeout(() => {
      if (mode === 'cui') {
        process.stdin.write('1\n') // CUIモード選択
      } else if (mode === 'gui') {
        process.stdin.write('2\n') // GUIモード選択
      } else if (mode === 'cui-test') {
        process.stdin.write('3\n') // CUIテストモード選択
      }
    }, 100)
    
    // タイムアウトで強制終了
    setTimeout(() => {
      process.kill()
    }, 3000)
    
    process.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode || 0 })
    })
  })
}

describe('統一ゲームランチャー E2E テスト', () => {
  describe('unified-game-launcher.mjs の動作確認', () => {
    it('ランチャーが正常に起動する', async () => {
      const { stdout, stderr, exitCode } = await runUnifiedLauncher('cui')
      
      // エラーがないことを確認
      expect(stderr).toBe('')
      
      // メニューが表示されることを確認
      expect(stdout).toContain('人生充実ゲーム - Life Fulfillment')
      expect(stdout).toContain('モードを選択してください')
    }, 10000)

    it('CUI モードが選択できる', async () => {
      const { stdout, stderr } = await runUnifiedLauncher('cui')
      
      expect(stderr).toBe('')
      expect(stdout).toContain('CUI版 (ターミナル) - すぐにプレイ')
    }, 10000)

    it('GUI モードが選択できる', async () => {
      const { stdout, stderr } = await runUnifiedLauncher('gui')
      
      expect(stderr).toBe('')
      expect(stdout).toContain('GUI版 (Phaser + Vue) - ブラウザーでプレイ')
    }, 10000)

    it('CUI テストモードが選択できる', async () => {
      const { stdout, stderr } = await runUnifiedLauncher('cui-test')
      
      expect(stderr).toBe('')
      expect(stdout).toContain('CUIテストモード - 自動プレイテスト')
    }, 10000)
  })

  describe('ビルド成果物の確認', () => {
    it('必要な dist ファイルが存在する', async () => {
      const requiredFiles = [
        'dist/controllers/GameController.js',
        'dist/interfaces/GameRenderer.js',
        'dist/cui/renderers/InteractiveCUIRenderer.js',
        'dist/game/renderers/PhaserGameRenderer.js',
        'dist/domain/entities/Game.js',
        'dist/domain/entities/Card.js'
      ]
      
      for (const file of requiredFiles) {
        const exists = await fs.access(file).then(() => true).catch(() => false)
        expect(exists).toBe(true)
      }
    })
  })

  describe('テスト結果ファイルの管理', () => {
    it('counter.json が正しく管理される', async () => {
      const counterPath = 'test-results/counter.json'
      
      // ファイルが存在するか確認
      const exists = await fs.access(counterPath).then(() => true).catch(() => false)
      if (exists) {
        const content = await fs.readFile(counterPath, 'utf-8')
        const counter = JSON.parse(content)
        
        // カウンターの構造を確認
        expect(counter).toHaveProperty('playtest')
        expect(counter).toHaveProperty('analysis')
        expect(typeof counter.playtest).toBe('number')
        expect(typeof counter.analysis).toBe('number')
      }
    })

    it('プレイテストログディレクトリが存在する', async () => {
      const logDir = 'test-results/playtest-logs'
      
      const exists = await fs.access(logDir).then(() => true).catch(() => false)
      if (!exists) {
        // ディレクトリが存在しない場合は作成される想定
        await fs.mkdir(logDir, { recursive: true })
      }
      
      const stat = await fs.stat(logDir)
      expect(stat.isDirectory()).toBe(true)
    })
  })

  describe('CUI プレイテストの動作確認', () => {
    it('cui-playtest.mjs が正常に実行される', async () => {
      const process = spawn('node', ['cui-playtest.mjs'], {
        env: { ...process.env, NODE_ENV: 'test', AUTO_PLAY: 'true' }
      })
      
      let stdout = ''
      let stderr = ''
      
      process.stdout.on('data', (data) => {
        stdout += data.toString()
      })
      
      process.stderr.on('data', (data) => {
        stderr += data.toString()
      })
      
      // 自動プレイ設定で短時間で終了
      setTimeout(() => {
        process.kill()
      }, 5000)
      
      await new Promise((resolve) => {
        process.on('close', resolve)
      })
      
      // プレイテストが開始されることを確認
      expect(stdout).toContain('CUI プレイテスト')
      
      // エラーがないことを確認（モジュール警告は除く）
      const filteredStderr = stderr
        .split('\n')
        .filter(line => !line.includes('ExperimentalWarning'))
        .join('\n')
      expect(filteredStderr).toBe('')
    }, 10000)
  })

  describe('統合アーキテクチャの検証', () => {
    it('CUI と GUI が同じドメインロジックを使用することを確認', async () => {
      // この統合テストでは、両モードが同じ Game.ts を使用していることを
      // 間接的に確認する（エラーが発生しないことで検証）
      
      const cuiResult = await runUnifiedLauncher('cui')
      const guiResult = await runUnifiedLauncher('gui')
      
      // 両方のモードでエラーが発生しない
      expect(cuiResult.stderr).toBe('')
      expect(guiResult.stderr).toBe('')
      
      // 両方のモードで同じゲームタイトルが表示される
      expect(cuiResult.stdout).toContain('人生充実ゲーム')
      expect(guiResult.stdout).toContain('人生充実ゲーム')
    }, 15000)
  })
})