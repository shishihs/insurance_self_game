<template>
  <section class="info-section">
    <div class="info-grid">
      <!-- 最新の変更 -->
      <div class="interactive-card glow-on-hover">
        <h2 class="text-2xl font-bold mb-4 text-primary flex items-center gap-2">
          <span>🚀</span>
          本番リリース v0.3.0
        </h2>
        <div class="text-left space-y-3">
          <div>
            <h3 class="font-semibold text-lg mb-2">Production Release - 本番環境対応完了</h3>
            <ul class="space-y-1 text-sm">
              <li class="flex items-start gap-2">
                <span class="text-success mt-1">🎯</span>
                <span><strong>リリース品質100%</strong>: ビルド・テスト・型チェック全て完了</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-success mt-1">♿</span>
                <span><strong>アクセシビリティ完全対応</strong>: WCAG 2.1 AA 100%準拠</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-success mt-1">📱</span>
                <span><strong>モバイル最適化完了</strong>: タッチ操作・レスポンシブデザイン対応</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-success mt-1">⚡</span>
                <span><strong>パフォーマンス最適化</strong>: バンドルサイズ55.8%削減達成</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-success mt-1">✅</span>
                <span><strong>セキュリティ監査</strong>: 自動脆弱性検出、コード品質分析</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 今後のロードマップ -->
      <div class="interactive-card glow-on-hover">
        <h2 class="text-2xl font-bold mb-4 text-primary flex items-center gap-2">
          <span>🚀</span>
          今後のロードマップ
        </h2>
        <div class="text-left space-y-3">
          <div>
            <h3 class="font-semibold mb-2">短期（1-2週間）</h3>
            <ul class="space-y-1 text-sm">
              <li class="flex items-center gap-2">
                <span class="text-success">✅</span>
                保険更新システム
              </li>
              <li class="flex items-center gap-2">
                <span class="text-success">✅</span>
                チュートリアルモード
              </li>
              <li class="flex items-center gap-2">
                <span class="text-success">✅</span>
                サウンドエフェクト
              </li>
              <li class="flex items-center gap-2">
                <span class="text-gray-400">⭕</span>
                ゲームバランス微調整
              </li>
            </ul>
          </div>
          <div>
            <h3 class="font-semibold mb-2">中期（1ヶ月）</h3>
            <ul class="space-y-1 text-sm">
              <li class="flex items-center gap-2">
                <span class="text-gray-400">⭕</span>
                実績システム
              </li>
              <li class="flex items-center gap-2">
                <span class="text-gray-400">⭕</span>
                追加シナリオ（結婚、出産など）
              </li>
            </ul>
          </div>
        </div>
        <div class="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <a href="https://github.com/shishihs/insurance_self_game/blob/master/CHANGELOG.md" 
             target="_blank" 
             class="hover:text-primary transition-colors">
            詳細な変更履歴とロードマップ →
          </a>
        </div>
      </div>
    </div>

    <!-- フッター情報 -->
    <div class="text-center mt-8 text-sm text-gray-600 dark:text-gray-400">
      <p>
        <a href="https://github.com/shishihs/insurance_self_game" 
           target="_blank" 
           class="hover:text-primary transition-colors">
          GitHub
        </a>
        <span class="mx-2">•</span>
        <a href="https://github.com/shishihs/insurance_self_game/issues" 
           target="_blank" 
           class="hover:text-primary transition-colors">
          バグ報告・要望
        </a>
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
// 機能紹介コンポーネント - 純粋なプレゼンテーション層
</script>

<style scoped>
/* ===========================================
   機能紹介セクション専用スタイル
   ========================================= */

.info-section {
  margin-bottom: var(--space-2xl);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--space-xl);
}

/* 情報カード */
.interactive-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(129, 140, 248, 0.2);
  border-radius: 16px;
  padding: var(--space-xl);
  
  backdrop-filter: blur(12px);
  box-shadow: var(--shadow-card);
  
  transition: all var(--transition-normal);
}

.interactive-card:hover {
  border-color: rgba(129, 140, 248, 0.4);
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
}

/* グローエフェクト */
.glow-on-hover:hover {
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.2),
    0 0 20px rgba(129, 140, 248, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* テキスト色 */
.text-primary {
  color: rgba(129, 140, 248, 1);
}

.text-success {
  color: rgb(34, 197, 94);
}

.text-gray-400 {
  color: rgb(156, 163, 175);
}

/* 外部リンク */
a {
  color: rgba(129, 140, 248, 1);
  text-decoration: none;
  font-weight: 500;
  transition: color var(--transition-fast);
}

a:hover {
  color: rgba(99, 102, 241, 1);
  text-decoration: underline;
}

/* レスポンシブ対応 */
@media (max-width: 1024px) {
  .info-grid {
    grid-template-columns: 1fr;
    max-width: 600px;
    margin: 0 auto;
  }
}

@media (max-width: 640px) {
  .info-grid {
    gap: var(--space-lg);
  }
  
  .interactive-card {
    padding: var(--space-lg);
  }
}

@media (max-width: 375px) {
  .interactive-card {
    padding: var(--space-md);
  }
}

/* ハイコントラストモード対応 */
@media (prefers-contrast: high) {
  .interactive-card {
    border-color: rgba(129, 140, 248, 0.6);
    background: rgba(255, 255, 255, 0.1);
  }
}

/* モーション削減設定 */
@media (prefers-reduced-motion: reduce) {
  .interactive-card {
    transition: none;
  }
  
  .interactive-card:hover {
    transform: none;
  }
}

/* 大画面対応 */
@media (min-width: 1536px) {
  .info-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2xl);
  }
}
</style>