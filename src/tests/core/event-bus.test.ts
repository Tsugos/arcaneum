import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '@/core/event-bus';

describe('EventBus Core Module', () => {
  it('should register and trigger event listeners', async () => {
    const bus = new EventBus();
    const mockFn = vi.fn();

    bus.on('test:event', mockFn);
    await bus.emit('test:event', { payload: 'hello' });

    expect(mockFn).toHaveBeenCalledOnce();
    expect(mockFn).toHaveBeenCalledWith({ payload: 'hello' });
  });

  it('should unsubscribe listeners correctly', async () => {
    const bus = new EventBus();
    const mockFn = vi.fn();

    const unsubscribe = bus.on('test:event', mockFn);
    unsubscribe();
    await bus.emit('test:event', {});

    expect(mockFn).not.toHaveBeenCalled();
  });
});
