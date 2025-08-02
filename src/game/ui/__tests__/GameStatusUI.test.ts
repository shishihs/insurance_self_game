import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GameStatusUI } from '../GameStatusUI'
import { Game } from '@/domain/entities/Game'
import { Card } from '@/domain/entities/Card'
import type { Scene } from 'phaser'

// Phaserのモック
const mockScene = {
  add: {
    container: vi.fn(() => ({
      add: vi.fn(),
      setDepth: vi.fn(),
      destroy: vi.fn()
    })),
    graphics: vi.fn(() => ({
      fillStyle: vi.fn(),
      fillRoundedRect: vi.fn(),
      lineStyle: vi.fn(),
      strokeRoundedRect: vi.fn(),
      destroy: vi.fn()
    })),
    text: vi.fn(() => ({
      setText: vi.fn(),
      setOrigin: vi.fn(),
      setWordWrapWidth: vi.fn(),
      setDepth: vi.fn(),
      destroy: vi.fn()
    })),
    image: vi.fn(() => ({
      setScale: vi.fn(),
      setAlpha: vi.fn(),
      setInteractive: vi.fn(),
      on: vi.fn(),
      destroy: vi.fn()
    }))
  },
  tweens: {
    add: vi.fn()
  },
  input: {
    on: vi.fn()
  }
} as unknown as Scene

