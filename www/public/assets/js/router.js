// Master-Detail Router for improved navigation and state management
class MasterDetailRouter {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.routeParams = {};
    this.navigationHistory = [];
    this.maxHistorySize = 50;
    
    // Default routes
    this.registerRoute('recipe-master', {
      viewId: 'recipe-master-view',
      onEnter: this.onRecipeMasterEnter.bind(this),
      onExit: this.onRecipeMasterExit.bind(this)
    });
    
    this.registerRoute('recipe-detail', {
      viewId: 'recipe-detail-view',
      onEnter: this.onRecipeDetailEnter.bind(this),
      onExit: this.onRecipeDetailExit.bind(this)
    });
  }

  registerRoute(routeName, routeConfig) {
    this.routes.set(routeName, {
      ...routeConfig,
      name: routeName
    });
  }

  navigate(routeName, params = {}) {
    const route = this.routes.get(routeName);
    if (!route) {
      console.error(`Route not found: ${routeName}`);
      return false;
    }

    // Call exit handler for current route
    if (this.currentRoute && this.currentRoute.onExit) {
      try {
        this.currentRoute.onExit();
      } catch (error) {
        console.error('Error in route exit handler:', error);
      }
    }

    // Add to history
    this.addToHistory(routeName, params);

    // Update route params
    this.routeParams = params;

    // Hide all views
    this.hideAllViews();

    // Show target view
    const targetView = document.getElementById(route.viewId);
    if (targetView) {
      targetView.style.display = 'flex';
      
      // Call enter handler
      if (route.onEnter) {
        try {
          route.onEnter(params);
        } catch (error) {
          console.error('Error in route enter handler:', error);
        }
      }

      this.currentRoute = route;
      return true;
    } else {
      console.error(`View not found: ${route.viewId}`);
      return false;
    }
  }

  goBack() {
    if (this.navigationHistory.length > 1) {
      // Remove current route from history
      this.navigationHistory.pop();
      
      // Get previous route
      const previousRoute = this.navigationHistory[this.navigationHistory.length - 1];
      
      // Navigate to previous route
      return this.navigate(previousRoute.name, previousRoute.params);
    }
    return false;
  }

  addToHistory(routeName, params) {
    this.navigationHistory.push({
      name: routeName,
      params: params,
      timestamp: Date.now()
    });

    // Limit history size
    if (this.navigationHistory.length > this.maxHistorySize) {
      this.navigationHistory.shift();
    }
  }

  hideAllViews() {
    this.routes.forEach(route => {
      const view = document.getElementById(route.viewId);
      if (view) {
        view.style.display = 'none';
      }
    });
  }

  getCurrentRoute() {
    return this.currentRoute;
  }

  getRouteParams() {
    return this.routeParams;
  }

  getHistory() {
    return [...this.navigationHistory];
  }

  clearHistory() {
    this.navigationHistory = [];
  }

  // Route-specific handlers
  onRecipeMasterEnter(params) {
    // Refresh recipe list when entering master view
    if (typeof window.tampilkanDaftarResepTersimpan === 'function') {
      try {
        window.tampilkanDaftarResepTersimpan();
      } catch (error) {
        console.error('Error refreshing recipe list:', error);
      }
    }
  }

  onRecipeMasterExit() {
    // Cleanup when leaving master view
    // Add any necessary cleanup logic here
  }

  onRecipeDetailEnter(params) {
    if (params.mode === 'new') {
      // Initialize new recipe form
      this.initializeNewRecipe();
    } else if (params.mode === 'edit' && params.recipe) {
      // Load existing recipe
      this.loadExistingRecipe(params.recipe);
    }
  }

  onRecipeDetailExit() {
    // Check for unsaved changes
    if (window.currentEditingRecipeId) {
      // This could be enhanced with proper dirty checking
      // For now, we'll just clear the editing state
      window.currentEditingRecipeId = null;
    }
  }

  initializeNewRecipe() {
    window.currentEditingRecipeId = null;
    
    const nameInput = document.getElementById('recipe-save-name');
    const flourInput = document.getElementById('base-flour');
    const yieldInput = document.getElementById('recipe-yield');
    const priceInput = document.getElementById('input-harga-jual');
    
    if (nameInput) nameInput.value = '';
    if (flourInput) flourInput.value = '1000';
    if (yieldInput) yieldInput.value = '34';
    if (priceInput) priceInput.value = '4500';
    
    window.activeRecipeSteps = [];
    
    if (typeof window.renderLangkahProduksi === 'function') {
      try {
        window.renderLangkahProduksi();
      } catch (error) {
        console.error('Error rendering production steps:', error);
      }
    }
  }

  loadExistingRecipe(recipe) {
    window.currentEditingRecipeId = recipe.id;
    
    if (typeof window.terapkanResepKeKalkulator === 'function') {
      try {
        window.terapkanResepKeKalkulator(recipe);
      } catch (error) {
        console.error('Error applying recipe to calculator:', error);
      }
    }
    
    if (recipe.langkahProduksi && Array.isArray(recipe.langkahProduksi)) {
      window.activeRecipeSteps = [...recipe.langkahProduksi];
    } else {
      window.activeRecipeSteps = [];
    }
    
    if (typeof window.renderLangkahProduksi === 'function') {
      try {
        window.renderLangkahProduksi();
      } catch (error) {
        console.error('Error rendering production steps:', error);
      }
    }
    
    const nameInput = document.getElementById('recipe-save-name');
    if (nameInput) nameInput.value = recipe.nama || '';
  }
}

// Create global router instance
const router = new MasterDetailRouter();

// Backward compatibility functions
window.bukaMasterViewResep = () => {
  return router.navigate('recipe-master');
};

window.bukaDetailResepBaru = () => {
  return router.navigate('recipe-detail', { mode: 'new' });
};

window.bukaDetailResepEksisting = (resep) => {
  return router.navigate('recipe-detail', { mode: 'edit', recipe: resep });
};

window.kembaliKeMasterView = () => {
  if (window.currentEditingRecipeId) {
    if (!confirm("Keluar dari editor? Perubahan yang belum disimpan mungkin akan hilang.")) {
      return false;
    }
  }
  return router.goBack();
};

// Export for module usage
export { MasterDetailRouter, router };
window.MasterDetailRouter = MasterDetailRouter;
window.router = router;