# Claude Code Configuration for Insurance Game

## 🔒 包括的システム保護 - 開発者安全システム

このプロジェクトでは、Claude Codeのフックシステムを使用して**破壊的システムコマンドと並行開発事故**から開発者とシステムを保護しています。

### 🚨 CRITICAL - 即座にシステム破壊するコマンド（完全ブロック）

#### 破壊的ファイル削除
- `rm -rf /` - **ルートディレクトリ全削除**
- `rm -rf ~` - **ホームディレクトリ全削除**
- `rm -rf $HOME` - **ホームディレクトリ全削除**
- `rm -rf .` / `rm -rf ./` - **カレントディレクトリ削除**
- `rm -rf ../` - **親ディレクトリ削除**
- `rm -rf *` - **ワイルドカード全削除**
- `sudo rm -rf /` 系 - **管理者権限での全削除**

#### システム破壊コマンド
- `dd if=/dev/zero of=/dev/sda` - **ディスク上書き破壊**
- `mkfs.*` - **ファイルシステム初期化**
- `chmod -R 000 /` - **ルート権限完全剥奪**

#### 機密情報漏洩
- `cat /etc/shadow` - **パスワードハッシュ表示**
- `cat /root/.ssh/id_rsa` - **秘密鍵表示**

#### プロセス・システム攻撃
- `:(){ :|:& };:` - **フォークボム（プロセス爆弾）**
- `kill -9 -1` - **全プロセス強制終了**
- `curl ... | bash` - **未検証スクリプト実行**

### ⚠️ HIGH RISK - 開発作業に影響するコマンド

#### Git関連（並行開発保護）
- `git add .` - 一括追加は禁止（個別ファイル指定が必要）
- `git add -A` - 全体追加は禁止
- `git add --all` - 全体追加は禁止
- `git add *` - ワイルドカード追加は禁止

#### Package Manager
- `npm` コマンド全般 - pnpmの使用が必須

#### システム設定
- `fdisk /dev/*` - ディスクパーティション操作
- `iptables ... -j DROP` - ファイアウォール設定
- `export PATH=""` - 環境変数破壊

### ✅ 推奨される安全な方法

```bash
# ❌ 危険：一括追加
git add .

# ✅ 安全：個別ファイル指定
git add src/components/GameCanvas.vue
git add src/domain/entities/Game.ts

# ❌ 危険：npm使用
npm install lodash

# ✅ 安全：npm使用  
npm install lodash
```

### 📋 フック一覧

#### 1. Pre-Bash Hook (`pre-bash.js`)
- 危険なgitコマンドの実行を防止
- npmコマンドの使用を禁止
- 全てのbashコマンドをログに記録

#### 2. Post-Bash Hook (`post-bash.js`)  
- コマンド実行結果をログに記録
- git push/commit時に追加情報を表示
- 成功/失敗の統計を管理

#### 3. Pre-Commit Hook (`pre-commit.js`)
- ステージされたファイルの安全性チェック
- 機密情報の混入防止
- コミットメッセージの品質確認
- ブランチ安全性の警告

#### 4. Task Complete Hook (`task-complete.js`)
- タスク完了時の次ステップ提案
- プロジェクトヘルスチェック
- デプロイサイクルの促進

### 📊 ログシステム

全てのフックの活動は `.claude/logs/` ディレクトリに記録されます：

- `bash-commands.log` - 実行されたbashコマンドの履歴
- `commit-checks.log` - コミット前チェックの結果
- `task-completion.log` - タスク完了の履歴

### 🛠 設定

フックの動作は `.claude/config.json` で調整できます：

```json
{
  "settings": {
    "safe_mode": true,
    "git_safety": {
      "block_add_all": true,
      "require_explicit_files": true,
      "log_all_commands": true
    },
    "development": {
      "package_manager": "pnpm",
      "block_npm": true
    }
  }
}
```

### 🚀 緊急時の対応

フックが誤作動する場合の緊急回避方法：

```bash
# フックを一時的に無効化（非推奨）
export CLAUDE_HOOKS_DISABLED=1

# または設定でsafe_modeを無効化
# .claude/config.json の "safe_mode": false
```

### 💡 並行開発のベストプラクティス

1. **明確なファイル指定**: 常に `git add <specific-file>` を使用
2. **小さなコミット**: 1つの機能や修正につき1コミット
3. **頻繁なプッシュ**: 作業完了ごとに即座にデプロイ
4. **ブランチ活用**: 大きな変更はフィーチャーブランチを使用

### 🔧 トラブルシューティング

#### フックが動作しない場合
1. Node.jsがインストールされているか確認
2. `.claude/hooks/` ディレクトリの権限を確認
3. `.claude/config.json` の設定を確認

#### ログが記録されない場合
1. `.claude/logs/` ディレクトリの書き込み権限を確認
2. ディスクの空き容量を確認

---

**このシステムにより、複数の開発者が同時に作業しても安全で効率的な開発環境を維持できます。**