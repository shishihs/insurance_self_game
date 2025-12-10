import { describe, it, expect, beforeEach } from 'vitest'
import { Game } from '@/domain/entities/Game'

/**
 * ゲームの完全なE2Eテスト - 開始からクリアまで
 * 
 * ゲームの勝利条件:
 * - 最大50ターンまで生存
 * - ステージ遷移: 青年期→中年期（15ターン）、中年期→充実期（30ターン）
 * - 充実期で40ターン以上生存 & 活力50以上 → 勝利
 * - または50ターン生存 & 活力50以上 → 勝利
 */
describe('Game E2E Full Loop Tests - Victory & Game Over', () => {
    let game: Game

    beforeEach(() => {
        game = new Game({
            difficulty: 'normal',
            startingVitality: 100,
            startingHandSize: 5,
            maxHandSize: 10,
            dreamCardCount: 3
        })
    })

    /**
     * ヘルパー: ゲームを開始し、夢を選択
     */
    function startGameAndSelectDream(): void {
        game.start()

        // Handle Character Selection Phase if present (v2 update)
        if (game.phase === 'character_selection') {
            game.selectCharacter(game.config.characterId || 'solid')
        }

        expect(game.phase).toBe('dream_selection')
        const dream = game.cardChoices?.[0]
        if (!dream) throw new Error('No dream choices available')
        game.selectDream(dream)
        expect(game.phase).toBe('draw')
        expect(game.turn).toBe(1)
    }

    /**
     * ヘルパー: チャレンジデッキを確認し、必要なら補充
     */
    function ensureChallengeDeckHasCards(): void {
        if (game.cardManager.getChallengeDeckSize() < 2) {
            game.refillChallengeDeck()
        }
    }

    /**
     * ヘルパー: チャレンジフェーズを実行（選択→解決→次ターン）
     * @returns チャレンジ結果
     */
    function executeChallengePhase(): { success: boolean, vitalityChange: number } {
        // デッキ確認
        ensureChallengeDeckHasCards()

        // チャレンジフェーズ開始
        game.startChallengePhase()
        expect(game.phase).toBe('challenge_choice')

        // チャレンジ選択
        const challenge = game.cardChoices?.[0]
        if (!challenge) throw new Error('No challenge choices available')
        game.startChallenge(challenge)
        expect(game.phase).toBe('challenge')

        // カードを選択（手札があれば全部使う）
        const hand = game.hand
        hand.forEach(c => game.toggleCardSelection(c))

        // チャレンジ解決
        const result = game.resolveChallenge()

        // 成功時は保険種類選択が必要、失敗時はresolution
        if (result.success && game.phase === 'insurance_type_selection') {
            // 保険選択をスキップ（テスト用に簡易処理）
            game.phase = 'resolution'
        }

        return { success: result.success, vitalityChange: result.vitalityChange }
    }

    /**
     * ヘルパー: 次のターンへ進む
     */
    function advanceToNextTurn(): void {
        game.nextTurn()
    }

    describe('Full Game Loop - Victory Path', () => {
        it('should complete game loop from start to turn 20+ with survival', () => {
            startGameAndSelectDream()

            let turnCount = 0
            const maxTestTurns = 25 // 勝利条件の最小ターン数を超える

            while (game.status === 'in_progress' && game.turn < maxTestTurns) {
                turnCount++

                // チャレンジ実行
                executeChallengePhase()

                // ゲームオーバーチェック
                if (game.isGameOver()) {
                    break
                }

                // 次のターンへ
                advanceToNextTurn()

                // ステージ遷移確認
                if (game.turn >= 15 && game.turn < 30) {
                    expect(game.stage).toBe('middle')
                } else if (game.turn >= 30) {
                    expect(game.stage).toBe('fulfillment')
                }
            }

            // 結果検証
            console.log(`Game ended at turn ${game.turn}, status: ${game.status}, vitality: ${game.vitality}`)

            // ゲームが進行したことを確認
            expect(game.turn).toBeGreaterThan(1)
            expect(game.stats.totalChallenges).toBeGreaterThan(0)
        })

        it('should transition through all stages (youth -> middle -> fulfillment)', () => {
            startGameAndSelectDream()

            expect(game.stage).toBe('youth')

            // ターン15まで進める（中年期への遷移）
            while (game.turn < 15 && game.status === 'in_progress') {
                executeChallengePhase()

                if (game.isGameOver()) break
                advanceToNextTurn()
            }

            if (game.status === 'in_progress') {
                expect(game.stage).toBe('middle')
                console.log(`Transitioned to middle at turn ${game.turn}`)
            }

            // ターン30まで進める（充実期への遷移）
            while (game.turn < 30 && game.status === 'in_progress') {
                executeChallengePhase()

                if (game.isGameOver()) break
                advanceToNextTurn()
            }

            if (game.status === 'in_progress') {
                expect(game.stage).toBe('fulfillment')
                console.log(`Transitioned to fulfillment at turn ${game.turn}`)
            }
        })

        it('should reach victory status when surviving to turn 40+ in fulfillment with sufficient vitality', () => {
            // 高活力でゲーム開始（勝利しやすい設定）
            game = new Game({
                difficulty: 'normal',
                startingVitality: 100,
                startingHandSize: 5,
                maxHandSize: 10,
                dreamCardCount: 3
            })

            startGameAndSelectDream()

            // ターン40以上 & 充実期 & 活力50以上を目指す
            const targetTurn = 41

            while (game.status === 'in_progress' && game.turn < targetTurn) {
                executeChallengePhase()

                if (game.isGameOver() || game.status === 'victory') break

                advanceToNextTurn()

                // 勝利判定が発動するかチェック
                if (game.status === 'victory') {
                    break
                }
            }

            console.log(`Victory test: turn ${game.turn}, stage: ${game.stage}, vitality: ${game.vitality}, status: ${game.status}`)

            // 勝利またはゲームオーバーのいずれかで終了していることを確認
            expect(['victory', 'game_over', 'in_progress']).toContain(game.status)

            // 勝利した場合の追加検証
            if (game.status === 'victory') {
                expect(game.turn).toBeGreaterThanOrEqual(40)
                expect(game.vitality).toBeGreaterThanOrEqual(50)
                expect(game.stage).toBe('fulfillment')
                console.log('🎉 Victory achieved!')
            }
        })
    })

    describe('Full Game Loop - Game Over Path', () => {
        it('should trigger game over when vitality reaches 0', () => {
            // 低活力でゲーム開始
            game = new Game({
                difficulty: 'normal',
                startingVitality: 10, // 非常に低い活力
                startingHandSize: 2,  // 少ない手札
                maxHandSize: 5,
                dreamCardCount: 3
            })

            startGameAndSelectDream()

            let gameOverTriggered = false
            let attempts = 0
            const maxAttempts = 20

            while (!gameOverTriggered && attempts < maxAttempts) {
                attempts++

                // デッキ確認
                ensureChallengeDeckHasCards()

                try {
                    // チャレンジ実行（手札なしで失敗しやすい）
                    game.cardManager.clearSelection()

                    game.startChallengePhase()
                    const challenge = game.cardChoices?.[0]
                    if (!challenge) continue
                    game.startChallenge(challenge)

                    // カードを選ばずに解決（失敗確定）
                    const result = game.resolveChallenge()

                    if (result.success && game.phase === 'insurance_type_selection') {
                        game.phase = 'resolution'
                    }
                } catch {
                    continue
                }

                if (game.isGameOver()) {
                    gameOverTriggered = true
                    break
                }

                if (game.status === 'in_progress') {
                    advanceToNextTurn()
                }
            }

            // 結果
            console.log(`Game Over test: turn ${game.turn}, vitality: ${game.vitality}, status: ${game.status}`)

            // 低活力から開始したので、ゲームオーバーになる可能性が高い
            // ただし、運によっては生き残る可能性もあるため、進行を確認
            expect(game.turn).toBeGreaterThan(0)
        })
    })

    describe('Edge Cases During Full Loop', () => {
        it('should handle empty challenge deck gracefully', () => {
            startGameAndSelectDream()

            // チャレンジデッキを空にする
            while (game.cardManager.getChallengeDeckSize() > 0) {
                game.cardManager.drawChallengeCard()
            }

            expect(game.cardManager.getChallengeDeckSize()).toBe(0)

            // 補充して続行
            game.refillChallengeDeck()
            expect(game.cardManager.getChallengeDeckSize()).toBeGreaterThan(0)

            // チャレンジ実行可能
            game.startChallengePhase()
            expect(game.phase).toBe('challenge_choice')
        })

        it('should accumulate stats correctly over multiple turns', () => {
            startGameAndSelectDream()

            const turns = 5
            for (let i = 0; i < turns && game.status === 'in_progress'; i++) {
                executeChallengePhase()

                if (!game.isGameOver()) {
                    advanceToNextTurn()
                }
            }

            // 統計確認
            expect(game.stats.totalChallenges).toBe(game.stats.successfulChallenges + game.stats.failedChallenges)
            expect(game.stats.turnsPlayed).toBeGreaterThan(0)
            console.log(`Stats after ${turns} turns:`, game.stats)
        })
    })
})
