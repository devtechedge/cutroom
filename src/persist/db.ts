/** Minimal promise wrapper over IndexedDB with an in-memory fallback. */

export type StoreMode = "idb" | "memory";

export interface SimpleDB {
  mode: StoreMode;
  get<T = unknown>(store: string, key: string): Promise<T | undefined>;
  put(store: string, key: string, value: unknown): Promise<void>;
  delete(store: string, key: string): Promise<void>;
  getAll<T = unknown>(store: string): Promise<T[]>;
  getAllKeys(store: string): Promise<string[]>;
}

function memoryDB(): SimpleDB {
  const stores = new Map<string, Map<string, unknown>>();
  const store = (name: string): Map<string, unknown> => {
    let s = stores.get(name);
    if (!s) {
      s = new Map();
      stores.set(name, s);
    }
    return s;
  };
  return {
    mode: "memory",
    get<T = unknown>(s: string, key: string): Promise<T | undefined> {
      return Promise.resolve(store(s).get(key) as T | undefined);
    },
    put(s: string, key: string, value: unknown): Promise<void> {
      store(s).set(key, value);
      return Promise.resolve();
    },
    delete(s: string, key: string): Promise<void> {
      store(s).delete(key);
      return Promise.resolve();
    },
    getAll<T = unknown>(s: string): Promise<T[]> {
      return Promise.resolve([...store(s).values()] as T[]);
    },
    getAllKeys(s: string): Promise<string[]> {
      return Promise.resolve([...store(s).keys()]);
    },
  };
}

export const DB_NAME = "cutroom";
export const DB_VERSION = 2;
export const PROJECTS = "projects";
export const ASSETS = "assets";
export const TRASH = "trash";

/** Opens IndexedDB; resolves to the memory fallback when IDB is blocked. */
export function openSimpleDB(onError?: (err: unknown) => void): Promise<SimpleDB> {
  return new Promise((resolve) => {
    let settled = false;
    const fallback = (): void => {
      if (!settled) {
        settled = true;
        resolve(memoryDB());
      }
    };
    const fail = (err: unknown): void => {
      onError?.(err);
      fallback();
    };
    try {
      if (typeof indexedDB === "undefined") {
        fallback();
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(PROJECTS)) db.createObjectStore(PROJECTS);
        if (!db.objectStoreNames.contains(ASSETS)) db.createObjectStore(ASSETS);
        if (!db.objectStoreNames.contains(TRASH)) db.createObjectStore(TRASH);
      };
      req.onsuccess = () => {
        const db = req.result;
        const wrap: SimpleDB = {
          mode: "idb",
          get: (s, key) =>
            new Promise((res, rej) => {
              const r = db.transaction(s, "readonly").objectStore(s).get(key);
              r.onsuccess = () => res(r.result as never);
              r.onerror = () => rej(r.error ?? new Error("IndexedDB read failed"));
            }),
          put: (s, key, value) =>
            new Promise((res, rej) => {
              const r = db.transaction(s, "readwrite").objectStore(s).put(value, key);
              r.onsuccess = () => res();
              r.onerror = () => rej(r.error ?? new Error("IndexedDB write failed"));
            }),
          delete: (s, key) =>
            new Promise((res, rej) => {
              const r = db.transaction(s, "readwrite").objectStore(s).delete(key);
              r.onsuccess = () => res();
              r.onerror = () => rej(r.error ?? new Error("IndexedDB delete failed"));
            }),
          getAll: (s) =>
            new Promise((res, rej) => {
              const r = db.transaction(s, "readonly").objectStore(s).getAll();
              r.onsuccess = () => res(r.result as never[]);
              r.onerror = () => rej(r.error ?? new Error("IndexedDB read failed"));
            }),
          getAllKeys: (s) =>
            new Promise((res, rej) => {
              const r = db.transaction(s, "readonly").objectStore(s).getAllKeys();
              r.onsuccess = () => res(r.result as string[]);
              r.onerror = () => rej(r.error ?? new Error("IndexedDB read failed"));
            }),
        };
        if (!settled) {
          settled = true;
          resolve(wrap);
        }
      };
      req.onerror = () => fail(req.error);
      req.onblocked = () => fail(new Error("IndexedDB open blocked"));
    } catch (err) {
      fail(err);
    }
  });
}
