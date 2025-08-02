/**
 * Lazy Loading System for Performance Optimization
 * Intelligent component and resource loading based on viewport and user interaction
 */

interface LazyLoadOptions {
  rootMargin?: string;
  threshold?: number;
  priority?: 'high' | 'medium' | 'low';
  preload?: boolean;
}

interface ResourceQueue {
  url: string;
  priority: number;
  loaded: boolean;
  loading: boolean;
  element?: HTMLElement;
}

class LazyLoader {
  private observer: IntersectionObserver | null = null;
  private readonly loadedResources = new Set<string>();
  private resourceQueue: ResourceQueue[] = [];
  private isProcessingQueue = false;

  constructor() {
    this.setupIntersectionObserver();
    this.setupIdleCallback();
  }

  private setupIntersectionObserver() {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.loadElement(entry.target as HTMLElement);
            this.observer?.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.1
      }
    );
  }

  private setupIdleCallback() {
    // Use requestIdleCallback to process low-priority resources
    const processQueue = () => {
      if (this.isProcessingQueue || this.resourceQueue.length === 0) {
        return;
      }

      this.isProcessingQueue = true;

      const processChunk = (deadline: IdleDeadline) => {
        while (deadline.timeRemaining() > 0 && this.resourceQueue.length > 0) {
          const resource = this.resourceQueue.shift();
          if (resource && !resource.loaded && !resource.loading) {
            this.processResource(resource);
          }
        }

        if (this.resourceQueue.length > 0) {
          this.requestIdleCallback(processChunk);
        } else {
          this.isProcessingQueue = false;
        }
      };

      this.requestIdleCallback(processChunk);
    };

    // Start processing queue
    setTimeout(processQueue, 100);
  }

  private requestIdleCallback(callback: (deadline: IdleDeadline) => void) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(callback, { timeout: 2000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => { callback({ 
        timeRemaining: () => 10,
        didTimeout: false 
      } as IdleDeadline); }, 16);
    }
  }

  private async processResource(resource: ResourceQueue) {
    resource.loading = true;

    try {
      if (resource.url.match(/\.(js|ts)$/)) {
        await this.loadScript(resource.url);
      } else if (resource.url.match(/\.css$/)) {
        await this.loadStylesheet(resource.url);
      } else if (resource.url.match(/\.(jpg|jpeg|png|webp|svg|gif)$/)) {
        await this.loadImage(resource.url);
      }

      resource.loaded = true;
      this.loadedResources.add(resource.url);
    } catch (error) {
      console.warn(`[LazyLoader] Failed to load resource: ${resource.url}`, error);
    } finally {
      resource.loading = false;
    }
  }

  private async loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => { resolve(); };
      script.onerror = () => { reject(new Error(`Script load failed: ${url}`)); };
      document.head.appendChild(script);
    });
  }

  private async loadStylesheet(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = () => { resolve(); };
      link.onerror = () => { reject(new Error(`Stylesheet load failed: ${url}`)); };
      document.head.appendChild(link);
    });
  }

  private async loadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { resolve(); };
      img.onerror = () => { reject(new Error(`Image load failed: ${url}`)); };
      img.src = url;
    });
  }

  private loadElement(element: HTMLElement) {
    const src = element.dataset.src;
    const srcset = element.dataset.srcset;

    if (element.tagName === 'IMG') {
      const img = element as HTMLImageElement;
      
      // Show loading skeleton
      img.classList.add('loading');
      
      if (src) {
        img.src = src;
      }
      
      if (srcset) {
        img.srcset = srcset;
      }

      img.onload = () => {
        img.classList.remove('loading');
        img.classList.add('loaded');
      };

      img.onerror = () => {
        img.classList.remove('loading');
        img.classList.add('error');
      };
    } else if (element.dataset.background) {
      // Background image lazy loading
      element.style.backgroundImage = `url(${element.dataset.background})`;
      element.classList.add('loaded');
    }
  }

  // Public API
  observe(element: HTMLElement, options: LazyLoadOptions = {}) {
    if (!this.observer) {
      return;
    }

    // Set up element for lazy loading
    if (element.tagName === 'IMG') {
      const img = element as HTMLImageElement;
      if (img.src && !img.dataset.src) {
        img.dataset.src = img.src;
        img.src = this.generatePlaceholder(img);
      }
    }

    this.observer.observe(element);
  }

  preloadResource(url: string, priority: 'high' | 'medium' | 'low' = 'medium') {
    if (this.loadedResources.has(url)) {
      return;
    }

    const priorityValue = priority === 'high' ? 3 : priority === 'medium' ? 2 : 1;

    this.resourceQueue.push({
      url,
      priority: priorityValue,
      loaded: false,
      loading: false
    });

    // Sort queue by priority
    this.resourceQueue.sort((a, b) => b.priority - a.priority);
  }

  preloadImages(urls: string[], priority: 'high' | 'medium' | 'low' = 'low') {
    urls.forEach(url => { this.preloadResource(url, priority); });
  }

  async loadComponent(componentLoader: () => Promise<any>): Promise<any> {
    return new Promise((resolve, reject) => {
      // Load component with retry logic
      const attemptLoad = (retries = 3) => {
        componentLoader()
          .then(resolve)
          .catch((error) => {
            if (retries > 0) {
              console.warn(`[LazyLoader] Component load failed, retrying... (${retries} attempts left)`);
              setTimeout(() => { attemptLoad(retries - 1); }, 1000);
            } else {
              reject(error);
            }
          });
      };

      attemptLoad();
    });
  }

  generatePlaceholder(img: HTMLImageElement): string {
    const width = img.width || 200;
    const height = img.height || 200;
    
    // Generate SVG placeholder with proper aspect ratio
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#374151"/>
        <rect width="100%" height="100%" fill="url(#shimmer)" opacity="0.3"/>
        <defs>
          <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#4B5563;stop-opacity:0"/>
            <stop offset="50%" style="stop-color:#6B7280;stop-opacity:1"/>
            <stop offset="100%" style="stop-color:#4B5563;stop-opacity:0"/>
            <animateTransform attributeName="gradientTransform" type="translate" 
              values="-100 0;100 0;-100 0" dur="2s" repeatCount="indefinite"/>
          </linearGradient>
        </defs>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  // Performance monitoring
  getLoadedResourcesCount(): number {
    return this.loadedResources.size;
  }

  getQueueLength(): number {
    return this.resourceQueue.length;
  }

  getStats() {
    return {
      loadedResources: this.loadedResources.size,
      queueLength: this.resourceQueue.length,
      isProcessing: this.isProcessingQueue
    };
  }

  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.resourceQueue = [];
    this.loadedResources.clear();
  }
}

// Utility functions for Vue components
export const useImageLazyLoading = () => {
  const lazyLoader = new LazyLoader();

  const observeImage = (element: HTMLImageElement, options?: LazyLoadOptions) => {
    lazyLoader.observe(element, options);
  };

  const preloadImages = (urls: string[], priority?: 'high' | 'medium' | 'low') => {
    lazyLoader.preloadImages(urls, priority);
  };

  return {
    observeImage,
    preloadImages,
    getStats: () => lazyLoader.getStats(),
    cleanup: () => { lazyLoader.cleanup(); }
  };
};

// Create singleton instance
export const lazyLoader = new LazyLoader();

// Vue directive for easy integration
export const vLazyLoad = {
  mounted(el: HTMLElement, binding: any) {
    const options = binding.value || {};
    lazyLoader.observe(el, options);
  },
  unmounted(el: HTMLElement) {
    // Cleanup if needed
  }
};

export default lazyLoader;