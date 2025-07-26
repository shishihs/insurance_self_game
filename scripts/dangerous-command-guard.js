#!/usr/bin/env node

// 危険なコマンド実行前のガード
// システムに影響を与える可能性のあるコマンドの実行を防ぐ

const command = process.env.CLAUDE_BASH_COMMAND || '';

// 危険なコマンドのパターン
const dangerousPatterns = [
  /rm\s+-rf\s+\//, // ルートディレクトリの削除
  /rm\s+-rf\s+\*/, // すべてのファイル削除
  /format\s+c:/i,  // Windows ドライブフォーマット
  /del\s+\/s\s+\/q\s+c:\\/i, // Windows システムファイル削除
  /shutdown/,      // システムシャットダウン
  /restart/,       // システム再起動
  /chmod\s+777/,   // 危険な権限変更
];

// 危険なコマンドチェック
for (const pattern of dangerousPatterns) {
  if (pattern.test(command)) {
    console.error(`🚫 危険なコマンドが検出されました: ${command}`);
    console.error('このコマンドの実行は制限されています。');
    process.exit(1);
  }
}

process.exit(0);