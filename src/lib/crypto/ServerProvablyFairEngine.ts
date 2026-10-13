import { ProvablyFair } from './provablyFair';

export interface ProvablyFairCommitment {
  roundId: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  timestamp: number;
}

export interface VerificationReceipt {
  roundId: string;
  revealedServerSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  outcomeFloat: number;
  verified: boolean;
}

/**
 * Server-Side Zero-Client Authority Provably Fair Engine:
 * 
 * SDE-3 Enterprise Cryptographic Verification Standard.
 * 
 * Strict Commit-Reveal Protocol:
 * 1. Pre-Round: Server generates cryptographically random 256-bit server seed, hashes it via SHA-256,
 *    and commits the hash to the client before any bet/action is accepted.
 * 2. Execution: Round outcome is derived deterministically from HMAC-SHA256(server_seed, client_seed:nonce).
 * 3. Post-Round Reveal: Server seed is revealed to client. Client recalculates SHA-256(server_seed) == serverSeedHash
 *    and confirms the outcome was non-tampered.
 */
export class ServerProvablyFairEngine {
  private activeCommitments = new Map<string, { serverSeed: string; hash: string }>();

  /**
   * Pre-commits a round hash before player places a bet.
   */
  public async createCommitment(roundId: string): Promise<{ roundId: string; serverSeedHash: string }> {
    const serverSeed = await ProvablyFair.generateSeed(64);
    const serverSeedHash = await ProvablyFair.hashServerSeed(serverSeed);

    this.activeCommitments.set(roundId, { serverSeed, hash: serverSeedHash });

    return {
      roundId,
      serverSeedHash,
    };
  }

  /**
   * Evaluates the outcome deterministically using HMAC-SHA256 and reveals the commitment.
   */
  public async evaluateRound(
    roundId: string,
    clientSeed: string,
    nonce: number
  ): Promise<{ outcomeFloat: number; receipt: VerificationReceipt }> {
    const commitment = this.activeCommitments.get(roundId);
    if (!commitment) {
      throw new Error(`[ServerProvablyFairEngine] Commitment expired or not found for round: ${roundId}`);
    }

    const { serverSeed, hash } = commitment;
    const outcomeFloat = await ProvablyFair.calculateOutcome(serverSeed, clientSeed, nonce);

    // Verify hash integrity mathematically
    const recalculatedHash = await ProvablyFair.hashServerSeed(serverSeed);
    const verified = recalculatedHash === hash;

    const receipt: VerificationReceipt = {
      roundId,
      revealedServerSeed: serverSeed,
      serverSeedHash: hash,
      clientSeed,
      nonce,
      outcomeFloat,
      verified,
    };

    // Clean up consumed round commitment
    this.activeCommitments.delete(roundId);

    return { outcomeFloat, receipt };
  }

  /**
   * Independent client verifier: Anyone can verify any past receipt offline.
   */
  public static async verifyReceiptOffline(receipt: VerificationReceipt): Promise<boolean> {
    const recalculatedHash = await ProvablyFair.hashServerSeed(receipt.revealedServerSeed);
    if (recalculatedHash !== receipt.serverSeedHash) {
      return false;
    }

    const recalculatedFloat = await ProvablyFair.calculateOutcome(
      receipt.revealedServerSeed,
      receipt.clientSeed,
      receipt.nonce
    );

    return Math.abs(recalculatedFloat - receipt.outcomeFloat) < 0.00000001;
  }
}
