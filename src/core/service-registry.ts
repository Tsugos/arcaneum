/**
 * Arcaneum Core Service Registry (Dependency Injection)
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/ARCHITECTURE.md
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/SYSTEM_MODULES.md
 */

export interface IServiceRegistry {
  register<T>(name: string, instance: T): void;
  get<T>(name: string): T;
  has(name: string): boolean;
  unregister(name: string): void;
  clear(): void;
}

export class ServiceRegistry implements IServiceRegistry {
  private services = new Map<string, unknown>();

  register<T>(name: string, instance: T): void {
    if (this.services.has(name)) {
      console.warn(`[ServiceRegistry] Overwriting existing service '${name}'`);
    }
    this.services.set(name, instance);
  }

  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`[ServiceRegistry] Service '${name}' is not registered.`);
    }
    return service as T;
  }

  has(name: string): boolean {
    return this.services.has(name);
  }

  unregister(name: string): void {
    this.services.delete(name);
  }

  clear(): void {
    this.services.clear();
  }
}

export const globalServiceRegistry = new ServiceRegistry();
