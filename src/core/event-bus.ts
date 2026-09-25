/**
 * Arcaneum Core Event Bus
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/EVENT_ARCHITECTURE.md
 */

export type EventCallback<T = unknown> = (data: T) => void | Promise<void>;

export interface IEventBus {
  on<T = unknown>(event: string, callback: EventCallback<T>): () => void;
  off<T = unknown>(event: string, callback: EventCallback<T>): void;
  emit<T = unknown>(event: string, payload: T): Promise<void>;
  once<T = unknown>(event: string, callback: EventCallback<T>): () => void;
  clear(): void;
}

export class EventBus implements IEventBus {
  private listeners: Map<string, Set<EventCallback<any>>> = new Map();

  on<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const handlers = this.listeners.get(event)!;
    handlers.add(callback as EventCallback<any>);

    // Unsubscribe function
    return () => this.off(event, callback);
  }

  off<T = unknown>(event: string, callback: EventCallback<T>): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(callback as EventCallback<any>);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  async emit<T = unknown>(event: string, payload: T): Promise<void> {
    const handlers = this.listeners.get(event);
    if (!handlers || handlers.size === 0) return;

    const promises: Promise<void>[] = [];
    for (const handler of Array.from(handlers)) {
      try {
        const result = handler(payload);
        if (result instanceof Promise) {
          promises.push(result);
        }
      } catch (err) {
        console.error(`[EventBus] Error in event listener for '${event}':`, err);
      }
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
  }

  once<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    const wrapper: EventCallback<T> = (data: T) => {
      this.off(event, wrapper);
      return callback(data);
    };
    return this.on(event, wrapper);
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const globalEventBus = new EventBus();
