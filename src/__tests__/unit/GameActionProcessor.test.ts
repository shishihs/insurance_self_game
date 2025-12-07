import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GameActionProcessor, DrawCardsProcessor } from '@/domain/services/GameActionProcessor'
import { Game } from '@/domain/entities/Game'
import { Card } from '@/domain/entities/Card'
import type { DrawResult } from '@/domain/services/CardManager'

describe('GameActionProcessor', () => {
  let game: Game
  let processor: GameActionProcessor

  beforeEach(() => {
    game = new Game()
    processor = new GameActionProcessor()
  })

  describe('DrawCardsProcessor', () => {
    it('should draw cards from cardManager directly', async () => {
      // Arrange
      const mockCards: Card[] = [
        new Card({
          id: 'card1',
          name: 'テストカード1',
          type: 'life',
          power: 1,
          description: 'テスト用カード1',
          cost: 0,
          effects: []
        }),
        new Card({
          id: 'card2',
          name: 'テストカード2',
          type: 'life',
          power: 2,
          description: 'テスト用カード2',
          cost: 0,
          effects: []
        })
      ]

      const mockDrawResult: DrawResult = {
        drawnCards: mockCards,
        discardedCards: [],
        troubleCards: []
      }

      // CardManagerのdrawCardsメソッドをモック
      vi.spyOn(game.cardManager, 'drawCards').mockReturnValue(mockDrawResult)

      // Act
      const result = await processor.executeAction('draw_cards', game, 2)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockCards)
      expect(game.cardManager.drawCards).toHaveBeenCalledWith(2)
      expect(game.cardManager.drawCards).toHaveBeenCalledTimes(1)
    })

    it('should validate draw count', async () => {
      // Act & Assert - 0枚
      const result1 = await processor.executeAction('draw_cards', game, 0)
      expect(result1.success).toBe(false)
      expect(result1.error).toContain('ドロー枚数は1以上')

      // Act & Assert - 11枚
      const result2 = await processor.executeAction('draw_cards', game, 11)
      expect(result2.success).toBe(false)
      expect(result2.error).toContain('ドロー枚数は10枚以下')
    })

    it('should include correct effects', async () => {
      // Arrange
      const mockCards: Card[] = [
        new Card({
          id: 'card1',
          name: 'テストカード1',
          type: 'life',
          power: 1,
          description: 'テスト用カード1',
          cost: 0,
          effects: []
        })
      ]

      const mockDrawResult: DrawResult = {
        drawnCards: mockCards,
        discardedCards: [],
        troubleCards: []
      }

      vi.spyOn(game.cardManager, 'drawCards').mockReturnValue(mockDrawResult)

      // Act
      const result = await processor.executeAction('draw_cards', game, 1)

      // Assert
      expect(result.effects).toBeDefined()
      expect(result.effects).toHaveLength(1)
      expect(result.effects![0]).toEqual({
        type: 'card_draw',
        description: '1枚のカードをドローしました',
        cards: mockCards
      })
    })
  })

  describe('Unknown action handling', () => {
    it('should handle unknown action types', async () => {
      // Act
      const result = await processor.executeAction('unknown_action', game, {})

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('未知のアクションタイプ: unknown_action')
    })
  })
})