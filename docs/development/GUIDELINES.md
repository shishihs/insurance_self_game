# 開発ガイドライン

## ⚠️ 重要：テスト駆動開発の原則

### テスト成功率100%の厳守
```
開発時の絶対ルール:
「すべてのテストが成功するまで、作業は完了していない」
```

**テスト失敗時の対応:**
1. **部分的な成功に満足しない** - 99%の成功も失敗と同じ
2. **根本原因を特定する** - エラーメッセージを正確に読み取る
3. **影響範囲を確認する** - 一つの修正が他のテストを壊していないか
4. **完全な成功を確認する** - npm run test:run で全テスト成功を確認

### テスト実行コマンド
```bash
# 全テスト実行
npm run test:run

# 特定のテストファイル実行
npm run test:run src/__tests__/path/to/test.ts

# 型チェック
npm run type-check

# Lint実行
npm run lint
```

### テスト失敗時のデバッグ手順
1. **エラーの正確な把握**
   ```bash
   npm run test:run -- --reporter=verbose
   ```

2. **型エラーの確認**
   ```bash
   npm run type-check
   ```

3. **個別テストの実行**
   ```bash
   npm run test:run <specific-test-file>
   ```

4. **修正と再実行**
   - 修正は一つずつ行う
   - 各修正後にテストを実行
   - 全テスト成功まで繰り返す

## 🔒 並行開発安全システム

### Claude Code Hooks による包括的システム保護

**破壊的システムコマンドと並行開発事故**から開発者を保護するため、以下のコマンドは**自動的に禁止**されます：

#### 🚨 CRITICAL - システム破壊コマンド（即座にブロック）
- `rm -rf /` `rm -rf ~` `rm -rf $HOME` - **ディレクトリ全削除**
- `dd if=/dev/zero of=/dev/sda` - **ディスク破壊**
- `:(){ :|:& };:` - **フォークボム（システムクラッシュ）**
- `chmod -R 000 /` - **権限破壊**
- `cat /etc/shadow` - **機密情報漏洩**
- `curl ... | bash` - **未検証スクリプト実行**

#### ⚠️ HIGH RISK - 並行開発リスク
- `git add .` - 一括追加は危険（個別ファイル指定必須）
- `git add -A` - 全体追加は危険
- `git add --all` - 全体追加は危険  
- `git add *` - ワイルドカード追加は危険

#### ✅ 推奨される安全な方法
```bash
# ❌ 危険：一括追加
git add .

# ✅ 安全：個別ファイル指定
git add src/components/GameCanvas.vue
git add src/domain/entities/Game.ts

# npm使用例
npm install lodash
```

#### 📋 フックシステムの機能
1. **Pre-Bash Hook**: 危険なコマンドの実行防止
2. **Post-Bash Hook**: コマンド実行結果の追跡
3. **Pre-Commit Hook**: コミット前の安全性チェック
4. **Task Complete Hook**: タスク完了時の次ステップ提案

#### 🔧 フックテスト
```bash
# フックシステムの動作確認
node .claude/test-hooks.cjs
```

#### 📊 ログ確認
全ての活動は `.claude/logs/` に記録されます：
- `bash-commands.log` - 実行コマンドの履歴
- `commit-checks.log` - コミット前チェック結果
- `task-completion.log` - タスク完了履歴

詳細は [`.claude/README.md`](.claude/README.md) を参照してください。
