import { openDB } from 'idb';

const DB_NAME = 'CandyCrunchDB';
const DB_VERSION = 1;
const STORE_NAME = 'game_state';

// Initialize IndexedDB
const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME);
    }
  },
});

export const idbStore = {
  async get(key) {
    return (await dbPromise).get(STORE_NAME, key);
  },
  async set(key, val) {
    return (await dbPromise).put(STORE_NAME, val, key);
  },
  async delete(key) {
    return (await dbPromise).delete(STORE_NAME, key);
  },
  async clear() {
    return (await dbPromise).clear(STORE_NAME);
  },
};
