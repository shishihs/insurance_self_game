#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * インポートパス検証と自動化ツール
 * Issue #6対応 - TypeScriptプロジェクトのインポートパス整合性を検証・修正
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// 設定
const CONFIG = {
  // 検証対象のファイル拡張子
  extensions: ['.ts', '.tsx', '.vue', '.js', '.jsx'],
  
  // 除外ディレクトリ
  excludeDirs: ['node_modules', 'dist', '.git', 'coverage', 'test-results'],
  
  // パスエイリアス設定（tsconfig.jsonから取得）
  aliases: {
    '@': './src',
    '@/components': './src/components',
    '@/utils': './src/utils',
    '@/types': './src/types',
    '@/game': './src/game',
    '@/domain': './src/domain'
  },
  
  // 警告レベル
  warningLevels: {
    MISSING_FILE: 'error',
    CIRCULAR_DEPENDENCY: 'error',
    UNUSED_IMPORT: 'warning',
    INCONSISTENT_ALIAS: 'warning',
    RELATIVE_PATH_DEPTH: 'warning'
  },
  
  // 自動修正の有効化
  autoFix: {
    aliasOptimization: true,
    unusedImports: true,
    pathNormalization: true
  }
};

class ImportPathValidator {
  constructor() {
    this.projectRoot = PROJECT_ROOT;
    this.issues = {
      errors: [],
      warnings: [],
      fixed: []
    };
    this.dependencyGraph = new Map();
    this.fileCache = new Map();
  }

  /**
   * メイン実行関数
   */
  async run(options = {}) {
    console.log('🔍 インポートパス検証開始\n');
    
    try {
      // 1. プロジェクトファイルの収集
      const files = await this.collectProjectFiles();
      console.log(`📁 対象ファイル数: ${files.length}`);
      
      // 2. インポート文の解析
      await this.analyzeImports(files);
      
      // 3. パス検証
      await this.validatePaths();
      
      // 4. 循環依存チェック
      await this.checkCircularDependencies();
      
      // 5. 未使用インポートチェック
      await this.checkUnusedImports();
      
      // 6. エイリアス最適化
      await this.optimizeAliases();
      
      // 7. 自動修正（オプション）
      if (options.autoFix) {
        await this.performAutoFix();
      }
      
      // 8. レポート生成
      await this.generateReport();
      
      // 9. 結果出力
      this.printSummary();
      
      return this.getValidationResult();
      
    } catch (error) {
      console.error('❌ 検証エラー:', error.message);
      throw error;
    }
  }

