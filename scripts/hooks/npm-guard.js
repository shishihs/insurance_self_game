#!/usr/bin/env node

// npm コマンド実行前のガード
// 危険なnpmコマンドの実行を防ぐ

// 環境変数から実行予定のコマンドを取得
const command = process.env.CLAUDE_BASH_COMMAND || '';

// 危険なnpmコマンドのパターン
const dangerousPatterns = [
  /npm\s+install\s+-g/,  // グローバルインストール
  /npm\s+uninstall\s+-g/, // グローバルアンインストール
  /npm\s+publish/,        // パッケージ公開
  /npm\s+unpublish/,      // パッケージ削除
];

// 危険なコマンドチェック
for (const pattern of dangerousPatterns) {
  if (pattern.test(command)) {
    console.error(`⚠️  危険なnpmコマンドが検出されました: ${command}`);
    console.error('このコマンドの実行は制限されています。');
    process.exit(1);
  }
}

process.exit(0);