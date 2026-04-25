
'use client';

// This is a simple, shared event emitter.
// We are not using the node 'events' module to avoid browser compatibility issues
// and to keep the client-side bundle small.

type Listener = (...args: any[]) => void;

class SimpleEventEmitter {
  private events: Record<string, Listener[]> = {};

  on(event: string, listener: Listener): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);

    // Return a function to unsubscribe
    return () => {
      this.removeListener(event, listener);
    };
  }

  removeListener(event: string, listener: Listener): void {
    if (!this.events[event]) {
      return;
    }
    const idx = this.events[event].indexOf(listener);
    if (idx > -1) {
      this.events[event].splice(idx, 1);
    }
  }

  emit(event: string, ...args: any[]): void {
    if (this.events[event]) {
      // Create a copy of the listeners array in case a listener unsubscribes itself
      const listeners = [...this.events[event]];
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (e) {
          console.error(`Error in event listener for ${event}:`, e);
        }
      });
    }
  }
}

export const errorEmitter = new SimpleEventEmitter();
