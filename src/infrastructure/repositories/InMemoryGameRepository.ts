import type { IGameRepository } from '../../domain/repositories/IGameRepository'
import type { Game } from '../../domain/entities/Game'

/**
 * ゲームリポジトリのインメモリ実装
 * 
 * テストやプロトタイプで使用します。
 * データはメモリ上にのみ保持され、アプリケーション終了時に失われます。
 */
export class InMemoryGameRepository implements IGameRepository {
  private games: Map<string, Game> = new Map()

  async findById(id: string): Promise<Game | null> {
    const game = this.games.get(id)
    return game ? this.cloneGame(game) : null
  }

  async save(game: Game): Promise<void> {
    this.games.set(game.id, this.cloneGame(game))
  }

  async delete(id: string): Promise<void> {
    this.games.delete(id)
  }

  async findInProgressGames(): Promise<Game[]> {
    const inProgressGames: Game[] = []
    for (const game of this.games.values()) {
      if (game.status === 'in_progress') {
        inProgressGames.push(this.cloneGame(game))
      }
    }
    return inProgressGames
  }

  async findLatestByUserId(_userId: string): Promise<Game | null> {
    // インメモリ実装では簡略化（実際はユーザーIDとの関連付けが必要）
    let latestGame: Game | null = null
    let latestDate: Date | null = null

    for (const game of this.games.values()) {
      if (game.startedAt && (!latestDate || game.startedAt > latestDate)) {
        latestDate = game.startedAt
        latestGame = game
      }
    }

    return latestGame ? this.cloneGame(latestGame) : null
  }

  /**
   * ゲームオブジェクトをクローン（防御的コピー）
   */
  private cloneGame(game: Game): Game {
    // 簡易的なディープクローン
    // 実際のプロダクションコードでは、より堅牢な実装が必要
    return JSON.parse(JSON.stringify(game))
  }

  /**
   * テスト用：全てのゲームをクリア
   */
  clear(): void {
    this.games.clear()
  }

  /**
   * テスト用：保存されているゲーム数を取得
   */
  count(): number {
    return this.games.size
  }
}