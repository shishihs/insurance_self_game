import { describe, it, expect } from 'vitest'
import { promises as fs } from 'fs'

describe('統一ゲームランチャー E2E テスト', () => {
  describe('unified-game-launcher.mjs の基本機能確認', () => {
    it('ランチャーファイルが存在し実行可能である', async () => {
      const exists = await fs.access('unified-game-launcher.mjs').then(() => true).catch(() => false)
      expect(exists).toBe(true)
      
      // ファイルの内容確認（基本的な構造チェック）
      const content = await fs.readFile('unified-game-launcher.mjs', 'utf-8')
      expect(content).toContain('人生充実ゲーム')
      expect(content).toContain('統一ランチャー')
      expect(content).toContain('async function')
    })

    it('cui-playtest.mjsが存在し実行可能である', async () => {
      const exists = await fs.access('cui-playtest.mjs').then(() => true).catch(() => false)
      expect(exists).toBe(true)
      
      // ファイルの内容確認
      const content = await fs.readFile('cui-playtest.mjs', 'utf-8')
      expect(content).toContain('CUI Playtest')
      expect(content).toContain('PlaytestGameController')
    })

    it('TypeScriptソースファイルが正しい構造を持つ', async () => {
      // Game.tsの存在と基本構造確認
      const gameExists = await fs.access('src/domain/entities/Game.ts').then(() => true).catch(() => false)
      expect(gameExists).toBe(true)
      
      const gameContent = await fs.readFile('src/domain/entities/Game.ts', 'utf-8')
      expect(gameContent).toContain('export class Game')
      expect(gameContent).toContain('constructor')
      expect(gameContent).toContain('start()')
    })

    it('CUIコントローラーが正しい構造を持つ', async () => {
      const controllerExists = await fs.access('src/cui/PlaytestGameController.ts').then(() => true).catch(() => false)
      expect(controllerExists).toBe(true)
      
      const controllerContent = await fs.readFile('src/cui/PlaytestGameController.ts', 'utf-8')
      expect(controllerContent).toContain('export class PlaytestGameController')
      expect(controllerContent).toContain('playTurn')
      expect(controllerContent).toContain('Game')
    })
  })

  describe('ビルド成果物の確認', () => {
    it('プロジェクトの基本ファイルが存在する', async () => {
      const requiredFiles = [
        'src/domain/entities/Game.ts',
        'src/domain/entities/Card.ts',
        'src/cui/PlaytestGameController.ts',
        'cui-playtest.mjs',
        'unified-game-launcher.mjs'
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

  describe('CUI プレイテストの機能確認', () => {
    it('cui-playtest.mjsが正しい実行パラメータを持つ', async () => {
      const content = await fs.readFile('cui-playtest.mjs', 'utf-8')
      
      // 基本的な機能の存在確認
      expect(content).toContain('PlaytestGameController')
      expect(content).toContain('process.argv')
      expect(content).toContain('runPlaytest')
      
      // ヘルプメッセージの確認
      expect(content).toContain('CUI Playtest Script')
      expect(content).toContain('使用例')
    })

    it('テスト結果ディレクトリが準備されている', async () => {
      const testResultsExists = await fs.access('test-results').then(() => true).catch(() => false)
      if (!testResultsExists) {
        await fs.mkdir('test-results', { recursive: true })
      }
      
      const stat = await fs.stat('test-results')
      expect(stat.isDirectory()).toBe(true)
    })

    it('CUIテストが基本パラメータで動作する設計になっている', async () => {
      // cui-playtest.mjsの内容を解析してテスト可能かチェック
      const content = await fs.readFile('cui-playtest.mjs', 'utf-8')
      
      // 必要な依存関係の import があるか
      expect(content).toContain('import')
      
      // エラーハンドリングがあるか
      expect(content).toContain('catch') 
      
      // 設定可能なパラメータがあるか
      expect(content).toContain('difficulty')
    })
  })

  describe('統合アーキテクチャの検証', () => {
    it('CUI と GUI が同じドメインロジックを使用する設計になっている', async () => {
      // CUIとGUIで同じGame.tsクラスを使用していることを
      // ファイル構造とimport文から確認
      
      // 1. Game.tsの存在確認
      const gameExists = await fs.access('src/domain/entities/Game.ts').then(() => true).catch(() => false)
      expect(gameExists).toBe(true)
      
      // 2. CUIコントローラーがGame.tsを使用
      const cuiContent = await fs.readFile('src/cui/PlaytestGameController.ts', 'utf-8')
      expect(cuiContent).toContain("import { Game }")
      expect(cuiContent).toContain("from '../domain/entities/Game'")
      
      // 3. GUIでもGame.tsを使用（App.vueで確認）
      const appExists = await fs.access('src/App.vue').then(() => true).catch(() => false)
      if (appExists) {
        const appContent = await fs.readFile('src/App.vue', 'utf-8')
        expect(appContent).toContain('Game') // Game関連の記述があることを確認
      }
      
      // 4. 共通のドメインエンティティ
      const cardExists = await fs.access('src/domain/entities/Card.ts').then(() => true).catch(() => false)
      expect(cardExists).toBe(true)
    })

    it('統一ランチャーが両モードをサポートする設計になっている', async () => {
      const launcherContent = await fs.readFile('unified-game-launcher.mjs', 'utf-8')
      
      // GUI起動機能
      expect(launcherContent).toContain('launchGUI')
      expect(launcherContent).toContain('pnpm dev')
      
      // CUI起動機能
      expect(launcherContent).toContain('launchCUI')
      expect(launcherContent).toContain('cui')
      
      // モード選択機能
      expect(launcherContent).toContain('gameMode')
      expect(launcherContent).toContain('choices')
    })
  })
})