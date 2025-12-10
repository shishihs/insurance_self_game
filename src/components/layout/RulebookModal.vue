<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div 
        v-if="isOpen" 
        class="modal-overlay" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="rulebook-title"
        @click.self="close"
        @keydown.escape="close"
      >
        <div class="modal-container">
          <!-- ヘッダー -->
          <header class="modal-header">
            <h2 id="rulebook-title" class="modal-title">
              <span class="title-icon" aria-hidden="true">📖</span>
              ゲームルール
            </h2>
            <button 
              class="close-btn" 
              @click="close" 
              aria-label="閉じる"
              ref="closeButtonRef"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </header>
          
          <!-- コンテンツ -->
          <div class="modal-content" ref="contentRef">
            <div class="rulebook-content" v-html="parsedContent"></div>
          </div>
          
          <!-- フッター -->
          <footer class="modal-footer">
            <button class="btn-close" @click="close">
              <span class="btn-icon" aria-hidden="true">✓</span>
              閉じる
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  'close': []
}>()

const contentRef = ref<HTMLElement>()
const closeButtonRef = ref<HTMLButtonElement>()

// ルールブックの内容（Markdown）
const rulebookMarkdown = `# ライフ・インシュアランス・サバイバル (Life Insurance Survival) ルールブック【Ver 3.0】

## 1. ゲームの概要
**「人生は、攻めと守りのバランスだ。」**

プレイヤーは一人の人間として、青年期から充実期までの人生（全20ターン）を歩みます。
限られた「活力」を使い、キャリア構築や家族との時間といった「人生のアクション」を行いながら、毎ターン訪れる「試練（チャレンジ）」を乗り越えていきます。
いつ訪れるかわからないリスクに「保険」で備えつつ、最終的な人生の目標「夢」の達成と、幸福な人生（高いスコア）を目指す、1人用デッキ構築型ライフシミュレーションゲームです。

**プレイ時間**: 15〜30分  
**対象年齢**: 14歳以上

---

## 2. コンポーネント（内容物）

### カード類
| 名称 | 説明 |
|:---|:---|
| **人生カード** | 行動の基本となるカード。初期デッキ7枚＋報酬で獲得。 |
| **保険カード** | トラブルや試練の失敗から身を守るカード。定期/終身の選択が可能。 |
| **試練カード** | 毎ターン訪れる課題。「就職」「結婚」「家の購入」など。 |
| **夢カード** | ゲームの最終目標。開始時に3枚から1枚選ぶ。 |
| **老化カード** | 山札が尽きるたびに強制的に追加される「衰え」のカード。 |

### パラメータ
- **活力 (Vitality)**: プレイヤーの体力。0になるとゲームオーバー。
- **貯蓄 (Savings)**: 余裕資金。ダメージを受けた際に活力の代わりに使用可能。
- **ステージ**: 青年期 → 中年期 → 充実期の3段階。

---

## 3. カード詳細

### 3.1 人生カード（初期デッキ7枚）
ゲーム開始時に持っているカードです。

| カード名 | コスト | パワー | 説明 |
|:---|:---:|:---:|:---|
| **朝のジョギング** | 1 | 2 | 健康的な一日の始まり |
| **栄養バランスの良い食事** | 2 | 4 | 体調管理の基本 |
| **新しいスキルの習得** | 2 | 4 | 成長への投資 |
| **チームワーク** | 1 | 2 | 仲間との協力 |
| **家族との団らん** | 1 | 2 | 心の充電 |
| **趣味の時間** | 1 | 2 | リフレッシュタイム |
| **計画的な貯蓄** | 2 | 4 | 将来への備え |

### 3.2 保険カード
試練の失敗によるダメージを軽減したり、特殊効果を発揮します。
獲得時に「定期（安い・期限付き）」か「終身（高い・永続）」かを選択できるのが特徴です。

**主な種類**:
- **医療保険**: 病気やケガ（ダメージ）に備える。
- **生命保険**: 家族を守る（高カバレッジ）。
- **収入保障保険**: 働けなくなった時に備える。

### 3.3 試練カード（Challenge Card）
ステージごとに難易度と内容が変化します。
- **報酬**: 難易度に応じて「保険カード（低・中難易度）」や「追加の人生カード（高難易度）」が手に入ります。

### 3.4 老化カード（Aging Card）
- **効果**: 何も生み出さないお荷物カード。
- **発生条件**: 山札（Player Deck）が尽きて、捨て札からリシャッフルされるたびに1枚、デッキに追加されます。
- **戦略**: デッキの回転が速すぎると老化も早まります。

---

## 4. ゲームの準備（セットアップ）

1. **キャラクター選択**: プレイするキャラクターを選びます（初期活力や貯蓄に補正あり）。
2. **夢の選択**: ランダムに提示される3枚の夢カードから1枚を選びます。これが最終目標となります。
3. **初期デッキ構築**: 初期人生カード7枚を持ってスタートします。
4. **活力セット**: ステージ「青年期」の最大活力（基本100前後）で開始します。

---

## 5. ゲームの進行

全20ターン（設定により変動あり）を生き抜くことが目標です。
各ターンは以下のフェーズで進行します。

### フェーズ1: ターン開始 (Start Phase)
- **手札の破棄**: 前のターンの手札はすべて捨て札になります。
- **ドロー**: 山札からカードを5枚引きます。
  - 山札が足りない場合は捨て札をシャッフルして山札にします。この時、**老化カードが1枚追加**されます。

### フェーズ2: ステージと維持費の確認
- 現在のターン数に応じてステージが推移していないか確認します。
- **保険料の支払い**: 契約している保険のコスト（活力）を支払います。払えない、または払いたくない場合は解約となります。
- **保険の期限確認**: 定期保険の期限（5ターン）が切れた場合、その保険は失効します。

### フェーズ3: 試練の選択 (Challenge Choice Phase)
- 試練デッキから**2枚**引いて提示されます。
- そのうち**1枚を選んで**挑戦します。選ばなかったカードは捨てられます。

### フェーズ4: アクションと解決 (Action & Resolution Phase)
1. **カードプレイ**: 手札の人生カードを使用（コストとして活力を消費）し、パワーを貯めます。
2. **合計パワーの計算**:
   - \`合計パワー = (カードのパワー合計) + (保険ボーナス) - (保険料負担)\`
3. **判定**:
   - **合計パワー ≧ 試練のパワー**: **成功！** 報酬を獲得します。
   - **合計パワー < 試練のパワー**: **失敗...** ダメージを受けます。

### フェーズ5: ターン終了
- ターン数が進みます。
- 全20ターン経過、または特定の勝利条件を満たすとクリアとなります。
- 活力が0になるとゲームオーバーです。

---

## 6. ステージ構成

人生は時間（ターン数）と共に移ろいます。

### 青年期 (Youth)
- **期間**: ターン 0 〜 6
- **最大活力**: 高い (基本100〜)
- **特徴**: 基礎を固める時期。比較的簡単な試練が多い。

### 中年期 (Middle Age)
- **期間**: ターン 7 〜 13
- **最大活力**: 中程度 (基本80)に減少
- **特徴**: 責任が増し、試練の難易度が上がります。

### 充実期 (Fulfillment)
- **期間**: ターン 14 〜 20+
- **最大活力**: 低い (基本60)に減少
- **特徴**: 人生の集大成。

---

## 7. 勝利条件と敗北条件

### 勝利 (Victory)
- **生存**: 規定ターン数（デフォルト20ターン）を生き残る。
- **健康**: その時点で一定以上の活力（デフォルト50以上）を維持していること。

### 敗北 (Defeat)
- **活力枯渇**: ターン中に活力が0以下になる。

---

## 8. ヒントと戦略

1. **保険の「定期」と「終身」**: 若いうちは安い「定期」でリスクをカバーし、余裕ができたら「終身」に切り替えるのが賢い戦略かもしれません。
2. **老化のコントロール**: ドローカードを乱用しすぎるとデッキの回転が早まり、老化カードが増えてしまいます。
3. **貯蓄の重要性**: いざという時、貯蓄は「第二のライフ」として機能します。
`

