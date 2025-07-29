# アクセシビリティ実装ドキュメント

> **最終更新**: 2025/01/28  
> **文書種別**: 正式仕様書  
> **更新頻度**: 定期的

## 概要

本ドキュメントは、人生充実ゲームにおけるWCAG 2.1 AA基準を満たすアクセシビリティ実装について記載します。

## 実装済み機能

### 1. 視覚的アクセシビリティ

#### 色覚異常対応
- **実装ファイル**: `src/components/accessibility/AccessibilitySettings.vue`
- **対応する色覚異常**:
  - 赤色覚異常（1型・Protanopia）
  - 緑色覚異常（2型・Deuteranopia）
  - 青色覚異常（3型・Tritanopia）
  - 全色覚異常（Achromatopsia）
- **実装方法**: SVGフィルターによる色変換マトリックス適用

#### ハイコントラストモード
- **実装**: CSS変数とクラスベースの切り替え
- **対応要素**:
  - 背景色の完全な黒化
  - テキストコントラスト比4.5:1以上
  - ボーダーの強調表示

#### フォントサイズ調整
- **サイズオプション**: 小(14px)、中(16px)、大(20px)、特大(24px)
- **実装**: CSS変数 `--base-font-size` による動的調整

### 2. モーション設定

#### モーション削減
- **実装**: `prefers-reduced-motion` メディアクエリ対応
- **削減対象**:
  - すべてのアニメーション
  - トランジション効果
  - 視差効果

#### アニメーション速度調整
- **範囲**: 0.1x〜2.0x
- **実装**: CSS変数 `--animation-speed-multiplier`

### 3. キーボードナビゲーション

#### 実装済みショートカット
- `Alt+G`: ゲーム開始
- `Alt+T`: チュートリアル開始
- `Alt+H`: ホーム画面に戻る
- `Alt+A`: アクセシビリティ設定を開く
- `F1`: ヘルプ表示
- `Tab/Shift+Tab`: 要素間の移動
- `矢印キー`: 方向移動
- `Enter/Space`: 選択・実行

#### フォーカス管理
- **実装ファイル**: `src/components/accessibility/KeyboardManager.ts`
- **機能**:
  - フォーカス可能要素の自動検出
  - フォーカストラップ
  - グループナビゲーション
  - カスタムフォーカスインジケーター

### 4. スクリーンリーダー対応

#### ARIA実装
- **実装ファイル**: `src/components/accessibility/ScreenReaderManager.ts`
- **主要機能**:
  - ARIA Live Regions (polite/assertive)
  - ゲーム状態の音声通知
  - カード情報の詳細読み上げ
  - エラー・成功メッセージの即時通知

#### セマンティックHTML
- 適切なランドマーク（main, nav, footer）
- 見出し階層の正確な実装
- スキップリンクの提供

### 5. タッチターゲット

#### サイズオプション
- 標準: 44px（iOS推奨）
- 大: 56px
- 特大: 72px

#### 実装
- CSS変数 `--touch-target-size` による動的調整
- すべてのインタラクティブ要素に適用

## 使用方法

### アクセシビリティ設定の開き方
1. 画面右下のアクセシビリティボタンをクリック
2. キーボードショートカット `Alt+A` を使用
3. ゲーム内メニューから選択

### 設定の永続化
- すべての設定はlocalStorageに保存
- ブラウザを閉じても設定は維持される

## テスト方法

### 自動テスト
```typescript
import { A11yTestHelper } from '@/components/accessibility/A11yTestHelper'

// 要素のテスト
const result = A11yTestHelper.testElement(element)
console.log(result)

// 全体レポートの生成
const report = A11yTestHelper.generateReport()
console.log(report)
```

### 手動テスト
1. **キーボードのみでの操作確認**
   - マウスを使用せずにすべての機能にアクセス可能か
   - フォーカスインジケーターが明確に表示されるか

2. **スクリーンリーダーでの確認**
   - NVDA、JAWS、VoiceOverで動作確認
   - すべての情報が音声で伝わるか

3. **色覚異常シミュレーション**
   - 各モードで情報が正しく伝わるか
   - 色のみに依存した情報がないか

## ベストプラクティス

### 開発時の注意点
1. **色のみに依存しない**
   - アイコンやテキストを併用
   - パターンや形状で区別

2. **適切なARIA属性の使用**
   - 必要最小限のARIA
   - ネイティブHTMLを優先

3. **フォーカス順序の維持**
   - 論理的な順序
   - 隠れた要素にフォーカスさせない

4. **エラーメッセージの明確化**
   - 具体的な修正方法を提示
   - スクリーンリーダーで即座に通知

## トラブルシューティング

### よくある問題と解決方法

#### フォーカスが表示されない
```css
/* 解決方法: フォーカススタイルを明示的に定義 */
.element:focus {
  outline: 3px solid var(--primary-light);
  outline-offset: 2px;
}
```

#### スクリーンリーダーが読み上げない
```html
<!-- 解決方法: 適切なARIA属性を追加 -->
<button aria-label="ゲームを開始する" aria-describedby="game-desc">
  開始
</button>
<div id="game-desc" class="sr-only">
  保険をテーマにした人生シミュレーションゲーム
</div>
```

#### タッチターゲットが小さい
```css
/* 解決方法: 最小サイズを保証 */
button {
  min-width: var(--touch-target-size, 44px);
  min-height: var(--touch-target-size, 44px);
}
```

## 今後の改善予定

### 短期（1-2週間）
- [ ] 音声操作対応
- [ ] より詳細なゲーム状態の音声フィードバック
- [ ] カスタムカーソルオプション

### 中期（1ヶ月）
- [ ] 多言語対応（日本語手話対応含む）
- [ ] AIによる画像説明生成
- [ ] ジェスチャー操作のカスタマイズ

### 長期（3ヶ月）
- [ ] 完全な音声ゲームモード
- [ ] 触覚フィードバック対応
- [ ] アクセシビリティAPIの公開

## 参考資料

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/resources/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)