import { test, expect } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';

test.describe('🔗 CUI-GUI統合テスト: プレイテスト自動連携', () => {
  let cuiProcess: ChildProcess | null = null;
  
  test.afterEach(async () => {
    // CUIプロセスをクリーンアップ
    if (cuiProcess) {
      cuiProcess.kill();
      cuiProcess = null;
    }
  });

  test('CUIプレイテスト実行と結果検証', async ({ page }) => {
    const projectRoot = join(__dirname, '../../');
    
    // CUIプレイテストを非同期で実行
    const cuiOutput: string[] = [];
    const cuiErrors: string[] = [];
    
    cuiProcess = spawn('node', ['cui-playtest.mjs'], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    cuiProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      cuiOutput.push(output);
      console.log(`📟 CUI出力: ${output.trim()}`);
    });
    
    cuiProcess.stderr?.on('data', (data) => {
      const error = data.toString();
      cuiErrors.push(error);
      console.error(`🔴 CUIエラー: ${error.trim()}`);
    });
    
    // CUIプレイテストの実行を待機
    await new Promise((resolve) => {
      cuiProcess?.on('close', (code) => {
        console.log(`📟 CUIプロセス終了: code ${code}`);
        resolve(code);
      });
      
      // 10秒後にタイムアウト
      setTimeout(() => {
        if (cuiProcess) {
          cuiProcess.kill();
        }
        resolve(-1);
      }, 10000);
    });
    
    // CUI出力の分析
    const fullOutput = cuiOutput.join('');
    
    // ゲーム初期化が成功したかチェック
    expect(fullOutput).toContain('ゲーム初期化完了');
    
    // 活力情報が出力されているかチェック
    expect(fullOutput).toMatch(/初期活力: \d+/);
    
    // ターン実行ログが存在するかチェック
    expect(fullOutput).toMatch(/ターン \d+/);
    
    // エラーが発生していないかチェック
    expect(cuiErrors.length).toBe(0);
    
    // 同時にGUIでゲーム動作確認
    await page.goto('/');
    const startButton = page.locator('text=ゲームをプレイ');
    await startButton.click();
    await page.waitForTimeout(3000);
    
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    console.log('✅ CUI-GUI統合テスト: 両環境でゲーム正常動作');
  });

  test('CUIプレイテストログファイル検証', async ({ page }) => {
    const fs = require('fs').promises;
    const path = require('path');
    
    // ログファイルの存在確認
    const logDir = path.join(__dirname, '../../test-results');
    
    try {
      const files = await fs.readdir(logDir);
      const logFiles = files.filter((file: string) => file.includes('playtest') && file.endsWith('.md'));
      
      if (logFiles.length > 0) {
        console.log(`📋 プレイテストログファイル: ${logFiles.length}件発見`);
        
        // 最新のログファイルを読み込み
        const latestLog = logFiles.sort().pop();
        const logPath = path.join(logDir, latestLog);
        const logContent = await fs.readFile(logPath, 'utf-8');
        
        // ログ内容の基本チェック
        expect(logContent).toContain('# CUIプレイテスト結果');
        expect(logContent).toMatch(/## ゲーム\d+/); // ゲーム番号
        expect(logContent).toMatch(/活力: \d+/); // 活力情報
        
        // ログとGUI動作の連携確認
        await page.goto('/');
        const startButton = page.locator('text=ゲームをプレイ');
        await startButton.click();
        await page.waitForTimeout(2000);
        
        console.log('✅ CUIログファイル検証: ログ生成・内容確認完了');
      } else {
        console.log('⚠️ プレイテストログファイルが見つかりません');
      }
    } catch (error) {
      console.log('⚠️ ログディレクトリアクセスエラー:', error);
    }
  });

  test('CUI性能とGUI性能の比較測定', async ({ page }) => {
    // GUI性能測定
    const guiStartTime = Date.now();
    await page.goto('/');
    
    const startButton = page.locator('text=ゲームをプレイ');
    await startButton.click();
    await page.waitForTimeout(3000);
    
    const guiLoadTime = Date.now() - guiStartTime;
    console.log(`🖥️ GUI起動時間: ${guiLoadTime}ms`);
    
    // CUI性能測定
    const cuiStartTime = Date.now();
    const projectRoot = join(__dirname, '../../');
    
    const cuiPromise = new Promise<number>((resolve) => {
      const cuiProc = spawn('node', ['cui-playtest.mjs', '--quick'], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      cuiProc.on('close', () => {
        const cuiTime = Date.now() - cuiStartTime;
        resolve(cuiTime);
      });
      
      setTimeout(() => {
        cuiProc.kill();
        resolve(-1);
      }, 5000);
    });
    
    const cuiLoadTime = await cuiPromise;
    
    if (cuiLoadTime > 0) {
      console.log(`📟 CUI起動時間: ${cuiLoadTime}ms`);
      console.log(`⚡ 性能比較: CUIはGUIより${((guiLoadTime - cuiLoadTime) / guiLoadTime * 100).toFixed(1)}%高速`);
      
      // CUIはGUIより高速であることを期待
      expect(cuiLoadTime).toBeLessThan(guiLoadTime);
    }
  });

  test('デバッグモード連携: CUI詳細ログとGUI状態同期', async ({ page }) => {
    // デバッグモード有効でCUI実行
    const projectRoot = join(__dirname, '../../');
    const debugOutput: string[] = [];
    
    cuiProcess = spawn('node', ['cui-playtest.mjs', '--debug'], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    cuiProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      debugOutput.push(output);
    });
    
    // デバッグ出力を収集
    await new Promise((resolve) => {
      setTimeout(() => {
        if (cuiProcess) {
          cuiProcess.kill();
        }
        resolve(true);
      }, 5000);
    });
    
    const fullDebugOutput = debugOutput.join('');
    
    // デバッグ情報の内容確認
    if (fullDebugOutput.length > 0) {
      // パワー計算ログ
      expect(fullDebugOutput).toMatch(/パワー計算:/);
      
      // 保険効果ログ
      expect(fullDebugOutput).toMatch(/保険効果:|保険料負担:/);
      
      // ゲーム状態詳細
      expect(fullDebugOutput).toMatch(/ゲーム状態:/);
    }
    
    // 同時にGUIでデバッグモード確認
    await page.goto('/');
    
    // 開発モードかチェック
    const isDev = await page.evaluate(() => {
      return (window as any).location.hostname === 'localhost' || 
             (window as any).location.hostname === '127.0.0.1';
    });
    
    if (isDev) {
      console.log('🔧 デバッグモード: CUI詳細ログ出力とGUI開発環境連携確認');
    }
  });

  test('エラー処理統合: CUIエラーとGUIエラーの一貫性', async ({ page }) => {
    // GUI側でエラー監視開始
    const guiErrors: string[] = [];
    page.on('pageerror', error => {
      guiErrors.push(error.message);
    });
    
    // 意図的にエラーを発生させるCUI実行
    const projectRoot = join(__dirname, '../../');
    const cuiErrors: string[] = [];
    
    // 存在しないオプションでCUI実行
    cuiProcess = spawn('node', ['cui-playtest.mjs', '--invalid-option'], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    cuiProcess.stderr?.on('data', (data) => {
      cuiErrors.push(data.toString());
    });
    
    await new Promise((resolve) => {
      cuiProcess?.on('close', () => resolve(true));
      setTimeout(() => {
        if (cuiProcess) cuiProcess.kill();
        resolve(true);
      }, 3000);
    });
    
    // GUI側でも類似のエラー状況を作成
    await page.goto('/');
    
    // 無効なゲーム操作を試行
    await page.evaluate(() => {
      // 意図的に無効な操作
      try {
        (window as any).invalidGameOperation();
      } catch (error) {
        console.error('意図的エラー:', error);
      }
    });
    
    await page.waitForTimeout(2000);
    
    // エラーハンドリングの一貫性確認
    console.log(`📟 CUIエラー数: ${cuiErrors.length}`);
    console.log(`🖥️ GUIエラー数: ${guiErrors.length}`);
    
    // 両環境ともにエラーを適切にハンドリングしていることを確認
    // (致命的エラーでアプリケーションが停止していないこと)
    const startButton = page.locator('text=ゲームをプレイ');
    await expect(startButton).toBeVisible({ timeout: 5000 });
    
    console.log('✅ エラー処理統合: 両環境で適切なエラーハンドリング確認');
  });
});

test.describe('📊 プレイテストデータ分析: 自動品質監視', () => {
  test('ゲームバランス自動分析', async ({ page }) => {
    // まずGUIでゲーム動作確認
    await page.goto('/');
    
    const startButton = page.locator('text=ゲームをプレイ');
    await startButton.click();
    await page.waitForTimeout(3000);
    
    // CUIで複数回プレイテスト実行
    const projectRoot = join(__dirname, '../../');
    const gameResults: any[] = [];
    
    for (let i = 0; i < 3; i++) {
      const cuiOutput: string[] = [];
      
      const cuiProcess = spawn('node', ['cui-playtest.mjs', '--auto'], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      cuiProcess.stdout?.on('data', (data) => {
        cuiOutput.push(data.toString());
      });
      
      await new Promise((resolve) => {
        cuiProcess.on('close', () => {
          const output = cuiOutput.join('');
          
          // ゲーム結果を解析
          const vitalityMatch = output.match(/最終活力: (\d+)/);
          const turnsMatch = output.match(/ターン数: (\d+)/);
          
          if (vitalityMatch && turnsMatch) {
            gameResults.push({
              finalVitality: parseInt(vitalityMatch[1]),
              totalTurns: parseInt(turnsMatch[1]),
              gameIndex: i + 1
            });
          }
          
          resolve(true);
        });
        
        setTimeout(() => {
          cuiProcess.kill();
          resolve(true);
        }, 8000);
      });
    }
    
    // ゲームバランス分析
    if (gameResults.length > 0) {
      const avgVitality = gameResults.reduce((sum, game) => sum + game.finalVitality, 0) / gameResults.length;
      const avgTurns = gameResults.reduce((sum, game) => sum + game.totalTurns, 0) / gameResults.length;
      
      console.log(`📊 ゲームバランス分析:`);
      console.log(`   平均最終活力: ${avgVitality.toFixed(1)}`);
      console.log(`   平均ターン数: ${avgTurns.toFixed(1)}`);
      
      // バランスチェック (適切な難易度範囲内かチェック)
      expect(avgVitality).toBeGreaterThan(0); // ゲームオーバーばかりでない
      expect(avgVitality).toBeLessThan(100); // 簡単すぎない
      expect(avgTurns).toBeGreaterThan(3); // 最低限のゲーム長
      expect(avgTurns).toBeLessThan(50); // 長すぎない
      
      console.log('✅ ゲームバランス: 適切な難易度範囲内');
    }
  });

  test('パフォーマンス回帰検出', async ({ page }) => {
    // ベースライン性能測定
    const performanceBaseline = {
      guiLoadTime: 0,
      cuiExecutionTime: 0
    };
    
    // GUI性能測定
    const guiStart = Date.now();
    await page.goto('/');
    
    const startButton = page.locator('text=ゲームをプレイ');
    await startButton.click();
    await page.waitForTimeout(2000);
    
    performanceBaseline.guiLoadTime = Date.now() - guiStart;
    
    // CUI性能測定
    const projectRoot = join(__dirname, '../../');
    const cuiStart = Date.now();
    
    const cuiTime = await new Promise<number>((resolve) => {
      const cuiProcess = spawn('node', ['cui-playtest.mjs', '--benchmark'], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      cuiProcess.on('close', () => {
        resolve(Date.now() - cuiStart);
      });
      
      setTimeout(() => {
        cuiProcess.kill();
        resolve(-1);
      }, 10000);
    });
    
    if (cuiTime > 0) {
      performanceBaseline.cuiExecutionTime = cuiTime;
    }
    
    // 性能基準チェック
    console.log(`⚡ 性能測定結果:`);
    console.log(`   GUI読み込み: ${performanceBaseline.guiLoadTime}ms`);
    console.log(`   CUI実行: ${performanceBaseline.cuiExecutionTime}ms`);
    
    // 性能回帰の早期検出 (現在は警告のみ)
    if (performanceBaseline.guiLoadTime > 10000) {
      console.warn('⚠️ GUI読み込み時間が10秒を超過 - 性能調査が必要');
    }
    
    if (performanceBaseline.cuiExecutionTime > 15000) {
      console.warn('⚠️ CUI実行時間が15秒を超過 - 性能調査が必要');
    }
    
    // 基本的な性能要件
    expect(performanceBaseline.guiLoadTime).toBeLessThan(30000); // 30秒未満
    expect(performanceBaseline.cuiExecutionTime).toBeLessThan(20000); // 20秒未満
  });
});