#!/usr/bin/env node

// Todo更新後のフック
// 開発原則をコンテキストに追加

// 開発原則をコンテキストに追加
const developmentPrinciples = `
🎯 === 開発原則の復唱 ===
  □ 安易な回避策でなく、根本的な解決を追求する
  □ git 管理により開発のストーリーを蓄積する
  □ ドキュメントを見て判断し、必要であればドキュメントを更新する
  □ 昨日より良いコードを書く努力を続ける
  □ 知的好奇心を持ち、常に「なぜ」を問い続ける

## Todo管理のベストプラクティス
- [ ] タスクは具体的で実行可能な単位に分割されているか？
- [ ] 優先度は適切に設定されているか？
- [ ] 完了したタスクから得られた知見をドキュメント化したか？
- [ ] 次のアクションが明確になっているか？

## 技術的な規約
- **必須**: pnpmを使用すること（npm使用禁止）
- **エラー対応**: 安易な回避策でなく、根本原因を特定して適切な解決策を実装する
`;

// コンテキストとして出力（Claude Codeが認識する形式）
console.log('<post-todo-hook>');
console.log('# development-principles-and-todo-management');
console.log(developmentPrinciples.trim());
console.log('</post-todo-hook>');

process.exit(0);