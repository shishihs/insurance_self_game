#!/usr/bin/env node

// ファイル編集後のフック
// 開発原則をコンテキストに追加

// 開発原則をコンテキストに追加
const developmentPrinciples = `
🎯 === 開発原則の復唱 ===
  □ 安易な回避策でなく、根本的な解決を追求する
  □ git 管理により開発のストーリーを蓄積する
  □ ドキュメントを見て判断し、必要であればドキュメントを更新する
  □ 昨日より良いコードを書く努力を続ける
  □ 知的好奇心を持ち、常に「なぜ」を問い続ける

## 実装途中チェックリスト
- [ ] git管理は完璧か？
- [ ] 決まったことはドキュメンテーションされているか？
- [ ] わからないことを放置せず、なぜ？を追求できたか？
- [ ] エンジニアとして正しい判断をしたか？
- [ ] 何か大事なことを忘れていないか？

## 技術的な規約
- **必須**: pnpmを使用すること（npm使用禁止）
- **エラー対応**: 安易な回避策でなく、根本原因を特定して適切な解決策を実装する
`;

// コンテキストとして出力（Claude Codeが認識する形式）
console.log('<post-edit-hook>');
console.log('# development-principles-and-checklist');
console.log(developmentPrinciples.trim());
console.log('</post-edit-hook>');

process.exit(0);