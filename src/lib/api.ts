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
  }
};
