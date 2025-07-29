import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StatisticsDataService } from '../../domain/services/StatisticsDataService'
import { Game } from '../../domain/entities/Game'

describe('StatisticsDataService', () => {
  let service: StatisticsDataService
  let mockGame: Game

  beforeEach(() => {
    service = StatisticsDataService.getInstance()
    
    // モックゲームを作成
    mockGame = new Game({
      difficulty: 'normal',
      startingVitality: 100,
      startingHandSize: 5,
      maxHandSize: 10,
      dreamCardCount: 3
    })
    
    mockGame.start()
  })

  describe('getInstance', () => {
    it('シングルトンインスタンスを返す', () => {
      const service1 = StatisticsDataService.getInstance()
      const service2 = StatisticsDataService.getInstance()
      expect(service1).toBe(service2)
    })
  })

  describe('startGameTracking', () => {
    it('ゲームトラッキングを開始できる', () => {
      expect(() => service.startGameTracking(mockGame)).not.toThrow()
      
      const realtimeData = service.getRealtimeStatistics()
      expect(realtimeData).toBeTruthy()
      expect(realtimeData?.currentSession).toBeTruthy()
      expect(realtimeData?.live).toBeTruthy()
    })
  })

  describe('updateTurnData', () => {
    beforeEach(() => {
      service.startGameTracking(mockGame)
    })

    it('ターンデータを更新できる', () => {
      const decisionTime = 5.5
      
      expect(() => service.updateTurnData(mockGame, decisionTime)).not.toThrow()
      
      const realtimeData = service.getRealtimeStatistics()
      expect(realtimeData?.live.vitalityOverTime.length).toBeGreaterThan(1)
      expect(realtimeData?.live.decisionTimes.length).toBeGreaterThan(0)
    })

    it('決定時間なしでもターンデータを更新できる', () => {
      expect(() => service.updateTurnData(mockGame)).not.toThrow()
      
      const realtimeData = service.getRealtimeStatistics()
      expect(realtimeData?.live.vitalityOverTime.length).toBeGreaterThan(1)
    })
  })

  describe('finishGameTracking', () => {
    beforeEach(() => {
      service.startGameTracking(mockGame)
      service.updateTurnData(mockGame, 3.0)
    })

    it('ゲームトラッキングを終了できる', () => {
      expect(() => service.finishGameTracking(mockGame)).not.toThrow()
    })
  })

  describe('generateStatistics', () => {
    beforeEach(() => {
      // テスト用のゲームデータを追加
      service.startGameTracking(mockGame)
      service.updateTurnData(mockGame, 4.5)
      service.finishGameTracking(mockGame)
    })

    it('統計データを生成できる', () => {
      const stats = service.generateStatistics()
      
      expect(stats).toBeTruthy()
      expect(stats.totalGames).toBeGreaterThanOrEqual(0)
      expect(stats.completedGames).toBeGreaterThanOrEqual(0)
      expect(stats.averageGameDuration).toBeGreaterThanOrEqual(0)
      expect(stats.gameHistoryByDate).toBeDefined()
      expect(Array.isArray(stats.gameHistoryByDate)).toBe(true)
    })

    it('フィルターを適用して統計データを生成できる', () => {
      const filter = {
        dateRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 昨日から
          end: new Date() // 今まで
        }
      }
      
      const stats = service.generateStatistics(filter)
      expect(stats).toBeTruthy()
    })
  })

  describe('exportData', () => {
    it('JSONフォーマットでデータをエクスポートできる', () => {
      const jsonData = service.exportData('json')
      expect(typeof jsonData).toBe('string')
      expect(() => JSON.parse(jsonData)).not.toThrow()
    })

    it('CSVフォーマットでデータをエクスポートできる', () => {
      const csvData = service.exportData('csv')
      expect(typeof csvData).toBe('string')
      expect(csvData).toContain('統計項目,値')
    })
  })

  describe('subscribe', () => {
    it('統計更新を購読できる', () => {
      const mockListener = vi.fn()
      const unsubscribe = service.subscribe(mockListener)
      
      expect(typeof unsubscribe).toBe('function')
      
      // 購読解除
      unsubscribe()
    })
  })

  describe('リアルタイムデータ', () => {
    it('リアルタイム統計データを取得できる', () => {
      service.startGameTracking(mockGame)
      
      const realtimeData = service.getRealtimeStatistics()
      expect(realtimeData).toBeTruthy()
      expect(realtimeData?.currentSession.gamesPlayed).toBe(0)
      expect(realtimeData?.live.vitalityOverTime.length).toBeGreaterThan(0)
    })
  })

  describe('パフォーマンス', () => {
    it('大量のターンデータを効率的に処理できる', () => {
      service.startGameTracking(mockGame)
      
      const startTime = Date.now()
      
      // 100ターン分のデータを追加
      for (let i = 0; i < 100; i++) {
        service.updateTurnData(mockGame, Math.random() * 10 + 1)
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // 処理時間が合理的な範囲内であることを確認（1秒未満）
      expect(duration).toBeLessThan(1000)
      
      const realtimeData = service.getRealtimeStatistics()
      expect(realtimeData?.live.vitalityOverTime.length).toBe(101) // 初期値 + 100回更新
    })
  })
})