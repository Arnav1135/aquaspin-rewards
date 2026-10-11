/**
 * Provably Fair RNG System
 * 
 * SDE-3 Level Cryptographic Verification System.
 * Generates deterministic, verifiable random outcomes using HMAC-SHA256.
 */

export class ProvablyFair {
  /**
   * Generates a securely random hex string.
   */
  static async generateSeed(length = 64): Promise<string> {
    const array = new Uint8Array(length / 2);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Hashes the server seed to show to the player BEFORE they play.
   */
  static async hashServerSeed(serverSeed: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(serverSeed);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generates the final verifiable hash using HMAC-SHA256(server_seed, client_seed + ":" + nonce)
   */
  static async generateHmac(serverSeed: string, clientSeed: string, nonce: number): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(serverSeed);
    const messageData = encoder.encode(`${clientSeed}:${nonce}`);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Converts a hex hash to a uniform float [0, 1)
   */
  static hashToFloat(hash: string): number {
    // Take the first 8 characters (32 bits) of the hex hash
    const subHash = hash.substring(0, 8);
    // Convert to an integer
    const intValue = parseInt(subHash, 16);
    // Divide by max 32-bit uint (4294967296) to get a float [0, 1)
    return intValue / 4294967296;
  }

  /**
   * Full pipeline to generate a Provably Fair float outcome.
   */
  static async calculateOutcome(serverSeed: string, clientSeed: string, nonce: number): Promise<number> {
    const hmac = await this.generateHmac(serverSeed, clientSeed, nonce);
    return this.hashToFloat(hmac);
  }
}
