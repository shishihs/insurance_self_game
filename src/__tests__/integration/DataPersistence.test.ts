import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Game } from '@/domain/entities/Game'
import { Card } from '@/domain/entities/Card'
import { RiskRewardChallenge } from '@/domain/entities/RiskRewardChallenge'
import { GameController } from '@/application/controllers/GameController'
import { GameRepository } from '@/infrastructure/repositories/GameRepository'
import { StatisticsRepository } from '@/infrastructure/repositories/StatisticsRepository'
import { GameAnalyticsService } from '@/application/services/GameAnalyticsService'

describe('データ永続化統合テスト', () => {
  let gameController: GameController
  let gameRepository: GameRepository
  let statisticsRepository: StatisticsRepository
  let analyticsService: GameAnalyticsService

  beforeEach(() => {
    // LocalStorageをクリア
    localStorage.clear()
    
    // リポジトリとサービスのインスタンス化
    gameRepository = new GameRepository()
    statisticsRepository = new StatisticsRepository()
    analyticsService = new GameAnalyticsService(statisticsRepository)
    gameController = new GameController(gameRepository, analyticsService)
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('ゲーム状態の保存と復元', () => {
    it('基本的なゲーム状態が正しく保存・復元される', async () => {
      // ゲーム開始
      const game = await gameController.startNewGame('TestPlayer')
      const gameId = game.id
      
      // いくつかの操作を実行
      game.vitality = 80
      game.turn = 5
      game.stage = 'middle'
      
      // 保存
      await gameController.saveGame(game)
      
      // 別のインスタンスで読み込み
      const newController = new GameController(
        new GameRepository(),
        new GameAnalyticsService(new StatisticsRepository())
      )
      
      const loadedGame = await newController.loadGame(gameId)
      
      expect(loadedGame).toBeDefined()
      expect(loadedGame!.playerName).toBe('TestPlayer')
      expect(loadedGame!.vitality).toBe(80)
      expect(loadedGame!.turn).toBe(5)
      expect(loadedGame!.stage).toBe('middle')
    })

    it('保険カードの状態が正しく保存・復元される', async () => {
      const game = await gameController.startNewGame('TestPlayer')
      
      // 保険カードを追加
      const insuranceCard = new Card({
        id: 'ins-1',
        name: '健康保険',
        description: 'テスト用',
        type: 'insurance',
        power: 0,
        cost: 10,
        insuranceType: 'health',
        coverage: 50,
        usageCount: 2
      })
      
      game.addInsuranceCard(insuranceCard)
      
      // 保存
      await gameController.saveGame(game)
      
      // 読み込み
      const loadedGame = await gameController.loadGame(game.id)
      
      expect(loadedGame!.insuranceCards).toHaveLength(1)
      expect(loadedGame!.insuranceCards[0].name).toBe('健康保険')
      expect(loadedGame!.insuranceCards[0].insuranceType).toBe('health')
      expect(loadedGame!.insuranceCards[0].coverage).toBe(50)
      expect(loadedGame!.insuranceCards[0].usageCount).toBe(2)
    })

    it('複雑なゲーム状態（夢カード、チャレンジ等）が保存される', async () => {
      const game = await gameController.startNewGame('TestPlayer')
      
      // 夢カードを追加
      const dreamCard = new Card({
        id: 'dream-1',
        name: '世界旅行',
        description: '夢の実現',
        type: 'life',
        power: 15,
        cost: 0,
        dreamCategory: 'social'
      })
      
      game.deck.addCard(dreamCard)
      game.drawnCards.push(dreamCard)
      
      // リスク・リワードチャレンジを追加
      const challenge = RiskRewardChallenge.createRiskChallenge('youth', 'high')
      game.deck.addCard(challenge)
      
      // 保存
      await gameController.saveGame(game)
      
      // 読み込み
      const loadedGame = await gameController.loadGame(game.id)
      
      expect(loadedGame!.drawnCards).toHaveLength(1)
      expect(loadedGame!.drawnCards[0].name).toBe('世界旅行')
      expect(loadedGame!.drawnCards[0].dreamCategory).toBe('social')
      
      const loadedChallenge = loadedGame!.deck.getCards()
        .find(card => card instanceof RiskRewardChallenge)
      expect(loadedChallenge).toBeDefined()
    })

    it('セーブデータのバージョン管理が機能する', async () => {
      const game = await gameController.startNewGame('TestPlayer')
      
      // 古いバージョンのセーブデータをシミュレート
      const oldSaveData = {
        version: '0.1.0',
        gameId: game.id,
        playerName: 'OldPlayer',
        vitality: 100,
        // 新しいプロパティが欠けている
      }
      
      localStorage.setItem(`game_${game.id}`, JSON.stringify(oldSaveData))
      
      // 読み込み時にマイグレーションが行われる
      const loadedGame = await gameController.loadGame(game.id)
      
      expect(loadedGame).toBeDefined()
      expect(loadedGame!.playerName).toBe('OldPlayer')
      // デフォルト値が設定される
      expect(loadedGame!.maxVitality).toBe(100)
      expect(loadedGame!.stage).toBe('youth')
    })
  })

  describe('統計データの永続化', () => {
    it('ゲーム結果が統計に記録される', async () => {
      const game = await gameController.startNewGame('TestPlayer')
      
      // ゲームを進行
      game.vitality = 120
      game.turn = 20
      game.stage = 'fulfillment'
      
      // ゲーム終了
      await gameController.endGame(game.id, 'victory')
      
      // 統計を確認
      const stats = await analyticsService.getPlayerStatistics('TestPlayer')
      
      expect(stats.totalGames).toBe(1)
      expect(stats.victories).toBe(1)
      expect(stats.averageScore).toBeGreaterThan(0)
    })

    it('複数ゲームの統計が正しく集計される', async () => {
      // 3つのゲームをプレイ
      for (let i = 0; i < 3; i++) {
        const game = await gameController.startNewGame('TestPlayer')
        game.vitality = 50 + i * 20
        game.turn = 15 + i * 5
        
        const result = i < 2 ? 'victory' : 'defeat'
        await gameController.endGame(game.id, result)
      }
      
      const stats = await analyticsService.getPlayerStatistics('TestPlayer')
      
      expect(stats.totalGames).toBe(3)
      expect(stats.victories).toBe(2)
      expect(stats.defeats).toBe(1)
      expect(stats.winRate).toBeCloseTo(0.667, 2)
    })

    it('保険使用統計が記録される', async () => {
      const game = await gameController.startNewGame('TestPlayer')
      
      // 保険を追加して使用
      const insurance = new Card({
        id: 'ins-1',
        name: '健康保険',
        type: 'insurance',
        power: 0,
        cost: 10,
        insuranceType: 'health',
        coverage: 50
      })
      
      game.addInsuranceCard(insurance)
      game.useInsurance(insurance)
      
      await gameController.saveGame(game)
      await gameController.endGame(game.id, 'victory')
      
      const stats = await analyticsService.getPlayerStatistics('TestPlayer')
      
      expect(stats.insuranceUsage.health).toBe(1)
      expect(stats.totalInsuranceUsed).toBe(1)
    })
  })

  describe('エラーハンドリングとリカバリー', () => {
    it('破損したセーブデータを検出して適切に処理する', async () => {
      const gameId = 'test-game-id'
      
      // 破損したデータを保存
      localStorage.setItem(`game_${gameId}`, 'invalid json data')
      
      // 読み込み試行
      const result = await gameController.loadGame(gameId)
      
      expect(result).toBeNull()
    })

    it('ストレージ容量超過時の処理', async () => {
      // LocalStorageの容量制限をシミュレート
      const mockSetItem = vi.spyOn(Storage.prototype, 'setItem')
      mockSetItem.mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      
      const game = await gameController.startNewGame('TestPlayer')
      
      // 保存試行
      const saveResult = await gameController.saveGame(game)
      
      expect(saveResult).toBe(false)
      
      mockSetItem.mockRestore()
    })

    it('自動セーブ機能が正しく動作する', async () => {
      const game = await gameController.startNewGame('TestPlayer')
      
      // 自動セーブを有効化
      gameController.enableAutoSave(game.id, 1000) // 1秒ごと
      
      // ゲーム状態を変更
      game.vitality = 75
      game.turn = 10
      
      // 自動セーブが実行されるまで待機
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // 読み込んで確認
      const loadedGame = await gameController.loadGame(game.id)
      
      expect(loadedGame!.vitality).toBe(75)
      expect(loadedGame!.turn).toBe(10)
      
      // 自動セーブを無効化
      gameController.disableAutoSave()
    })
  })

  describe('データマイグレーション', () => {
    it('旧バージョンのデータが新バージョンに移行される', async () => {
      const gameId = 'legacy-game'
      
      // v0.1.0のデータ構造
      const legacyData = {
        version: '0.1.0',
        gameId,
        playerName: 'LegacyPlayer',
        health: 80, // 旧: health → 新: vitality
        round: 5,   // 旧: round → 新: turn
        // insuranceCards プロパティが存在しない
      }
      
      localStorage.setItem(`game_${gameId}`, JSON.stringify(legacyData))
      
      // マイグレーション実行
      const migrated = await gameController.loadGame(gameId)
      
      expect(migrated).toBeDefined()
      expect(migrated!.vitality).toBe(80) // healthからvitalityへ
      expect(migrated!.turn).toBe(5)      // roundからturnへ
      expect(migrated!.insuranceCards).toEqual([]) // デフォルト値
    })

    it('複数バージョンを経由したマイグレーションが成功する', async () => {
      const gameId = 'multi-version-game'
      
      // v0.0.1の非常に古いデータ
      const veryOldData = {
        version: '0.0.1',
        id: gameId,
        player: 'AncientPlayer',
        hp: 100,
        level: 1
      }
      
      localStorage.setItem(`game_${gameId}`, JSON.stringify(veryOldData))
      
      // マイグレーションチェーンが正しく実行される
      const migrated = await gameController.loadGame(gameId)
      
      expect(migrated).toBeDefined()
      expect(migrated!.playerName).toBe('AncientPlayer')
      expect(migrated!.vitality).toBe(100)
      expect(migrated!.stage).toBe('youth') // デフォルト値
    })
  })

  describe('並行アクセスとデータ整合性', () => {
    it('同時書き込みでもデータが破損しない', async () => {
      const game = await gameController.startNewGame('TestPlayer')
      
      // 2つの異なる更新を同時に実行
      const update1 = async () => {
        game.vitality = 90
        await gameController.saveGame(game)
      }
      
      const update2 = async () => {
        game.turn = 15
        await gameController.saveGame(game)
      }
      
      // 並行実行
      await Promise.all([update1(), update2()])
      
      // 最終的なデータを確認
      const finalGame = await gameController.loadGame(game.id)
      
      expect(finalGame).toBeDefined()
      // 両方の更新が反映されている
      expect(finalGame!.vitality).toBe(90)
      expect(finalGame!.turn).toBe(15)
    })

    it('読み込み中の書き込みが適切に処理される', async () => {
      const game = await gameController.startNewGame('TestPlayer')
      
      // 読み込みと書き込みを同時実行
      const readPromise = gameController.loadGame(game.id)
      
      game.vitality = 85
      const writePromise = gameController.saveGame(game)
      
      const [readResult, writeResult] = await Promise.all([
        readPromise,
        writePromise
      ])
      
      expect(readResult).toBeDefined()
      expect(writeResult).toBe(true)
      
      // 書き込みが反映されていることを確認
      const finalGame = await gameController.loadGame(game.id)
      expect(finalGame!.vitality).toBe(85)
    })
  })
})