// シンプルなMarkdownパーサー
const parseMarkdown = (md: string): string => {
  let html = md
    // エスケープ処理
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // コードブロック（バッククォート）
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 見出し
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="main-title">$1</h2>')
    // 太字
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // 斜体
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // 水平線
    .replace(/^---$/gm, '<hr />')
    // リスト
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // テーブル処理
    .replace(/\|([^|]+)\|([^|]+)\|([^|]*)\|([^|]*)\|?$/gm, (_match, c1, c2, c3, c4) => {
      const cols = [c1, c2, c3, c4].filter(c => c !== undefined && c.trim() !== '').map(c => c.trim())
      if (cols.every(c => c.match(/^:?-+:?$/))) {
        return '' // ヘッダーセパレーターをスキップ
      }
      return `<tr>${cols.map(c => `<td>${c}</td>`).join('')}</tr>`
    })
    // 段落
    .replace(/\n\n/g, '</p><p>')
    // 改行
    .replace(/\n/g, '<br />')
  
  // リストをラップ
  html = html.replace(/(<li>.*?<\/li>(?:<br \/>)?)+/g, '<ul>$&</ul>')
  
  // テーブルをラップ
  html = html.replace(/(<tr>.*?<\/tr>(?:<br \/>)?)+/g, '<div class="table-wrapper"><table>$&</table></div>')
  
  // 余分なbrタグを削除
  html = html.replace(/<br \/><\/p>/g, '</p>')
  html = html.replace(/<br \/><h/g, '<h')
  html = html.replace(/<\/h(\d)><br \/>/g, '</h$1>')
  html = html.replace(/<br \/><hr \/>/g, '<hr />')
  html = html.replace(/<hr \/><br \/>/g, '<hr />')
  html = html.replace(/<br \/><ul>/g, '<ul>')
  html = html.replace(/<\/ul><br \/>/g, '</ul>')
  html = html.replace(/<br \/><\/li>/g, '</li>')
  html = html.replace(/<br \/><div class="table-wrapper">/g, '<div class="table-wrapper">')
  html = html.replace(/<\/table><\/div><br \/>/g, '</table></div>')
  html = html.replace(/<\/tr><br \/>/g, '</tr>')
  
  return `<div class="markdown-body"><p>${html}</p></div>`
}

