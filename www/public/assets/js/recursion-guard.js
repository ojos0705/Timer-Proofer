// Recursion Guard to prevent stack overflow issues
class RecursionGuard {
  constructor(maxDepth = 100) {
    this.maxDepth = maxDepth;
    this.callStack = new Map();
  }

  // Wrap a function with recursion depth protection
  protect(func, funcName = 'anonymous') {
    const self = this;
    
    return function(...args) {
      const depth = self.callStack.get(funcName) || 0;
      
      if (depth >= self.maxDepth) {
        console.error(`Maximum recursion depth (${self.maxDepth}) exceeded for function: ${funcName}`);
        throw new Error(`Maximum recursion depth exceeded for ${funcName}`);
      }
      
      self.callStack.set(funcName, depth + 1);
      
      try {
        const result = func.apply(this, args);
        
        // Handle both synchronous and asynchronous results
        if (result && typeof result.then === 'function') {
          return result.finally(() => {
            self.callStack.set(funcName, depth);
          });
        }
        
        return result;
      } finally {
        self.callStack.set(funcName, depth);
      }
    };
  }

  // Reset the call stack for a specific function or all functions
  reset(funcName = null) {
    if (funcName) {
      this.callStack.delete(funcName);
    } else {
      this.callStack.clear();
    }
  }

  // Get current depth for a function
  getDepth(funcName) {
    return this.callStack.get(funcName) || 0;
  }

  // Set maximum depth
  setMaxDepth(maxDepth) {
    this.maxDepth = maxDepth;
  }

  // Get maximum depth
  getMaxDepth() {
    return this.maxDepth;
  }
}

// Safe recursion utilities
const SafeRecursion = {
  // Convert recursive function to iterative using stack
  toIterative: (recursiveFunc) => {
    return function(...initialArgs) {
      const stack = [{ args: initialArgs, depth: 0 }];
      const results = [];
      
      while (stack.length > 0) {
        const { args, depth } = stack.pop();
        
        if (depth > 1000) { // Safety limit
          console.error('Iteration depth exceeded safety limit');
          break;
        }
        
        try {
          const result = recursiveFunc.apply(this, args);
          
          if (result && typeof result.then === 'function') {
            // Handle async functions
            return result;
          }
          
          results.push(result);
        } catch (error) {
          console.error('Error in iterative execution:', error);
          break;
        }
      }
      
      return results.length > 0 ? results[results.length - 1] : undefined;
    };
  },

  // Memoization to prevent redundant recursive calls
  memoize: (func) => {
    const cache = new Map();
    
    return function(...args) {
      const key = JSON.stringify(args);
      
      if (cache.has(key)) {
        return cache.get(key);
      }
      
      const result = func.apply(this, args);
      cache.set(key, result);
      return result;
    };
  },

  // Trampoline for tail-call optimization
  trampoline: (func) => {
    return function(...args) {
      let result = func.apply(this, args);
      
      while (typeof result === 'function') {
        result = result();
      }
      
      return result;
    };
  }
};

// Global recursion guard instance
const recursionGuard = new RecursionGuard(100);

// Protection for common recursive patterns
const protectRecursiveFunction = (func, funcName) => {
  return recursionGuard.protect(func, funcName);
};

export { RecursionGuard, recursionGuard, SafeRecursion, protectRecursiveFunction };
window.RecursionGuard = RecursionGuard;
window.recursionGuard = recursionGuard;
window.SafeRecursion = SafeRecursion;
window.protectRecursiveFunction = protectRecursiveFunction;