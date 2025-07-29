import type { Game } from '../entities/Game'

/**
 * ゲームリポジトリインターフェース
 * 
 * ゲームエンティティの永続化に関する操作を定義します。
 * インフラストラクチャ層で実装されます。
 */
export interface IGameRepository {
  /**
   * IDでゲームを取得
   */
  findById(id: string): Promise<Game | null>

  /**
   * ゲームを保存
   */
  save(game: Game): Promise<void>

  /**
   * ゲームを削除
   */
  delete(id: string): Promise<void>

  /**
   * 進行中のゲームを取得
   */
  findInProgressGames(): Promise<Game[]>

  /**
   * ユーザーの最新のゲームを取得
   */
  findLatestByUserId(userId: string): Promise<Game | null>
}