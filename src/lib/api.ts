// src/lib/api.ts
import { RNGEngine } from './rngEngine';

export interface GameOutcomeResult {
  outcome: number | any;
  serverSeed: string; // The revealed server seed
}

// In-memory store for active commitments to simulate a real backend
const activeCommitments = new Map<string, string>(); // clientSeed -> serverSeed

export const MockBackend = {
  /**
   * Called by the client before a bet to get the hashed server seed.
   */
  getCommitment(clientSeed: string): string {
    const { serverSeed, serverSeedHash } = RNGEngine.generateServerSeed();
    activeCommitments.set(clientSeed, serverSeed);
    return serverSeedHash;
  },

  /**
   * Simulates the server processing a bet.
   * In a real app, this deducts the balance and returns the outcome securely.
   */
  placeBet(clientSeed: string, nonce: number, _betAmount: number): GameOutcomeResult {
    // 1. Validate commitment
    const serverSeed = activeCommitments.get(clientSeed);
    if (!serverSeed) {
      throw new Error("No active commitment found for this client seed.");
    }

    // 2. Clear commitment so it can't be reused for the same nonce
    activeCommitments.delete(clientSeed);

    // 3. Generate the outcome float
    const randomFloat = RNGEngine.generateFloat(serverSeed, clientSeed, nonce);

    return {
      outcome: randomFloat,
      serverSeed, // Reveal it to the client for verification
    };
  },

  /**
   * Simulates the server processing a Plinko bet.
   * Resolves the path server-side to guarantee fairness.
   */
  async placePlinkoBet(clientSeed: string, nonce: number, rows: number, _betAmount: number): Promise<{ path: ('L'|'R')[], targetBucket: number, serverSeed: string }> {
    const serverSeed = activeCommitments.get(clientSeed);
    if (!serverSeed) {
      throw new Error("No active commitment found for this client seed.");
    }
    activeCommitments.delete(clientSeed);

    // Dynamic import to avoid circular dependencies if any, but since we are just mocking, we can use the same logic locally:
    // Plinko generates L/R by HMACing the seeds
    const encoder = new TextEncoder();
    const keyData = encoder.encode(serverSeed);
    const msgData = encoder.encode(`${clientSeed}:${nonce}`);
    
    const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, msgData);
    const hashArray = Array.from(new Uint8Array(signature));
    
    const path: ('L' | 'R')[] = [];
    let bucket = 0;
    
    for (let i = 0; i < rows; i++) {
      const byte = hashArray[i];
      if (byte % 2 === 1) {
        path.push('R');
        bucket += 1;
      } else {
        path.push('L');
      }
    }

    return {
      path,
      targetBucket: bucket,
      serverSeed
    };
  }
};
