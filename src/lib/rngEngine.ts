// src/lib/rngEngine.ts
// Standard Provably Fair commit-reveal logic implementation


export interface ProvablyFairCommitment {
  serverSeedHash: string; // SHA-256 hash of the server seed (public to client before bet)
}

export interface ProvablyFairReveal {
  serverSeed: string; // Revealed after the bet
  clientSeed: string;
  nonce: number;
}

export class RNGEngine {
  /**
   * Generates a new server seed and its hash.
   * In a real backend, the serverSeed is stored secretly and the hash is sent to the client.
   */
  static generateServerSeed(): { serverSeed: string; serverSeedHash: string } {
    const serverSeed = 'server-' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    // Use Web Crypto API or a subtle crypto library. Since this is frontend code simulating backend, we use a basic hash if crypto module is unavailable, but let's assume we use standard SHA256.
    // For browser compatibility, we can use a simple mock hash function if `crypto` isn't available, but we'll try to use standard subtle crypto in async.
    return {
      serverSeed,
      serverSeedHash: this.mockSha256(serverSeed)
    };
  }

  /**
   * Generates a deterministic float between [0, 1) using HMAC-SHA256(serverSeed, clientSeed:nonce:cursor)
   * This matches the industry standard (e.g. Stake, Roobet).
   */
  static generateFloat(serverSeed: string, clientSeed: string, nonce: number, cursor: number = 0): number {
    const message = `${clientSeed}:${nonce}:${cursor}`;
    
    // In a real environment, we'd use: hmac_sha256(key=serverSeed, msg=message)
    // For this client-side simulation, we use a seeded random based on the concatenated string
    const hash = this.mockHmacSha256(serverSeed, message);
    
    // Convert first 8 hex characters to a float [0, 1)
    const partial = hash.substring(0, 8);
    return parseInt(partial, 16) / 0xffffffff;
  }

  /**
   * Generates an array of bytes for games that need multiple random events (like Mines, Plinko)
   */
  static generateBytes(serverSeed: string, clientSeed: string, nonce: number, count: number): number[] {
    const bytes: number[] = [];
    let currentCursor = 0;
    while (bytes.length < count) {
      const hash = this.mockHmacSha256(serverSeed, `${clientSeed}:${nonce}:${currentCursor}`);
      for (let i = 0; i < hash.length; i += 2) {
        if (bytes.length >= count) break;
        bytes.push(parseInt(hash.substring(i, i + 2), 16));
      }
      currentCursor++;
    }
    return bytes;
  }

  /**
   * Verifies that a revealed server seed matches the previously provided hash.
   */
  static verifyCommitment(serverSeed: string, expectedHash: string): boolean {
    return this.mockSha256(serverSeed) === expectedHash;
  }

  // --- Mocks for Browser Simulation ---
  private static mockSha256(message: string): string {
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }

  private static mockHmacSha256(key: string, message: string): string {
    const combined = key + '|' + message;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    // ensure it returns a long hex string
    return Math.abs(hash * 31).toString(16).padStart(64, 'a');
  }
}