const parsedContent = computed(() => parseMarkdown(rulebookMarkdown))

const close = () => {
  emit('close')
}

// モーダルが開いた時にフォーカスを管理
watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    await nextTick()
    closeButtonRef.value?.focus()
    document.body.style.overflow = 'hidden'
    contentRef.value?.scrollTo(0, 0)
  } else {
    document.body.style.overflow = ''
  }
})

// Escapeキーでモーダルを閉じる
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* モーダルトランジション */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-active .modal-container,
.modal-fade-leave-active .modal-container {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-container,
.modal-fade-leave-to .modal-container {
  transform: scale(0.95) translateY(20px);
  opacity: 0;
}

/* オーバーレイ */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
}

/* モーダルコンテナ */
.modal-container {
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(145deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%);
  border: 1px solid rgba(129, 140, 248, 0.3);
  border-radius: 20px;
  box-shadow: 
    0 25px 50px rgba(0, 0, 0, 0.5),
    0 0 100px rgba(129, 140, 248, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

/* ヘッダー */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg) var(--space-xl);
  background: linear-gradient(135deg, rgba(129, 140, 248, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%);
  border-bottom: 1px solid rgba(129, 140, 248, 0.2);
}

.modal-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, #fff 0%, rgba(129, 140, 248, 1) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-icon {
  font-size: var(--text-3xl);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  transform: scale(1.05);
}

.close-btn:focus {
  outline: 2px solid rgba(129, 140, 248, 0.8);
  outline-offset: 2px;
}

/* コンテンツ */
.modal-content {
  flex: 1;
  padding: var(--space-xl);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(129, 140, 248, 0.3) transparent;
}

.modal-content::-webkit-scrollbar {
  width: 8px;
}

.modal-content::-webkit-scrollbar-track {
  background: transparent;
}

.modal-content::-webkit-scrollbar-thumb {
  background: rgba(129, 140, 248, 0.3);
  border-radius: 4px;
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background: rgba(129, 140, 248, 0.5);
}

/* ルールブックコンテンツ */
.rulebook-content :deep(.markdown-body) {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.8;
}

.rulebook-content :deep(.main-title) {
  display: none; /* メインタイトルはヘッダーに表示 */
}