  /**
   * プロジェクトファイルの収集
   */
  async collectProjectFiles() {
    const files = [];
    
    const walk = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = path.relative(this.projectRoot, fullPath);
        
        // 除外ディレクトリのチェック
        if (CONFIG.excludeDirs.some(exclude => relativePath.startsWith(exclude))) {
          continue;
        }
        
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (CONFIG.extensions.some(ext => item.endsWith(ext))) {
          files.push({
            path: fullPath,
            relativePath,
            content: null // 必要時に読み込み
          });
        }
      }
    };
    
    walk(path.join(this.projectRoot, 'src'));
    return files;
  }

  /**
   * インポート文の解析
   */
  async analyzeImports(files) {
    console.log('🔍 インポート解析中...');
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file.path, 'utf8');
        file.content = content;
        
        const imports = this.extractImports(content);
        file.imports = imports;
        
        // 依存関係グラフに追加
        this.dependencyGraph.set(file.relativePath, imports.map(imp => imp.path));
        
      } catch (error) {
        this.addIssue('error', 'FILE_READ_ERROR', `ファイル読み込みエラー: ${file.relativePath}`, {
          file: file.relativePath,
          error: error.message
        });
      }
    }
    
    this.files = files;
  }

  /**
   * インポート文の抽出
   */
  extractImports(content) {
    const imports = [];
    
    // import文のパターン
    const patterns = [
      // import ... from '...'
      /import\s+(?:{[^}]*}|\w+|\*\s+as\s+\w+)\s+from\s+['"`]([^'"`]+)['"`]/g,
      // import('...')
      /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
      // require('...')
      /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1];
        
        // 相対パスまたはエイリアスパスのみ対象
        if (importPath.startsWith('.') || importPath.startsWith('@')) {
          imports.push({
            path: importPath,
            fullMatch: match[0],
            line: this.getLineNumber(content, match.index)
          });
        }
      }
    }
    
    return imports;
  }

  /**
   * 行番号取得
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * パス検証
   */
  async validatePaths() {
    console.log('🔍 パス検証中...');
    
    for (const file of this.files) {
      for (const importInfo of file.imports || []) {
        const resolvedPath = this.resolvePath(file.relativePath, importInfo.path);
        
        if (!resolvedPath || !this.fileExists(resolvedPath)) {
          this.addIssue('error', 'MISSING_FILE', 
            `存在しないファイルのインポート: ${importInfo.path}`, {
            file: file.relativePath,
            line: importInfo.line,
            importPath: importInfo.path,
            resolvedPath
          });
        }
      }
    }
  }

  /**
   * パスの解決
   */
  resolvePath(fromFile, importPath) {
    try {
      // エイリアスの解決
      if (importPath.startsWith('@/')) {
        const aliasResolved = importPath.replace('@/', 'src/');
        return this.findActualFile(aliasResolved);
      }
      
      // 相対パスの解決
      if (importPath.startsWith('.')) {
        const fromDir = path.dirname(fromFile);
        const resolved = path.join(fromDir, importPath);
        return this.findActualFile(resolved);
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 実際のファイルを探す（拡張子補完含む）
   */
  findActualFile(basePath) {
    // そのままのパスで存在確認
    if (fs.existsSync(path.join(this.projectRoot, basePath))) {
      return basePath;
    }
    
    // 拡張子を補完して確認
    for (const ext of CONFIG.extensions) {
      const withExt = `${basePath}${ext}`;
      if (fs.existsSync(path.join(this.projectRoot, withExt))) {
        return withExt;
      }
    }
    
    // index.* ファイルの確認
    for (const ext of CONFIG.extensions) {
      const indexFile = path.join(basePath, `index${ext}`);
      if (fs.existsSync(path.join(this.projectRoot, indexFile))) {
        return indexFile;
      }
    }
    
    return null;
  }

  /**
   * ファイル存在確認
   */
  fileExists(relativePath) {
    if (!relativePath) return false;
    return fs.existsSync(path.join(this.projectRoot, relativePath));
  }

  /**
   * 循環依存チェック
   */
  async checkCircularDependencies() {
    console.log('🔄 循環依存チェック中...');
    
    const visited = new Set();
    const recursionStack = new Set();
    
    const dfs = (node, path = []) => {
      if (recursionStack.has(node)) {
        // 循環依存を検出
        const cycleStart = path.indexOf(node);
        const cycle = path.slice(cycleStart).concat(node);
        
        this.addIssue('error', 'CIRCULAR_DEPENDENCY',
          `循環依存を検出: ${cycle.join(' → ')}`, {
          cycle,
          files: cycle
        });
        return;
      }
      
      if (visited.has(node)) {
        return;
      }
      
      visited.add(node);
      recursionStack.add(node);
      
      const dependencies = this.dependencyGraph.get(node) || [];
      for (const dep of dependencies) {
        const resolvedDep = this.resolvePath(node, dep);
        if (resolvedDep && this.dependencyGraph.has(resolvedDep)) {
          dfs(resolvedDep, [...path, node]);
        }
      }
      
      recursionStack.delete(node);
    };
    
    for (const node of this.dependencyGraph.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }
  }

  /**
   * 未使用インポートチェック
   */
  async checkUnusedImports() {
    console.log('🗑️ 未使用インポートチェック中...');
    
    for (const file of this.files) {
      if (!file.content) continue;
      
      const imports = this.extractDetailedImports(file.content);
      
      for (const importInfo of imports) {
        const isUsed = this.isImportUsed(file.content, importInfo);
        
        if (!isUsed) {
          this.addIssue('warning', 'UNUSED_IMPORT',
            `未使用のインポート: ${importInfo.imported} from ${importInfo.path}`, {
            file: file.relativePath,
            line: importInfo.line,
            imported: importInfo.imported,
            path: importInfo.path
          });
        }
      }
    }
  }

  /**
   * 詳細なインポート情報の抽出
   */
  extractDetailedImports(content) {
    const imports = [];
    
    // named imports
    const namedImportRegex = /import\s*{([^}]+)}\s*from\s*['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = namedImportRegex.exec(content)) !== null) {
      const importedItems = match[1].split(',').map(item => item.trim());
      const importPath = match[2];
      const line = this.getLineNumber(content, match.index);
      
      for (const item of importedItems) {
        const imported = item.includes(' as ') ? 
          item.split(' as ')[1].trim() : 
          item.trim();
        
        imports.push({
          imported,
          path: importPath,
          line,
          type: 'named'
        });
      }
    }
    
    // default imports
    const defaultImportRegex = /import\s+(\w+)\s+from\s*['"`]([^'"`]+)['"`]/g;
    while ((match = defaultImportRegex.exec(content)) !== null) {
      imports.push({
        imported: match[1],
        path: match[2],
        line: this.getLineNumber(content, match.index),
        type: 'default'
      });
    }
    
    return imports;
  }

  /**
   * インポートの使用確認
   */
  isImportUsed(content, importInfo) {
    // インポート文自体を除外
    const contentWithoutImports = content.replace(/import[^;]+;?/g, '');
    
    // シンプルな文字列検索（改善の余地あり）
    const regex = new RegExp(`\\b${importInfo.imported}\\b`, 'g');
    const matches = contentWithoutImports.match(regex);
    
    return matches && matches.length > 0;
  }

  /**
   * エイリアス最適化
   */
  async optimizeAliases() {
    console.log('🔧 エイリアス最適化中...');
    
    for (const file of this.files) {
      for (const importInfo of file.imports || []) {
        if (importInfo.path.startsWith('../')) {
          // 相対パスをエイリアスに変換できるかチェック
          const suggestion = this.suggestAliasOptimization(file.relativePath, importInfo.path);
          
          if (suggestion) {
            this.addIssue('warning', 'ALIAS_OPTIMIZATION',
              `エイリアス使用を推奨: ${importInfo.path} → ${suggestion}`, {
              file: file.relativePath,
              line: importInfo.line,
              current: importInfo.path,
              suggested: suggestion
            });
          }
        }
      }
    }
  }

  /**
   * エイリアス最適化の提案
   */
  suggestAliasOptimization(fromFile, importPath) {
    const fromDir = path.dirname(fromFile);
    const resolved = path.resolve(fromDir, importPath);
    const relativePath = path.relative('src', resolved);
    
    // srcディレクトリ内の場合はエイリアス使用を提案
    if (!relativePath.startsWith('..')) {
      return `@/${relativePath.replace(/\\/g, '/')}`;
    }
    
    return null;
  }

  /**
   * 自動修正実行
   */
  async performAutoFix() {
    console.log('🔧 自動修正実行中...');
    
    let fixCount = 0;
    
    for (const file of this.files) {
      let content = file.content;
      let modified = false;
      
      // エイリアス最適化
      if (CONFIG.autoFix.aliasOptimization) {
        const { newContent, changes } = this.fixAliases(content, file.relativePath);
        if (changes > 0) {
          content = newContent;
          modified = true;
          fixCount += changes;
          this.addFixed(`${file.relativePath}: ${changes}件のエイリアス最適化`);
        }
      }
      
      // 未使用インポート削除
      if (CONFIG.autoFix.unusedImports) {
        const { newContent, changes } = this.removeUnusedImports(content);
        if (changes > 0) {
          content = newContent;
          modified = true;
          fixCount += changes;
          this.addFixed(`${file.relativePath}: ${changes}件の未使用インポート削除`);
        }
      }
      
      // ファイル保存
      if (modified) {
        fs.writeFileSync(file.path, content, 'utf8');
      }
    }
    
    console.log(`✅ ${fixCount}件の問題を自動修正しました`);
  }

  /**
   * エイリアス修正
   */
  fixAliases(content, filePath) {
    let newContent = content;
    let changes = 0;
    
    const relativePaths = newContent.match(/from\s*['"`](\.\.\/[^'"`]+)['"`]/g);
    
    if (relativePaths) {
      for (const match of relativePaths) {
        const pathMatch = match.match(/['"`](\.\.\/[^'"`]+)['"`]/);
        if (pathMatch) {
          const relativePath = pathMatch[1];
          const suggestion = this.suggestAliasOptimization(filePath, relativePath);
          
          if (suggestion) {
            newContent = newContent.replace(pathMatch[0], `"${suggestion}"`);
            changes++;
          }
        }
      }
    }
    
    return { newContent, changes };
  }

  /**
   * 未使用インポート削除
   */
  removeUnusedImports(content) {
    // より高度な実装が必要（AST解析等）
    // 現在は安全性のため実装せず
    return { newContent: content, changes: 0 };
  }

  /**
   * 問題の追加
   */
  addIssue(level, type, message, details = {}) {
    const issue = {
      level,
      type,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    
    if (level === 'error') {
      this.issues.errors.push(issue);
    } else {
      this.issues.warnings.push(issue);
    }
  }

  /**
   * 修正の記録
   */
  addFixed(message) {
    this.issues.fixed.push({
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * レポート生成
   */
  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: this.files?.length || 0,
        errors: this.issues.errors.length,
        warnings: this.issues.warnings.length,
        fixed: this.issues.fixed.length
      },
      issues: this.issues,
      dependencyStats: {
        totalDependencies: Array.from(this.dependencyGraph.values())
          .reduce((sum, deps) => sum + deps.length, 0),
        circularDependencies: this.issues.errors
          .filter(e => e.type === 'CIRCULAR_DEPENDENCY').length
      }
    };
    
    // JSONレポート
    const reportPath = path.join(this.projectRoot, 'test-results', 'import-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // HTMLレポート
    const htmlReport = this.generateHtmlReport(report);
    const htmlPath = path.join(this.projectRoot, 'test-results', 'import-validation-report.html');
    fs.writeFileSync(htmlPath, htmlReport);
    
    console.log(`📄 レポート生成: ${reportPath}`);
  }

  /**
   * HTMLレポート生成
   */
  generateHtmlReport(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>インポートパス検証レポート</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: white; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .error { border-left: 4px solid #dc3545; }
        .warning { border-left: 4px solid #ffc107; }
        .fixed { border-left: 4px solid #28a745; }
        .issue { margin: 10px 0; padding: 10px; border-radius: 4px; }
        .issue-details { font-size: 0.9em; color: #666; margin-top: 5px; }
    </style>
</head>
<body>
    <h1>🔍 インポートパス検証レポート</h1>
    
    <div class="summary">
        <h2>📊 概要</h2>
        <div class="metric">
            <strong>対象ファイル:</strong> ${report.summary.totalFiles}
        </div>
        <div class="metric error">
            <strong>エラー:</strong> ${report.summary.errors}
        </div>
        <div class="metric warning">
            <strong>警告:</strong> ${report.summary.warnings}
        </div>
        <div class="metric fixed">
            <strong>修正済み:</strong> ${report.summary.fixed}
        </div>
    </div>
    
    ${report.issues.errors.length > 0 ? `
    <h2>❌ エラー</h2>
    ${report.issues.errors.map(error => `
        <div class="issue error">
            <strong>${error.type}:</strong> ${error.message}
            <div class="issue-details">
                ファイル: ${error.details.file || 'N/A'}<br>
                行: ${error.details.line || 'N/A'}
            </div>
        </div>
    `).join('')}
    ` : ''}
    
    ${report.issues.warnings.length > 0 ? `
    <h2>⚠️ 警告</h2>
    ${report.issues.warnings.map(warning => `
        <div class="issue warning">
            <strong>${warning.type}:</strong> ${warning.message}
            <div class="issue-details">
                ファイル: ${warning.details.file || 'N/A'}<br>
                行: ${warning.details.line || 'N/A'}
            </div>
        </div>
    `).join('')}
    ` : ''}
    
    ${report.issues.fixed.length > 0 ? `
    <h2>✅ 自動修正</h2>
    ${report.issues.fixed.map(fix => `
        <div class="issue fixed">
            ${fix.message}
        </div>
    `).join('')}
    ` : ''}
    
    <h2>📈 依存関係統計</h2>
    <p>総依存関係数: ${report.dependencyStats.totalDependencies}</p>
    <p>循環依存数: ${report.dependencyStats.circularDependencies}</p>
    
    <p><em>生成日時: ${report.timestamp}</em></p>
</body>
</html>`;
  }

  /**
   * 結果サマリー出力
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 インポートパス検証結果');
    console.log('='.repeat(60));
    
    console.log(`📁 対象ファイル数: ${this.files?.length || 0}`);
    console.log(`❌ エラー: ${this.issues.errors.length}`);
    console.log(`⚠️  警告: ${this.issues.warnings.length}`);
    console.log(`✅ 自動修正: ${this.issues.fixed.length}`);
    
    if (this.issues.errors.length > 0) {
      console.log('\n❌ 主要なエラー:');
      this.issues.errors.slice(0, 5).forEach(error => {
        console.log(`   - ${error.message}`);
      });
    }
    
    if (this.issues.warnings.length > 0) {
      console.log('\n⚠️  主要な警告:');
      this.issues.warnings.slice(0, 5).forEach(warning => {
        console.log(`   - ${warning.message}`);
      });
    }
  }

  /**
   * 検証結果の取得
   */
  getValidationResult() {
    return {
      success: this.issues.errors.length === 0,
      errors: this.issues.errors.length,
      warnings: this.issues.warnings.length,
      fixed: this.issues.fixed.length,
      details: this.issues
    };
  }
}

// CLI実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ImportPathValidator();
  
  const options = {
    autoFix: process.argv.includes('--fix')
  };
  
  validator.run(options)
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { ImportPathValidator, CONFIG };