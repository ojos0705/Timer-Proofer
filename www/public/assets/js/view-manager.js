// Master-Detail View Manager for improved view handling and state management
class ViewManager {
  constructor() {
    this.views = new Map();
    this.activeView = null;
    this.viewStates = new Map();
    this.transitionCallbacks = new Map();
  }

  registerView(viewId, viewConfig) {
    this.views.set(viewId, {
      id: viewId,
      element: document.getElementById(viewId),
      ...viewConfig
    });

    // Initialize view state
    this.viewStates.set(viewId, {
      isVisible: false,
      data: null,
      lastActive: null
    });
  }

  showView(viewId, data = null, options = {}) {
    const view = this.views.get(viewId);
    if (!view) {
      console.error(`View not found: ${viewId}`);
      return false;
    }

    // Call before transition callback
    if (this.transitionCallbacks.has('beforeShow')) {
      const callbacks = this.transitionCallbacks.get('beforeShow');
      callbacks.forEach(callback => callback(viewId, this.activeView, data));
    }

    // Hide current view
    if (this.activeView && this.activeView !== viewId) {
      this.hideView(this.activeView);
    }

    // Show target view
    if (view.element) {
      view.element.style.display = options.display || 'flex';
      
      // Update view state
      const state = this.viewStates.get(viewId);
      state.isVisible = true;
      state.data = data;
      state.lastActive = Date.now();
      this.viewStates.set(viewId, state);

      // Call view's onShow callback
      if (view.onShow && typeof view.onShow === 'function') {
        try {
          view.onShow(data, options);
        } catch (error) {
          console.error(`Error in onShow callback for view ${viewId}:`, error);
        }
      }

      this.activeView = viewId;

      // Call after transition callback
      if (this.transitionCallbacks.has('afterShow')) {
        const callbacks = this.transitionCallbacks.get('afterShow');
        callbacks.forEach(callback => callback(viewId, data));
      }

      return true;
    }

    return false;
  }

  hideView(viewId, options = {}) {
    const view = this.views.get(viewId);
    if (!view) {
      console.error(`View not found: ${viewId}`);
      return false;
    }

    // Call before hide callback
    if (this.transitionCallbacks.has('beforeHide')) {
      const callbacks = this.transitionCallbacks.get('beforeHide');
      callbacks.forEach(callback => callback(viewId));
    }

    // Hide view
    if (view.element) {
      view.element.style.display = 'none';
      
      // Update view state
      const state = this.viewStates.get(viewId);
      state.isVisible = false;
      this.viewStates.set(viewId, state);

      // Call view's onHide callback
      if (view.onHide && typeof view.onHide === 'function') {
        try {
          view.onHide(options);
        } catch (error) {
          console.error(`Error in onHide callback for view ${viewId}:`, error);
        }
      }

      // Clear active view if this was the active one
      if (this.activeView === viewId) {
        this.activeView = null;
      }

      // Call after hide callback
      if (this.transitionCallbacks.has('afterHide')) {
        const callbacks = this.transitionCallbacks.get('afterHide');
        callbacks.forEach(callback => callback(viewId));
      }

      return true;
    }

    return false;
  }

  toggleView(viewId, data = null) {
    const state = this.viewStates.get(viewId);
    if (state && state.isVisible) {
      return this.hideView(viewId);
    } else {
      return this.showView(viewId, data);
    }
  }

  getActiveView() {
    return this.activeView;
  }

  getViewState(viewId) {
    return this.viewStates.get(viewId);
  }

  getViewData(viewId) {
    const state = this.viewStates.get(viewId);
    return state ? state.data : null;
  }

  isViewVisible(viewId) {
    const state = this.viewStates.get(viewId);
    return state ? state.isVisible : false;
  }

  hideAllViews() {
    this.views.forEach((view, viewId) => {
      this.hideView(viewId);
    });
  }

  onTransition(phase, callback) {
    if (!this.transitionCallbacks.has(phase)) {
      this.transitionCallbacks.set(phase, []);
    }
    this.transitionCallbacks.get(phase).push(callback);
  }

  removeTransitionCallback(phase, callback) {
    if (this.transitionCallbacks.has(phase)) {
      const callbacks = this.transitionCallbacks.get(phase);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  destroy() {
    // Clean up all views
    this.hideAllViews();
    
    // Clear all data
    this.views.clear();
    this.viewStates.clear();
    this.transitionCallbacks.clear();
    this.activeView = null;
  }
}

// Create global view manager instance
const viewManager = new ViewManager();

// Register common views
document.addEventListener('DOMContentLoaded', () => {
  // Register recipe master view
  viewManager.registerView('recipe-master-view', {
    onShow: (data) => {
      // Refresh recipe list when showing master view
      if (typeof window.tampilkanDaftarResepTersimpan === 'function') {
        try {
          window.tampilkanDaftarResepTersimpan();
        } catch (error) {
          console.error('Error refreshing recipe list:', error);
        }
      }
    },
    onHide: () => {
      // Cleanup when hiding master view
    }
  });

  // Register recipe detail view
  viewManager.registerView('recipe-detail-view', {
    onShow: (data) => {
      // Handle detail view initialization
      if (data && data.mode === 'new') {
        // Initialize new recipe form
        if (typeof window.initializeNewRecipe === 'function') {
          try {
            window.initializeNewRecipe();
          } catch (error) {
            console.error('Error initializing new recipe:', error);
          }
        }
      } else if (data && data.mode === 'edit' && data.recipe) {
        // Load existing recipe
        if (typeof window.loadExistingRecipe === 'function') {
          try {
            window.loadExistingRecipe(data.recipe);
          } catch (error) {
            console.error('Error loading existing recipe:', error);
          }
        }
      }
    },
    onHide: () => {
      // Check for unsaved changes
      if (window.currentEditingRecipeId) {
        // Could implement dirty checking here
        window.currentEditingRecipeId = null;
      }
    }
  });
});

export { ViewManager, viewManager };
window.ViewManager = ViewManager;
window.viewManager = viewManager;