#!/usr/bin/env node

/**
 * ストレステスト用ワーカー
 * 
 * 並行処理テストのためのワーカープロセス
 */

import { Game } from '../src/domain/entities/Game.js';
import { performance } from 'perf_hooks';

// コマンドライン引数を解析
const args = process.argv.slice(2);
const iterations = parseInt(args[args.indexOf('--iterations') + 1]) || 1000;
const workerId = parseInt(args[args.indexOf('--worker-id') + 1]) || 0;

async function runWorker() {
  const startTime = performance.now();
  const results = {
    workerId,
    iterations,
    successful: 0,
    failed: 0,
    totalScore: 0,
    errors: []
  };

  console.log(`Worker ${workerId}: Starting ${iterations} iterations`);

  for (let i = 0; i < iterations; i++) {
    try {
      // ゲームインスタンスを作成
      const game = new Game();
      let turns = 0;
      
      // ランダムなゲームプレイをシミュレート
      while (!game.isGameOver() && turns < 100) {
        const cards = game.getPlayerCards();
        if (cards.length === 0) break;
        
        // ランダムなカードを選択
        const cardIndex = Math.floor(Math.random() * cards.length);
        const card = cards[cardIndex];
        
        // カードをプレイ
        game.playCard(card);
        turns++;
        
        // ランダムな遅延（非同期処理のシミュレート）
        if (Math.random() > 0.9) {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        }
      }
      
      results.successful++;
      results.totalScore += game.getScore();
      
    } catch (error) {
      results.failed++;
      results.errors.push({
        iteration: i,
        error: error.message
      });
    }
    
    // 進捗レポート（100回ごと）
    if ((i + 1) % 100 === 0) {
      const elapsed = performance.now() - startTime;
      console.log(`Worker ${workerId}: ${i + 1}/${iterations} completed (${(elapsed / 1000).toFixed(2)}s)`);
    }
  }

  const totalTime = performance.now() - startTime;
  
  // 結果を出力
  const summary = {
    ...results,
    duration: totalTime,
    avgScore: results.successful > 0 ? results.totalScore / results.successful : 0,
    successRate: (results.successful / iterations * 100).toFixed(2) + '%',
    opsPerSecond: (iterations / (totalTime / 1000)).toFixed(2)
  };

  console.log(`Worker ${workerId} completed:`, JSON.stringify(summary, null, 2));
  
  // エラーコードで終了（失敗がある場合）
  process.exit(results.failed > 0 ? 1 : 0);
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error(`Worker ${workerId} uncaught exception:`, error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`Worker ${workerId} unhandled rejection at:`, promise, 'reason:', reason);
  process.exit(1);
});

// メイン実行
runWorker().catch(error => {
  console.error(`Worker ${workerId} fatal error:`, error);
  process.exit(1);
});