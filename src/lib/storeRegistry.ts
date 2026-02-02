/**
 * @file storeRegistry.ts
 * @description 状态管理注册表 - 统一 Store 职责和跨 Store 通信
 */

import { create, StoreApi, UseBoundStore } from 'zustand';

// ========== Store 元数据 ==========

interface StoreMeta {
  name: string;
  description: string;
  domain: 'ui' | 'data' | 'session' | 'system';
  persistent: boolean;
  dependencies?: string[];
}

// ========== Store 注册表 ==========

class StoreRegistry {
  private stores = new Map<string, {
    store: UseBoundStore<StoreApi<unknown>>;
    meta: StoreMeta;
  }>();

  private subscribers = new Map<string, Set<(state: unknown) => void>>();

  /**
   * 注册 Store
   */
  register<T>(
    name: string,
    store: UseBoundStore<StoreApi<T>>,
    meta: Omit<StoreMeta, 'name'>
  ) {
    if (this.stores.has(name)) {
      console.warn(`Store "${name}" is already registered. Skipping.`);
      return;
    }

    this.stores.set(name, {
      store: store as UseBoundStore<StoreApi<unknown>>,
      meta: { ...meta, name },
    });

    // 设置状态变化监听
    store.subscribe((state) => {
      this.notifySubscribers(name, state);
    });
  }

  /**
   * 获取 Store
   */
  get<T>(name: string): UseBoundStore<StoreApi<T>> | undefined {
    return this.stores.get(name)?.store as UseBoundStore<StoreApi<T>> | undefined;
  }

  /**
   * 获取 Store 元数据
   */
  getMeta(name: string): StoreMeta | undefined {
    return this.stores.get(name)?.meta;
  }

  /**
   * 获取所有已注册的 Store 名称
   */
  getRegisteredStores(): string[] {
    return Array.from(this.stores.keys());
  }

  /**
   * 订阅 Store 变化（跨 Store 通信）
   */
  subscribe(storeName: string, callback: (state: unknown) => void): () => void {
    if (!this.subscribers.has(storeName)) {
      this.subscribers.set(storeName, new Set());
    }
    this.subscribers.get(storeName)!.add(callback);

    return () => {
      this.subscribers.get(storeName)?.delete(callback);
    };
  }

  /**
   * 通知订阅者
   */
  private notifySubscribers(storeName: string, state: unknown) {
    this.subscribers.get(storeName)?.forEach((callback) => {
      try {
        callback(state);
      } catch (error) {
        console.error(`Error in store subscriber for "${storeName}":`, error);
      }
    });
  }

  /**
   * 重置指定 Store
   */
  reset(name: string) {
    const storeEntry = this.stores.get(name);
    if (storeEntry) {
      const store = storeEntry.store;
      const initialState = store.getInitialState?.();
      if (initialState) {
        store.setState(initialState);
      }
    }
  }

  /**
   * 重置所有 Store
   */
  resetAll() {
    this.stores.forEach((_, name) => this.reset(name));
  }

  /**
   * 获取所有 Store 的状态快照（用于调试）
   */
  getSnapshot(): Record<string, unknown> {
    const snapshot: Record<string, unknown> = {};
    this.stores.forEach(({ store }, name) => {
      snapshot[name] = store.getState();
    });
    return snapshot;
  }

  /**
   * 获取 Store 依赖图
   */
  getDependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    this.stores.forEach(({ meta }, name) => {
      graph[name] = meta.dependencies || [];
    });
    return graph;
  }
}

// 单例实例
export const storeRegistry = new StoreRegistry();

// ========== 跨 Store 事件总线 ==========

type EventCallback<T = unknown> = (payload: T) => void;

class StoreEventBus {
  private listeners = new Map<string, Set<EventCallback>>();

  /**
   * 发布事件
   */
  emit<T>(event: string, payload: T) {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(payload);
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error);
      }
    });
  }

  /**
   * 订阅事件
   */
  on<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);

    return () => {
      this.listeners.get(event)?.delete(callback as EventCallback);
    };
  }

  /**
   * 一次性订阅
   */
  once<T>(event: string, callback: EventCallback<T>): () => void {
    const wrappedCallback: EventCallback<T> = (payload) => {
      callback(payload);
      this.listeners.get(event)?.delete(wrappedCallback as EventCallback);
    };
    return this.on(event, wrappedCallback);
  }

  /**
   * 移除事件所有监听器
   */
  off(event: string) {
    this.listeners.delete(event);
  }

  /**
   * 清除所有监听器
   */
  clear() {
    this.listeners.clear();
  }
}

