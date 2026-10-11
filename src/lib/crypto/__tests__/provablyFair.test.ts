import { describe, it, expect } from 'vitest';
import { ProvablyFair } from '../provablyFair';

describe('ProvablyFair Cryptography Engine', () => {
  it('generates random seeds with expected length', async () => {
    const seed = await ProvablyFair.generateSeed(64);
    expect(seed).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(seed)).toBe(true);
  });

  it('hashes server seed deterministically with SHA-256', async () => {
    const serverSeed = 'test_server_seed_12345';
    const hash1 = await ProvablyFair.hashServerSeed(serverSeed);
    const hash2 = await ProvablyFair.hashServerSeed(serverSeed);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('generates deterministic HMAC-SHA256 outcome float in [0, 1)', async () => {
    const serverSeed = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const clientSeed = 'custom_user_client_seed';
    const nonce = 42;

    const outcome1 = await ProvablyFair.calculateOutcome(serverSeed, clientSeed, nonce);
    const outcome2 = await ProvablyFair.calculateOutcome(serverSeed, clientSeed, nonce);

    expect(outcome1).toBe(outcome2);
    expect(outcome1).toBeGreaterThanOrEqual(0);
    expect(outcome1).toBeLessThan(1);
  });

  it('produces different outcomes with incremented nonce', async () => {
    const serverSeed = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const clientSeed = 'user_seed';

    const outcomeA = await ProvablyFair.calculateOutcome(serverSeed, clientSeed, 1);
    const outcomeB = await ProvablyFair.calculateOutcome(serverSeed, clientSeed, 2);

    expect(outcomeA).not.toBe(outcomeB);
  });
});
