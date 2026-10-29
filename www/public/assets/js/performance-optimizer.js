// Performance Optimizer to prevent freeze and lag
class PerformanceOptimizer {
  constructor() {
    this.measurements = new Map();
    this.optimizationEnabled = true;
    this.frameThrottle = null;
    this.lastFrameTime = 0;
    this.targetFPS = 60;
    this.frameInterval = 1000 / this.targetFPS;
  }

  // Measure execution time of functions
  measure(func, funcName = 'anonymous') {
    return function(...args) {
      const startTime = performance.now();
      
      try {
        const result = func.apply(this, args);
        
        // Handle async functions
        if (result && typeof result.then === 'function') {
          return result.finally(() => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            this.recordMeasurement(funcName, duration);
          });
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        this.recordMeasurement(funcName, duration);
        
        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        this.recordMeasurement(funcName, duration);
        throw error;
      }
    }.bind(this);
  }

  recordMeasurement(funcName, duration) {
    if (!this.measurements.has(funcName)) {
      this.measurements.set(funcName, {
        count: 0,
        totalTime: 0,
        maxTime: 0,
        minTime: Infinity,
        avgTime: 0
      });
    }
    
    const stats = this.measurements.get(funcName);
    stats.count++;
    stats.totalTime += duration;
    stats.maxTime = Math.max(stats.maxTime, duration);
    stats.minTime = Math.min(stats.minTime, duration);
    stats.avgTime = stats.totalTime / stats.count;
    
    // Warn if function takes too long
    if (duration > 100) {
      console.warn(`Performance warning: ${funcName} took ${duration.toFixed(2)}ms`);
    }
  }

  getPerformanceStats(funcName = null) {
    if (funcName) {
      return this.measurements.get(funcName);
    }
    
    const stats = {};
    this.measurements.forEach((value, key) => {
      stats[key] = value;
    });
    return stats;
  }

  clearPerformanceStats() {
    this.measurements.clear();
  }

  // Throttle function calls to prevent excessive execution
  throttle(func, delay = 100) {
    let lastCall = 0;
    let timeoutId = null;
    
    return function(...args) {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall;
      
      if (timeSinceLastCall >= delay) {
        lastCall = now;
        return func.apply(this, args);
      } else {
        // Schedule the call for the next available slot
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        timeoutId = setTimeout(() => {
          lastCall = Date.now();
          func.apply(this, args);
        }, delay - timeSinceLastCall);
      }
    };
  }

  // Debounce function calls to group rapid successive calls
  debounce(func, delay = 100) {
    let timeoutId = null;
    
    return function(...args) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  }

  // Request animation frame throttling for smooth animations
  requestAnimationFrame(callback) {
    if (!this.optimizationEnabled) {
      return callback();
    }
    
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    
    if (elapsed > this.frameInterval) {
      this.lastFrameTime = now - (elapsed % this.frameInterval);
      return callback();
    } else {
      return new Promise(resolve => {
        requestAnimationFrame(() => {
          this.lastFrameTime = performance.now();
          resolve(callback());
        });
      });
    }
  }

  // Batch DOM operations to reduce reflows
  batchDOMOperations(operations) {
    if (!Array.isArray(operations) || operations.length === 0) {
      return;
    }
    
    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    operations.forEach(op => {
      try {
        if (op.type === 'create') {
          const element = document.createElement(op.tag);
          if (op.attributes) {
            Object.entries(op.attributes).forEach(([key, value]) => {
              element.setAttribute(key, value);
            });
          }
          if (op.content) {
            element.textContent = op.content;
          }
          if (op.parent) {
            op.parent.appendChild(element);
          } else {
            fragment.appendChild(element);
          }
        } else if (op.type === 'modify') {
          const element = op.element;
          if (op.properties) {
            Object.entries(op.properties).forEach(([key, value]) => {
              element[key] = value;
            });
          }
          if (op.styles) {
            Object.entries(op.styles).forEach(([key, value]) => {
              element.style[key] = value;
            });
          }
        } else if (op.type === 'remove') {
          if (op.element && op.element.parentNode) {
            op.element.parentNode.removeChild(op.element);
          }
        }
      } catch (error) {
        console.error('Error in batch DOM operation:', error);
      }
    });
    
    // Append fragment to DOM if needed
    if (fragment.childNodes.length > 0) {
      const targetContainer = operations.find(op => op.container)?.container || document.body;
      targetContainer.appendChild(fragment);
    }
  }

  // Optimize large lists with virtual scrolling
  createVirtualList(container, itemHeight, totalItems, renderItem) {
    const visibleItems = Math.ceil(container.clientHeight / itemHeight) + 2;
    const scrollTop = container.scrollTop;
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleItems, totalItems);
    
    // Clear container
    container.innerHTML = '';
    
    // Set container height
    container.style.height = `${totalItems * itemHeight}px`;
    container.style.position = 'relative';
    
    // Render visible items
    for (let i = startIndex; i < endIndex; i++) {
      const item = renderItem(i);
      item.style.position = 'absolute';
      item.style.top = `${i * itemHeight}px`;
      item.style.height = `${itemHeight}px`;
      container.appendChild(item);
    }
    
    // Update on scroll
    const handleScroll = this.throttle(() => {
      this.createVirtualList(container, itemHeight, totalItems, renderItem);
    }, 16);
    
    container.addEventListener('scroll', handleScroll);
    
    return {
      destroy: () => {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }

  // Lazy load images and content
  setupLazyLoading() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              observer.unobserve(img);
            }
          }
        });
      });
      
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }

  // Enable/disable optimizations
  setOptimizationEnabled(enabled) {
    this.optimizationEnabled = enabled;
  }

  // Set target FPS
  setTargetFPS(fps) {
    this.targetFPS = fps;
    this.frameInterval = 1000 / fps;
  }
}

// Global performance optimizer instance
const performanceOptimizer = new PerformanceOptimizer();

// Performance monitoring utilities
const PerformanceMonitor = {
  startMeasure: (label) => {
    performance.mark(`${label}-start`);
  },
  
  endMeasure: (label) => {
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
    
    const measures = performance.getEntriesByName(label);
    if (measures.length > 0) {
      const duration = measures[0].duration;
      console.log(`${label}: ${duration.toFixed(2)}ms`);
      performance.clearMarks(`${label}-start`);
      performance.clearMarks(`${label}-end`);
      performance.clearMeasures(label);
      return duration;
    }
    return 0;
  },
  
  getMemoryUsage: () => {
    if (performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize / 1048576, // MB
        totalJSHeapSize: performance.memory.totalJSHeapSize / 1048576, // MB
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit / 1048576 // MB
      };
    }
    return null;
  }
};

export { PerformanceOptimizer, performanceOptimizer, PerformanceMonitor };
window.PerformanceOptimizer = PerformanceOptimizer;
window.performanceOptimizer = performanceOptimizer;
window.PerformanceMonitor = PerformanceMonitor;