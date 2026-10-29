// Event Listener Manager for proper cleanup and memory leak prevention
class EventManager {
  constructor() {
    this.listeners = new Map();
    this.listenerId = 0;
  }

  add(element, eventType, handler, options = false) {
    if (!element || !eventType || typeof handler !== 'function') {
      console.warn('Invalid event listener parameters:', { element, eventType, handler });
      return null;
    }

    const id = ++this.listenerId;
    element.addEventListener(eventType, handler, options);
    
    this.listeners.set(id, {
      element,
      eventType,
      handler,
      options
    });

    return id;
  }

  remove(id) {
    const listener = this.listeners.get(id);
    if (listener) {
      listener.element.removeEventListener(listener.eventType, listener.handler, listener.options);
      this.listeners.delete(id);
      return true;
    }
    return false;
  }

  removeAll() {
    this.listeners.forEach((listener, id) => {
      try {
        listener.element.removeEventListener(listener.eventType, listener.handler, listener.options);
      } catch (error) {
        console.error('Error removing event listener:', error);
      }
    });
    this.listeners.clear();
  }

  removeByElement(element) {
    const toRemove = [];
    this.listeners.forEach((listener, id) => {
      if (listener.element === element) {
        toRemove.push(id);
      }
    });
    
    toRemove.forEach(id => this.remove(id));
    return toRemove.length;
  }

  removeByEventType(element, eventType) {
    const toRemove = [];
    this.listeners.forEach((listener, id) => {
      if (listener.element === element && listener.eventType === eventType) {
        toRemove.push(id);
      }
    });
    
    toRemove.forEach(id => this.remove(id));
    return toRemove.length;
  }

  getCount() {
    return this.listeners.size;
  }

  getStats() {
    const stats = {
      total: this.listeners.size,
      byType: {},
      byElement: new Map()
    };

    this.listeners.forEach((listener) => {
      // Count by event type
      stats.byType[listener.eventType] = (stats.byType[listener.eventType] || 0) + 1;
      
      // Count by element (using element description)
      const elementDesc = listener.element.tagName + (listener.element.id ? '#' + listener.element.id : '');
      stats.byElement.set(elementDesc, (stats.byElement.get(elementDesc) || 0) + 1);
    });

    return stats;
  }
}

// Global event manager instance
const eventManager = new EventManager();

// Convenience functions for common patterns
function addClickListener(element, handler, options) {
  return eventManager.add(element, 'click', handler, options);
}

function addInputListener(element, handler, options) {
  return eventManager.add(element, 'input', handler, options);
}

function addChangeListener(element, handler, options) {
  return eventManager.add(element, 'change', handler, options);
}

function addScrollListener(element, handler, options) {
  return eventManager.add(element, 'scroll', handler, options);
}

function addResizeListener(element, handler, options) {
  return eventManager.add(element, 'resize', handler, options);
}

// Cleanup function to be called when page unloads
window.addEventListener('beforeunload', () => {
  eventManager.removeAll();
  console.log('EventManager: All event listeners cleaned up');
});

export { EventManager, eventManager, addClickListener, addInputListener, addChangeListener, addScrollListener, addResizeListener };
window.EventManager = EventManager;
window.eventManager = eventManager;
window.addClickListener = addClickListener;
window.addInputListener = addInputListener;
window.addChangeListener = addChangeListener;
window.addScrollListener = addScrollListener;
window.addResizeListener = addResizeListener;