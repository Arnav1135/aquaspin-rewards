export interface OfflineTransaction {
  id: string;
  userId: string;
  type: 'bet' | 'win' | 'claim' | 'item_purchase';
  amount: number;
  metadata: Record<string, any>;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed';
}

/**
 * Offline-First High-Resilience Transaction Ledger:
 * 
 * SDE-3 Enterprise Storage & Sync standard.
 * Stores pending bets, game rounds, and quest claims in persistent IndexedDB storage
 * during subway/tunnel offline moments and replays them automatically upon reconnection.
 */
export class OfflineTransactionLedger {
  private dbName = 'aquaspin_offline_ledger';
  private storeName = 'transactions';
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };

      request.onsuccess = (e: any) => {
        this.db = e.target.result;
        resolve(this.db!);
      };

      request.onerror = (e) => reject(e);
    });
  }

  /**
   * Enqueues a transaction locally before network dispatch.
   */
  public async queueTransaction(tx: Omit<OfflineTransaction, 'id' | 'timestamp' | 'status'>): Promise<string> {
    const db = await this.initDB();
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const transaction: OfflineTransaction = {
      ...tx,
      id,
      timestamp: Date.now(),
      status: 'pending',
    };

    return new Promise((resolve, reject) => {
      const trans = db.transaction([this.storeName], 'readwrite');
      const store = trans.objectStore(this.storeName);
      const request = store.add(transaction);

      request.onsuccess = () => resolve(id);
      request.onerror = (e) => reject(e);
    });
  }

  /**
   * Retrieves all pending transactions to sync upon network restoration.
   */
  public async getPendingTransactions(): Promise<OfflineTransaction[]> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const trans = db.transaction([this.storeName], 'readonly');
      const store = trans.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const results: OfflineTransaction[] = request.result || [];
        resolve(results.filter((tx) => tx.status === 'pending'));
      };
      request.onerror = (e) => reject(e);
    });
  }

  /**
   * Marks a transaction as synced and purges it from the offline ledger.
   */
  public async markSynced(id: string): Promise<void> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const trans = db.transaction([this.storeName], 'readwrite');
      const store = trans.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e);
    });
  }
}

export const offlineLedger = new OfflineTransactionLedger();
