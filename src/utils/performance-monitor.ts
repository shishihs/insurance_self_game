/**
 * Performance Monitoring System
 * Core Web Vitals and custom metrics tracking
 */

interface PerformanceMetrics {
  // Core Web Vitals
  fcp?: number;        // First Contentful Paint
  lcp?: number;        // Largest Contentful Paint
  cls?: number;        // Cumulative Layout Shift
  inp?: number;        // Interaction to Next Paint
  fid?: number;        // First Input Delay
  
  // Custom metrics
  appInitTime?: number;
  gameLoadTime?: number;
  routeChangeTime?: number;
  memoryUsage?: number;
  
  // Network
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

class PerformanceMonitor {
  private readonly metrics: PerformanceMetrics = {};
  private observers: PerformanceObserver[] = [];
  private isMonitoring = false;

  constructor() {
    this.setupPerformanceObservers();
    this.trackCustomMetrics();
  }

  private setupPerformanceObservers() {
    // Only run in browser environment
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      // Paint metrics (FCP)
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.fcp = entry.startTime;
            this.reportMetric('FCP', entry.startTime);
          }
        });
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = lastEntry.startTime;
        this.reportMetric('LCP', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        this.metrics.cls = clsValue;
        this.reportMetric('CLS', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);

      // First Input Delay / Interaction to Next Paint
      if ('PerformanceEventTiming' in window) {
        const inputObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries() as any[];
          entries.forEach((entry) => {
            if (entry.processingStart && entry.startTime) {
              const inputDelay = entry.processingStart - entry.startTime;
              const processingTime = entry.processingEnd - entry.processingStart;
              const presentationDelay = entry.duration - inputDelay - processingTime;
              
              const inp = inputDelay + processingTime + presentationDelay;
              this.metrics.inp = Math.max(this.metrics.inp || 0, inp);
              this.reportMetric('INP', inp);
            }
          });
        });
        inputObserver.observe({ 
          type: 'event', 
          buffered: true 
        });
        this.observers.push(inputObserver);
      }

      // Navigation metrics
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.entryType === 'navigation') {
            this.metrics.appInitTime = entry.loadEventEnd - entry.fetchStart;
            this.reportMetric('App Init Time', this.metrics.appInitTime);
          }
        });
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);

    } catch (error) {
      console.warn('[Performance Monitor] Failed to set up observers:', error);
    }

    this.isMonitoring = true;
  }

  private trackCustomMetrics() {
    // Memory usage monitoring
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      }, 10000); // Every 10 seconds
    }

    // Network information
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.metrics.connectionType = connection.type;
      this.metrics.effectiveType = connection.effectiveType;
      this.metrics.downlink = connection.downlink;
      this.metrics.rtt = connection.rtt;
    }
  }

  private reportMetric(name: string, value: number) {
    // Console logging in development
    if (import.meta.env.DEV) {
      const category = this.getMetricCategory(name, value);
      console.log(`[Performance] ${name}: ${value.toFixed(2)}ms ${category}`);
    }

    // Optional: Send to analytics service
    if (import.meta.env.PROD && window.window.gtag) {
      window.window.gtag('event', 'web_vitals', {
        event_category: 'Web Vitals',
        event_label: name,
        value: Math.round(value),
        non_interaction: true
      });
    }
  }

  private getMetricCategory(name: string, value: number): string {
    const thresholds = {
      'FCP': { good: 1800, needs_improvement: 3000 },
      'LCP': { good: 2500, needs_improvement: 4000 },
      'CLS': { good: 0.1, needs_improvement: 0.25 },
      'INP': { good: 200, needs_improvement: 500 },
      'FID': { good: 100, needs_improvement: 300 }
    };

    const threshold = thresholds[name as keyof typeof thresholds];
    if (!threshold) return '';

    if (value <= threshold.good) return '✅ Good';
    if (value <= threshold.needs_improvement) return '⚠️ Needs Improvement';
    return '❌ Poor';
  }

  // Public methods
  markGameStart() {
    performance.mark('game-start');
  }

  markGameLoaded() {
    performance.mark('game-loaded');
    performance.measure('game-load-time', 'game-start', 'game-loaded');
    
    const measure = performance.getEntriesByName('game-load-time')[0];
    if (measure) {
      this.metrics.gameLoadTime = measure.duration;
      this.reportMetric('Game Load Time', measure.duration);
    }
  }

  markRouteChange(routeName: string) {
    const markName = `route-${routeName}`;
    performance.mark(markName);
    
    const previousMarks = performance.getEntriesByType('mark')
      .filter(mark => mark.name.startsWith('route-'))
      .slice(-2);
    
    if (previousMarks.length === 2) {
      const measureName = `route-change-${routeName}`;
      performance.measure(measureName, previousMarks[0].name, previousMarks[1].name);
      
      const measure = performance.getEntriesByName(measureName)[0];
      if (measure) {
        this.metrics.routeChangeTime = measure.duration;
        this.reportMetric('Route Change Time', measure.duration);
      }
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getPerformanceScore(): number {
    const { fcp, lcp, cls, inp } = this.metrics;
    
    let score = 100;
    
    // FCP scoring (25 points)
    if (fcp) {
      if (fcp > 3000) score -= 25;
      else if (fcp > 1800) score -= 15;
      else if (fcp > 1000) score -= 5;
    }
    
    // LCP scoring (25 points)
    if (lcp) {
      if (lcp > 4000) score -= 25;
      else if (lcp > 2500) score -= 15;
      else if (lcp > 1500) score -= 5;
    }
    
    // CLS scoring (25 points)
    if (cls !== undefined) {
      if (cls > 0.25) score -= 25;
      else if (cls > 0.1) score -= 15;
      else if (cls > 0.05) score -= 5;
    }
    
    // INP scoring (25 points)
    if (inp) {
      if (inp > 500) score -= 25;
      else if (inp > 200) score -= 15;
      else if (inp > 100) score -= 5;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  generateReport(): string {
    const metrics = this.getMetrics();
    const score = this.getPerformanceScore();
    
    return `
Performance Report
==================
Overall Score: ${score}/100

Core Web Vitals:
- FCP: ${metrics.fcp?.toFixed(2) || 'N/A'}ms ${metrics.fcp ? this.getMetricCategory('FCP', metrics.fcp) : ''}
- LCP: ${metrics.lcp?.toFixed(2) || 'N/A'}ms ${metrics.lcp ? this.getMetricCategory('LCP', metrics.lcp) : ''}
- CLS: ${metrics.cls?.toFixed(3) || 'N/A'} ${metrics.cls !== undefined ? this.getMetricCategory('CLS', metrics.cls) : ''}
- INP: ${metrics.inp?.toFixed(2) || 'N/A'}ms ${metrics.inp ? this.getMetricCategory('INP', metrics.inp) : ''}

Custom Metrics:
- App Init: ${metrics.appInitTime?.toFixed(2) || 'N/A'}ms
- Game Load: ${metrics.gameLoadTime?.toFixed(2) || 'N/A'}ms
- Memory Usage: ${metrics.memoryUsage?.toFixed(2) || 'N/A'}MB

Network:
- Connection: ${metrics.connectionType || 'N/A'}
- Effective Type: ${metrics.effectiveType || 'N/A'}
- Downlink: ${metrics.downlink || 'N/A'}Mbps
- RTT: ${metrics.rtt || 'N/A'}ms
    `.trim();
  }

  cleanup() {
    this.observers.forEach(observer => { observer.disconnect(); });
    this.observers = [];
    this.isMonitoring = false;
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Global access for debugging
if (import.meta.env.DEV) {
  (window as any).__performanceMonitor = performanceMonitor;
}

export default performanceMonitor;