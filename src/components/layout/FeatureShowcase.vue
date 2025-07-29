<template>
  <section class="info-section">
    <div class="info-grid">
      <!-- 最新の変更 -->
      <div class="interactive-card glow-on-hover card-latest">
        <div class="card-badge">NEW</div>
        <div class="card-header">
          <div class="card-icon-wrapper">
            <span class="card-icon">🚀</span>
          </div>
          <h2 class="card-title">
            本番リリース v0.3.0
          </h2>
        </div>
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
      <div class="interactive-card glow-on-hover card-roadmap">
        <div class="card-badge badge-secondary">ROADMAP</div>
        <div class="card-header">
          <div class="card-icon-wrapper icon-wrapper-secondary">
            <span class="card-icon">🗺️</span>
          </div>
          <h2 class="card-title">
            今後のロードマップ
          </h2>
        </div>
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
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(129, 140, 248, 0.15);
  border-radius: 20px;
  padding: var(--space-xl);
  
  backdrop-filter: blur(20px);
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.interactive-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 200px;
  background: radial-gradient(ellipse at top, rgba(129, 140, 248, 0.1) 0%, transparent 70%);
  pointer-events: none;
}

.interactive-card:hover {
  border-color: rgba(129, 140, 248, 0.3);
  transform: translateY(-6px) scale(1.02);
  box-shadow: 
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04),
    0 0 40px rgba(129, 140, 248, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
}

/* カードバッジ */
.card-badge {
  position: absolute;
  top: var(--space-md);
  right: var(--space-md);
  padding: var(--space-xs) var(--space-sm);
  background: var(--brand-gradient-primary);
  color: white;
  font-size: var(--text-xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.05em;
  border-radius: 999px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 1;
}

.badge-secondary {
  background: var(--brand-gradient-soft);
}

/* カードヘッダー */
.card-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
  position: relative;
  z-index: 1;
}

.card-icon-wrapper {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--brand-gradient-primary);
  border-radius: 16px;
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
}

.card-icon-wrapper::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.2) 0%, transparent 60%);
}

.icon-wrapper-secondary {
  background: var(--brand-gradient-soft);
}

.card-icon {
  font-size: 1.75rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  position: relative;
  z-index: 1;
}

.card-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-weight-bold);
  background: var(--brand-gradient-hero);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
}

/* グローエフェクト */
.glow-on-hover {
  position: relative;
}

.glow-on-hover::after {
  content: '';
  position: absolute;
  inset: -1px;
  background: linear-gradient(135deg, var(--primary-400), var(--secondary-400), var(--primary-400));
  border-radius: inherit;
  opacity: 0;
  z-index: -1;
  transition: opacity var(--transition-normal);
  filter: blur(15px);
}

.glow-on-hover:hover::after {
  opacity: 0.3;
}

/* テキスト色 */
.text-primary {
  color: rgba(129, 140, 248, 1);
}

.text-success {
  color: rgb(34, 197, 94);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.text-gray-400 {
  color: rgb(156, 163, 175);
}

/* リストスタイルの改善 */
.interactive-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.interactive-card li {
  transition: transform var(--transition-fast);
}

.interactive-card li:hover {
  transform: translateX(4px);
}

/* リンクホバーエフェクト */
.interactive-card a {
  position: relative;
  display: inline-block;
}

.interactive-card a::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 2px;
  bottom: -2px;
  left: 0;
  background: var(--brand-gradient-primary);
  transform: scaleX(0);
  transform-origin: right;
  transition: transform var(--transition-normal);
}

.interactive-card a:hover::after {
  transform: scaleX(1);
  transform-origin: left;
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