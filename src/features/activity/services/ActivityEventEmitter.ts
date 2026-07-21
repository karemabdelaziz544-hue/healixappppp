type ActivityEventCallback = (payload: any) => void;

export class ActivityEventEmitter {
  private static listeners: Record<string, ActivityEventCallback[]> = {};

  /**
   * Subscribe to a specific local activity event.
   * Returns a cleanup function to unsubscribe.
   */
  static subscribe(event: string, callback: ActivityEventCallback): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  /**
   * Broadcast an event to all registered listeners.
   */
  static emit(event: string, payload: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(payload);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(`[ActivityEventEmitter] error in listener for "${event}":`, e);
        }
      });
    }
  }
}
