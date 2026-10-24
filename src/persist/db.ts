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
    async get(s, key) {
      return store(s).get(key);
    },
    async put(s, key, value) {
      store(s).set(key, value);
    },
    async delete(s, key) {
      store(s).delete(key);
    },
    async getAll(s) {
      return [...store(s).values()];
    },
    async getAllKeys(s) {
      return [...store(s).keys()];
    },
  };
}

export const DB_NAME = "cutroom";
export const DB_VERSION = 1;
export const PROJECTS = "projects";
export const ASSETS = "assets";

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
      };
      req.onsuccess = () => {
        const db = req.result;
        const wrap: SimpleDB = {
          mode: "idb",
          get: (s, key) =>
            new Promise((res, rej) => {
              const r = db.transaction(s, "readonly").objectStore(s).get(key);
              r.onsuccess = () => res(r.result as never);
              r.onerror = () => rej(r.error);
            }),
          put: (s, key, value) =>
            new Promise((res, rej) => {
              const r = db.transaction(s, "readwrite").objectStore(s).put(value, key);
              r.onsuccess = () => res();
              r.onerror = () => rej(r.error);
            }),
          delete: (s, key) =>
            new Promise((res, rej) => {
              const r = db.transaction(s, "readwrite").objectStore(s).delete(key);
              r.onsuccess = () => res();
              r.onerror = () => rej(r.error);
            }),
          getAll: (s) =>
            new Promise((res, rej) => {
              const r = db.transaction(s, "readonly").objectStore(s).getAll();
              r.onsuccess = () => res(r.result as never[]);
              r.onerror = () => rej(r.error);
            }),
          getAllKeys: (s) =>
            new Promise((res, rej) => {
              const r = db.transaction(s, "readonly").objectStore(s).getAllKeys();
              r.onsuccess = () => res(r.result as string[]);
              r.onerror = () => rej(r.error);
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
