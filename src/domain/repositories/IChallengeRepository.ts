import type { Challenge, ChallengeId } from '../aggregates/challenge'

/**
 * チャレンジリポジトリインターフェース
 * 
 * チャレンジ集約の永続化に関する操作を定義します。
 */
export interface IChallengeRepository {
  /**
   * IDでチャレンジを取得
   */
  findById(id: ChallengeId): Promise<Challenge | null>

  /**
   * チャレンジを保存
   */
  save(challenge: Challenge): Promise<void>

  /**
   * ゲームIDで進行中のチャレンジを取得
   */
  findInProgressByGameId(gameId: string): Promise<Challenge | null>

  /**
   * ゲームIDで全てのチャレンジを取得
   */
  findAllByGameId(gameId: string): Promise<Challenge[]>

  /**
   * チャレンジを削除
   */
  delete(id: ChallengeId): Promise<void>
}