.rulebook-content :deep(h2) {
  font-size: var(--text-xl);
  font-weight: 700;
  color: #fff;
  margin: var(--space-xl) 0 var(--space-md);
  padding-bottom: var(--space-sm);
  border-bottom: 2px solid rgba(129, 140, 248, 0.3);
}

.rulebook-content :deep(h3) {
  font-size: var(--text-lg);
  font-weight: 600;
  color: rgba(129, 140, 248, 1);
  margin: var(--space-lg) 0 var(--space-sm);
}

.rulebook-content :deep(h4) {
  font-size: var(--text-base);
  font-weight: 600;
  color: rgba(167, 139, 250, 1);
  margin: var(--space-md) 0 var(--space-xs);
}

.rulebook-content :deep(p) {
  margin: var(--space-sm) 0;
}

.rulebook-content :deep(strong) {
  color: #fff;
  font-weight: 600;
}

.rulebook-content :deep(em) {
  color: rgba(167, 139, 250, 1);
  font-style: italic;
}

.rulebook-content :deep(code) {
  background: rgba(129, 140, 248, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 0.9em;
}

.rulebook-content :deep(hr) {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(129, 140, 248, 0.5) 50%, transparent 100%);
  margin: var(--space-xl) 0;
}

.rulebook-content :deep(ul) {
  margin: var(--space-sm) 0;
  padding-left: var(--space-lg);
}

.rulebook-content :deep(li) {
  margin: var(--space-xs) 0;
  position: relative;
}

.rulebook-content :deep(li)::marker {
  color: rgba(129, 140, 248, 1);
}

/* テーブル */
.rulebook-content :deep(.table-wrapper) {
  overflow-x: auto;
  margin: var(--space-md) 0;
  border-radius: 12px;
  border: 1px solid rgba(129, 140, 248, 0.2);
}

.rulebook-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.rulebook-content :deep(tr:first-child) {
  background: rgba(129, 140, 248, 0.15);
}

.rulebook-content :deep(tr:first-child td) {
  font-weight: 600;
  color: #fff;
}

.rulebook-content :deep(tr:not(:first-child)) {
  border-top: 1px solid rgba(129, 140, 248, 0.1);
}

.rulebook-content :deep(tr:not(:first-child):hover) {
  background: rgba(129, 140, 248, 0.05);
}

.rulebook-content :deep(td) {
  padding: var(--space-sm) var(--space-md);
  text-align: left;
}

/* フッター */
.modal-footer {
  display: flex;
  justify-content: center;
  padding: var(--space-md) var(--space-xl);
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(129, 140, 248, 0.1);
}

.btn-close {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-xl);
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(129, 140, 248, 0.8) 0%, rgba(99, 102, 241, 0.8) 100%);
  color: white;
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: linear-gradient(135deg, rgba(129, 140, 248, 1) 0%, rgba(99, 102, 241, 1) 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(129, 140, 248, 0.4);
}

.btn-close:focus {
  outline: 2px solid rgba(129, 140, 248, 0.8);
  outline-offset: 2px;
}

.btn-close .btn-icon {
  font-size: var(--text-lg);
}

/* モバイル対応 */
@media (max-width: 640px) {
  .modal-overlay {
    padding: var(--space-sm);
  }
  
  .modal-container {
    max-height: 95vh;
    border-radius: 16px;
  }
  
  .modal-header {
    padding: var(--space-md);
  }
  
  .modal-title {
    font-size: var(--text-xl);
  }
  
  .title-icon {
    font-size: var(--text-2xl);
  }
  
  .modal-content {
    padding: var(--space-md);
  }
  
  .rulebook-content :deep(h2) {
    font-size: var(--text-lg);
  }
  
  .rulebook-content :deep(h3) {
    font-size: var(--text-base);
  }
  
  .rulebook-content :deep(.table-wrapper) {
    font-size: var(--text-xs);
  }
}

/* モーション削減設定 */
@media (prefers-reduced-motion: reduce) {
  .modal-fade-enter-active,
  .modal-fade-leave-active,
  .modal-fade-enter-active .modal-container,
  .modal-fade-leave-active .modal-container {
    transition: none;
  }
  
  .close-btn,
  .btn-close {
    transition: none;
  }
}
</style>