describe('GameStatusUI', () => {
  let statusUI: GameStatusUI
  let game: Game

  beforeEach(() => {
    vi.clearAllMocks()
    statusUI = new GameStatusUI(mockScene, 0, 0)
    game = Game.createNewGame('test-player')
  })

  describe('初期化', () => {
    it('UIコンテナが正しく作成される', () => {
      expect(mockScene.add.container).toHaveBeenCalledWith(0, 0)
      expect(mockScene.add.graphics).toHaveBeenCalled()
    })

    it('背景パネルが作成される', () => {
      const graphics = mockScene.add.graphics()
      expect(graphics.fillStyle).toHaveBeenCalled()
      expect(graphics.fillRoundedRect).toHaveBeenCalled()
    })

    it('各セクションのラベルが作成される', () => {
      const textCalls = mockScene.add.text.mock.calls
      const labels = textCalls.map(call => call[2])
      
      expect(labels).toContain('活力')
      expect(labels).toContain('保険')
      expect(labels).toContain('ステージ')
      expect(labels).toContain('保険負担')
    })
  })

  describe('活力表示の更新', () => {
    it('活力値が正しく表示される', () => {
      statusUI.updateVitality(80, 100)
      
      const vitalityText = mockScene.add.text.mock.results.find(
        result => result.value === statusUI['vitalityText']
      )?.value
      
      expect(vitalityText?.setText).toHaveBeenCalledWith('80 / 100')
    })

    it('活力バーが正しく更新される', () => {
      statusUI.updateVitality(50, 100)
      
      // バーの幅が活力の割合に応じて計算される
      const expectedWidth = 180 * 0.5 // 50%
      const graphics = mockScene.add.graphics()
      
      // 活力バーの描画確認
      expect(graphics.fillStyle).toHaveBeenCalled()
      expect(graphics.fillRoundedRect).toHaveBeenCalled()
    })

    it('低活力時に警告色で表示される', () => {
      statusUI.updateVitality(20, 100)
      
      const graphics = mockScene.add.graphics()
      // 赤色(0xff6666)で描画されることを確認
      expect(graphics.fillStyle).toHaveBeenCalledWith(0xff6666, 1)
    })

    it('高活力時に通常色で表示される', () => {
      statusUI.updateVitality(80, 100)
      
      const graphics = mockScene.add.graphics()
      // 緑色(0x66ff66)で描画されることを確認
      expect(graphics.fillStyle).toHaveBeenCalledWith(0x66ff66, 1)
    })
  })

  describe('保険リストの更新', () => {
    it('保険カードが正しく表示される', () => {
      const insuranceCard = new Card({
        id: 'ins-1',
        name: '健康保険',
        description: 'テスト用',
        type: 'insurance',
        power: 0,
        cost: 10,
        insuranceType: 'health',
        coverage: 50
      })

      statusUI.updateInsuranceList([insuranceCard])
      
      const textCalls = mockScene.add.text.mock.calls
      const insuranceTexts = textCalls.filter(call => 
        call[2]?.includes('健康保険')
      )
      
      expect(insuranceTexts.length).toBeGreaterThan(0)
    })

    it('複数の保険が表示される', () => {
      const cards = [
        new Card({
          id: 'ins-1',
          name: '健康保険',
          description: '',
          type: 'insurance',
          power: 0,
          cost: 10,
          insuranceType: 'health'
        }),
        new Card({
          id: 'ins-2',
          name: 'がん保険',
          description: '',
          type: 'insurance',
          power: 0,
          cost: 15,
          insuranceType: 'cancer'
        })
      ]

      statusUI.updateInsuranceList(cards)
      
      const textContents = mockScene.add.text.mock.calls
        .map(call => call[2])
        .filter(text => typeof text === 'string')
      
      expect(textContents).toEqual(expect.arrayContaining([
        expect.stringContaining('健康保険'),
        expect.stringContaining('がん保険')
      ]))
    })

    it('保険がない場合「なし」と表示される', () => {
      statusUI.updateInsuranceList([])
      
      const insuranceText = mockScene.add.text.mock.results.find(
        result => result.value === statusUI['insuranceText']
      )?.value
      
      expect(insuranceText?.setText).toHaveBeenCalledWith('なし')
    })

    it('最大3件まで表示される', () => {
      const cards = Array(5).fill(null).map((_, i) => 
        new Card({
          id: `ins-${i}`,
          name: `保険${i}`,
          description: '',
          type: 'insurance',
          power: 0,
          cost: 10
        })
      )

      statusUI.updateInsuranceList(cards)
      
      const insuranceText = mockScene.add.text.mock.results.find(
        result => result.value === statusUI['insuranceText']
      )?.value
      
      const lastCall = insuranceText?.setText.mock.lastCall?.[0]
      expect(lastCall).toContain('...他2件')
    })
  })

  describe('ステージ情報の更新', () => {
    it('ステージとターン数が正しく表示される', () => {
      statusUI.updateStageInfo('youth', 5)
      
      const stageText = mockScene.add.text.mock.results.find(
        result => result.value === statusUI['stageText']
      )?.value
      
      expect(stageText?.setText).toHaveBeenCalledWith('青春期 (ターン 5)')
    })

    it('各ステージ名が正しく表示される', () => {
      const stages = [
        { key: 'youth', name: '青春期' },
        { key: 'middle', name: '中年期' },
        { key: 'fulfillment', name: '充実期' }
      ] as const

      stages.forEach(({ key, name }) => {
        statusUI.updateStageInfo(key, 1)
        
        const stageText = mockScene.add.text.mock.results.find(
          result => result.value === statusUI['stageText']
        )?.value
        
        expect(stageText?.setText).toHaveBeenCalledWith(`${name} (ターン 1)`)
      })
    })
  })

  describe('保険負担の更新', () => {
    it('保険負担率が正しく表示される', () => {
      statusUI.updateBurden(25.5)
      
      const burdenText = mockScene.add.text.mock.results.find(
        result => result.value === statusUI['burdenText']
      )?.value
      
      expect(burdenText?.setText).toHaveBeenCalledWith('26%')
    })

    it('0%の場合も正しく表示される', () => {
      statusUI.updateBurden(0)
      
      const burdenText = mockScene.add.text.mock.results.find(
        result => result.value === statusUI['burdenText']
      )?.value
      
      expect(burdenText?.setText).toHaveBeenCalledWith('0%')
    })

    it('100%の場合も正しく表示される', () => {
      statusUI.updateBurden(100)
      
      const burdenText = mockScene.add.text.mock.results.find(
        result => result.value === statusUI['burdenText']
      )?.value
      
      expect(burdenText?.setText).toHaveBeenCalledWith('100%')
    })
  })

  describe('ゲーム状態からの一括更新', () => {
    it('全ての情報が一度に更新される', () => {
      // ゲームに保険を追加
      const insuranceCard = new Card({
        id: 'ins-1',
        name: '健康保険',
        description: '',
        type: 'insurance',
        power: 0,
        cost: 10,
        insuranceType: 'health',
        coverage: 50
      })
      game.addInsuranceCard(insuranceCard)

      statusUI.updateFromGame(game)
      
      // 活力の更新
      const vitalityText = mockScene.add.text.mock.results.find(
        result => result.value === statusUI['vitalityText']
      )?.value
      expect(vitalityText?.setText).toHaveBeenCalled()
      
      // 保険リストの更新
      const insuranceText = mockScene.add.text.mock.results.find(
        result => result.value === statusUI['insuranceText']
      )?.value
      expect(insuranceText?.setText).toHaveBeenCalled()
      
      // ステージ情報の更新
      const stageText = mockScene.add.text.mock.results.find(
        result => result.value === statusUI['stageText']
      )?.value
      expect(stageText?.setText).toHaveBeenCalled()
      
      // 保険負担の更新
      const burdenText = mockScene.add.text.mock.results.find(
        result => result.value === statusUI['burdenText']
      )?.value
      expect(burdenText?.setText).toHaveBeenCalled()
    })
  })

  describe('アニメーション効果', () => {
    it('活力変更時にアニメーションが再生される', () => {
      statusUI.updateVitality(50, 100)
      
      expect(mockScene.tweens.add).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: expect.any(Number),
          ease: expect.any(String)
        })
      )
    })
  })

  describe('破棄処理', () => {
    it('全てのオブジェクトが正しく破棄される', () => {
      const container = statusUI['container']
      statusUI.destroy()
      
      expect(container.destroy).toHaveBeenCalled()
    })
  })
})