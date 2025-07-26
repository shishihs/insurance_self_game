#!/bin/bash

# Claude Code Hooks セットアップスクリプト

echo "🎮 === Claude Code Hooks セットアップ ==="
echo ""

# .claudeディレクトリ作成
echo "📁 .claudeディレクトリを作成中..."
mkdir -p .claude/logs
mkdir -p .claude/hooks
mkdir -p .claude/commands

# settings.jsonをコピー（既に作成済みの場合はバックアップ）
if [ -f ".claude/settings.json" ]; then
    echo "⚠️  既存のsettings.jsonをバックアップ中..."
    cp .claude/settings.json .claude/settings.json.backup.$(date +%Y%m%d_%H%M%S)
fi

# ログファイルの作成
touch .claude/logs/command-history.log
touch .claude/logs/prompt-history.log

# カスタムコマンドの作成
echo "📝 カスタムコマンドを作成中..."

# principles コマンド
cat > .claude/commands/principles.md << 'EOF'
Show the PRINCIPLES.md file

```bash
cat docs/PRINCIPLES.md
```
EOF

# task-complete コマンド
cat > .claude/commands/task-complete.md << 'EOF'
Run the task completion check

```bash
echo '🎯 === タスク完了確認 ==='
echo ''
cat docs/PRINCIPLES.md | grep -A 15 'タスク完了時の復唱'
echo ''
echo '✅ チェックリスト:'
echo '  □ プレイヤーファーストで実装した'
echo '  □ 可能な限りシンプルにした'
echo '  □ テストを書いて品質を保証した'
echo '  □ ドキュメントを更新した'
echo '  □ 次の人が理解できるコードにした'
```
EOF

# status コマンド
cat > .claude/commands/status.md << 'EOF'
Show project status and recent activities

```bash
echo '📊 === プロジェクトステータス ==='
echo ''
echo '📁 最近の変更:'
git status --short 2>/dev/null || echo 'Gitリポジトリが初期化されていません'
echo ''
echo '📝 最近のコミット:'
git log --oneline -5 2>/dev/null || echo 'コミットがありません'
echo ''
echo '🎯 最近のプロンプト:'
tail -5 .claude/logs/prompt-history.log 2>/dev/null || echo 'プロンプト履歴がありません'
echo ''
echo '💻 最近のコマンド:'
tail -5 .claude/logs/command-history.log 2>/dev/null || echo 'コマンド履歴がありません'
```
EOF

# CLAUDE.md ファイルの作成
echo "📄 CLAUDE.mdファイルを作成中..."
cat > .claude/CLAUDE.md << 'EOF'
# 人生充実ゲーム - Claude Code プロジェクト情報

## プロジェクト概要
生命保険を「人生の味方」として活用し、様々な人生の転機を乗り越えながら、最終的に大きな夢を実現する一人用デッキ構築カードゲーム。

## 重要なコマンド
- `pnpm dev` - 開発サーバー起動
- `pnpm build` - プロダクションビルド
- `pnpm test` - テスト実行
- `pnpm tc` - タスク完了確認
- `pnpm principles` - 開発原則の確認

## カスタムコマンド（Claude Code内で使用可能）
- `/principles` - PRINCIPLES.mdを表示
- `/task-complete` - タスク完了チェック
- `/status` - プロジェクトステータス確認

## 開発の心得
「一人の時間を、最高の冒険に」

技術は手段、目的は人の幸せ。
プレイヤーファーストで、シンプルに、楽しく開発しましょう。

## 重要なファイル
- `docs/PRINCIPLES.md` - 開発原則（必読）
- `docs/TECH_SPEC.md` - 技術仕様
- `docs/ROADMAP.md` - 開発計画
- `docs/GAME_DESIGN.md` - ゲーム仕様
EOF

# .gitignoreに追加
echo "📝 .gitignoreを更新中..."
if ! grep -q ".claude/logs" .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# Claude Code" >> .gitignore
    echo ".claude/logs/" >> .gitignore
    echo ".claude/settings.json.backup.*" >> .gitignore
fi

echo ""
echo "✅ === セットアップ完了 ==="
echo ""
echo "🎯 設定されたHooks:"
echo "  1. UserPromptSubmit - タスク開始時にPRINCIPLES.mdを表示"
echo "  2. PreToolUse - 危険なコマンドやファイル操作をブロック"
echo "  3. PostToolUse - ファイル編集後に原則確認とフォーマット"
echo "  4. Stop - セッション終了時にメッセージ表示"
echo "  5. Notification - デスクトップ通知"
echo ""
echo "📝 使用可能なカスタムコマンド:"
echo "  - /principles"
echo "  - /task-complete"
echo "  - /status"
echo ""
echo "⚡ 使い方:"
echo "  1. Claude Codeで作業を開始すると自動的にPRINCIPLES.mdが表示されます"
echo "  2. ファイルを編集するたびに原則の確認が表示されます"
echo "  3. セッション終了時に振り返りメッセージが表示されます"
