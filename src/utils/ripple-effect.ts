/**
 * リップルエフェクト - タッチフィードバックの実装
 * マテリアルデザイン風の波紋効果
 */

export interface RippleOptions {
  color?: string;
  duration?: number;
  opacity?: number;
  centered?: boolean;
  disabled?: boolean;
}

const DEFAULT_OPTIONS: Required<RippleOptions> = {
  color: 'rgba(255, 255, 255, 0.6)',
  duration: 700,
  opacity: 0.6,
  centered: false,
  disabled: false
};

/**
 * リップルエフェクトを作成
 */
function createRippleCore(
  element: HTMLElement, 
  event: MouseEvent | TouchEvent, 
  options: RippleOptions = {}
): void {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  if (config.disabled) return;
  
  // リップルコンテナがない場合は作成
  if (!element.classList.contains('ripple-container')) {
    element.classList.add('ripple-container');
  }
  
  // リップル要素を作成
  const ripple = document.createElement('span');
  ripple.classList.add('ripple');
  
  // 要素のサイズと位置を取得
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const radius = size / 2;
  
  // クリック位置を計算
  let x: number, y: number;
  
  if (config.centered) {
    x = rect.width / 2;
    y = rect.height / 2;
  } else {
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    x = clientX - rect.left;
    y = clientY - rect.top;
  }
  
  // リップルのスタイルを設定
  Object.assign(ripple.style, {
    width: `${size}px`,
    height: `${size}px`,
    left: `${x - radius}px`,
    top: `${y - radius}px`,
    backgroundColor: config.color,
    opacity: config.opacity.toString(),
    animationDuration: `${config.duration}ms`
  });
  
  // リップルを要素に追加
  element.appendChild(ripple);
  
  // アニメーション終了後にリップルを削除
  const removeRipple = () => {
    if (ripple.parentNode) {
      ripple.parentNode.removeChild(ripple);
    }
  };
  
  ripple.addEventListener('animationend', removeRipple);
  
  // フォールバック：一定時間後に強制削除
  setTimeout(removeRipple, config.duration + 100);
}

/**
 * 要素にリップルエフェクトを追加
 */
export function addRippleEffect(
  element: HTMLElement, 
  options: RippleOptions = {}
): () => void {
  const handleRipple = (event: MouseEvent | TouchEvent) => {
    createRippleCore(element, event, options);
  };
  
  // マウスとタッチの両方に対応
  element.addEventListener('mousedown', handleRipple);
  element.addEventListener('touchstart', handleRipple, { passive: true });
  
  // クリーンアップ関数を返す
  return () => {
    element.removeEventListener('mousedown', handleRipple);
    element.removeEventListener('touchstart', handleRipple);
  };
}

/**
 * Vue.js向けのリップルディレクティブ
 */
export const rippleDirective = {
  mounted(el: HTMLElement, binding: any) {
    const options: RippleOptions = binding.value || {};
    
    // リップルエフェクトを追加
    const cleanup = addRippleEffect(el, options);
    
    // クリーンアップ関数を要素に保存
    (el as any)._rippleCleanup = cleanup;
  },
  
  updated(el: HTMLElement, binding: any) {
    const options: RippleOptions = binding.value || {};
    
    // 既存のリップルをクリーンアップ
    if ((el as any)._rippleCleanup) {
      (el as any)._rippleCleanup();
    }
    
    // 新しい設定でリップルを再追加
    const cleanup = addRippleEffect(el, options);
    (el as any)._rippleCleanup = cleanup;
  },
  
  unmounted(el: HTMLElement) {
    // クリーンアップ
    if ((el as any)._rippleCleanup) {
      (el as any)._rippleCleanup();
      delete (el as any)._rippleCleanup;
    }
  }
};

/**
 * 自動的にリップルエフェクトを追加
 */
export function initAutoRipple(): void {
  // ページ読み込み後とDOM変更時に実行
  const addRipplesToElements = () => {
    const elements = document.querySelectorAll('.ripple-container');
    
    elements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      
      // すでにリップルが追加されている場合はスキップ
      if ((htmlElement as any)._hasRipple) return;
      
      // リップルエフェクトを追加
      addRippleEffect(htmlElement);
      
      // フラグを設定
      (htmlElement as any)._hasRipple = true;
    });
  };
  
  // 初回実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addRipplesToElements);
  } else {
    addRipplesToElements();
  }
  
  // DOM変更を監視
  const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.classList?.contains('ripple-container') || 
                element.querySelectorAll?.('.ripple-container').length > 0) {
              shouldUpdate = true;
            }
          }
        });
      }
    });
    
    if (shouldUpdate) {
      setTimeout(addRipplesToElements, 0);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // クリーンアップ関数を返す
  return () => {
    observer.disconnect();
  };
}

/**
 * パフォーマンス考慮：リップル生成の制限
 */
let rippleCount = 0;
const MAX_RIPPLES = 10;

/**
 * パフォーマンス制限付きリップル作成関数
 */
export function createRipple(
  element: HTMLElement, 
  event: MouseEvent | TouchEvent, 
  options: RippleOptions = {}
): void {
  if (rippleCount >= MAX_RIPPLES) return;
  
  rippleCount++;
  createRippleCore(element, event, options);
  
  // 一定時間後にカウンターをリセット
  setTimeout(() => {
    rippleCount = Math.max(0, rippleCount - 1);
  }, 1000);
}

// デフォルトエクスポートとして throttled 版を使用
// 元のcreateRippleをオーバーライド