export const storeEventBus = new StoreEventBus();

// ========== 预定义事件类型 ==========

export const StoreEvents = {
  // 用户事件
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',
  
  // Agent 事件
  AGENT_SELECTED: 'agent:selected',
  AGENT_UPDATED: 'agent:updated',
  AGENT_DEPLOYED: 'agent:deployed',
  
  // 画布事件
  CANVAS_NODE_ADDED: 'canvas:node:added',
  CANVAS_NODE_REMOVED: 'canvas:node:removed',
  CANVAS_EDGE_ADDED: 'canvas:edge:added',
  
  // 会话事件
  SESSION_STARTED: 'session:started',
  SESSION_ENDED: 'session:ended',
  SESSION_MESSAGE: 'session:message',
  
  // 系统事件
  THEME_CHANGED: 'system:theme:changed',
  LOCALE_CHANGED: 'system:locale:changed',
} as const;

// ========== 持久化中间件 ==========

interface PersistOptions {
  key: string;
  storage?: Storage;
  partialize?: (state: unknown) => unknown;
  version?: number;
}

export function createPersistMiddleware<T extends object>(options: PersistOptions) {
  const { key, storage = localStorage, partialize, version = 1 } = options;
  const storageKey = `store:${key}:v${version}`;

  return {
    load: (): Partial<T> | null => {
      try {
        const saved = storage.getItem(storageKey);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (error) {
        console.error(`Failed to load persisted state for "${key}":`, error);
      }
      return null;
    },

    save: (state: T) => {
      try {
        const toSave = partialize ? partialize(state) : state;
        storage.setItem(storageKey, JSON.stringify(toSave));
      } catch (error) {
        console.error(`Failed to persist state for "${key}":`, error);
      }
    },

    clear: () => {
      storage.removeItem(storageKey);
    },
  };
}

// ========== Store 工厂 ==========

interface CreateStoreOptions<T> extends Omit<StoreMeta, 'name'> {
  name: string;
  initialState: T;
  actions: (
    set: StoreApi<T>['setState'],
    get: () => T,
    emit: <P>(event: string, payload: P) => void
  ) => Record<string, (...args: unknown[]) => void>;
  persist?: PersistOptions;
}

export function createRegisteredStore<T extends object>(options: CreateStoreOptions<T>) {
  const { name, initialState, actions, persist, ...meta } = options;

  // 创建持久化中间件
  const persistMiddleware = persist ? createPersistMiddleware<T>(persist) : null;

  // 加载持久化状态
  const loadedState = persistMiddleware?.load();
  const mergedInitialState = loadedState
    ? { ...initialState, ...loadedState }
    : initialState;

  // 创建 Store
  const store = create<T>()((set, get) => ({
    ...mergedInitialState,
    ...actions(set, get, storeEventBus.emit.bind(storeEventBus)),
  }));

  // 设置持久化监听
  if (persistMiddleware) {
    store.subscribe((state) => {
      persistMiddleware.save(state);
    });
  }

  // 注册到注册表
  storeRegistry.register(name, store, meta);

  return store;
}

// ========== 调试工具 ==========

export function enableStoreDevTools() {
  if (typeof window !== 'undefined') {
    (window as unknown as { __STORE_REGISTRY__: StoreRegistry }).__STORE_REGISTRY__ = storeRegistry;
    (window as unknown as { __STORE_EVENT_BUS__: StoreEventBus }).__STORE_EVENT_BUS__ = storeEventBus;
    
    console.log('[StoreRegistry] DevTools enabled. Access via window.__STORE_REGISTRY__');
  }
}

// ========== React Hook ==========

import { useEffect, useState } from 'react';

export function useStoreSnapshot(): Record<string, unknown> {
  const [snapshot, setSnapshot] = useState<Record<string, unknown>>({});

  useEffect(() => {
    // 初始快照
    setSnapshot(storeRegistry.getSnapshot());

    // 订阅所有 Store 变化
    const unsubscribers = storeRegistry.getRegisteredStores().map((name) =>
      storeRegistry.subscribe(name, () => {
        setSnapshot(storeRegistry.getSnapshot());
      })
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  return snapshot;
}
