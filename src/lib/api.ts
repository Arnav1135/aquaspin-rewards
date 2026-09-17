// src/lib/api.ts
import { RNGEngine } from './rngEngine';
import { SecurityEngine } from './securityEngine';

export interface GameOutcomeResult {
  outcome: number | any;
  serverSeed: string; // The revealed server seed
}

// Store server seed securely (mock database)
const currentServerSeed = "SUPER_SECRET_SERVER_SEED_12345_FOR_PROVABLY_FAIR";

// In-memory store for active commitments to simulate a real backend
const activeCommitments = new Map<string, string>(); // clientSeed -> serverSeed

export const MockBackend = {
  /**
   * Called by the client before a bet to get the hashed server seed.
   */
  getCommitment(clientSeed: string, userId: string = 'guest'): string {
    if (!SecurityEngine.checkRateLimit(userId, 'getCommitment')) {
      throw new Error('Rate limit exceeded');
    }
    const { serverSeed, serverSeedHash } = RNGEngine.generateServerSeed();
    activeCommitments.set(clientSeed, serverSeed);
    return serverSeedHash;
  },

  /**
   * Simulates the server processing a bet.
   * In a real app, this deducts the balance and returns the outcome securely.
   */
  placeBet(clientSeed: string, nonce: number, betAmount: number, userId: string = 'guest'): GameOutcomeResult {
    if (!SecurityEngine.checkRateLimit(userId, 'placeBet')) {
      throw new Error('Rate limit exceeded');
    }
    if (SecurityEngine.detectAnomaly(userId, 'placeBet', betAmount)) {
      if (betAmount < 0 || isNaN(betAmount)) throw new Error('Invalid wager');
    }

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
  async placePlinkoBet(clientSeed: string, nonce: number, rows: number, betAmount: number, userId: string = 'guest'): Promise<{ path: ('L'|'R')[], targetBucket: number, serverSeed: string }> {
    if (!SecurityEngine.checkRateLimit(userId, 'placePlinkoBet')) {
      throw new Error('Rate limit exceeded');
    }
    if (SecurityEngine.detectAnomaly(userId, 'Plinko', betAmount)) {
      if (betAmount < 0 || isNaN(betAmount)) throw new Error('Invalid wager');
    }

    const serverSeed = activeCommitments.get(clientSeed);
    if (!serverSeed) {
      throw new Error("No active commitment found for this client seed.");
    }
    activeCommitments.delete(clientSeed);

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
