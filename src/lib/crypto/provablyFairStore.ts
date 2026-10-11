import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProvablyFair } from './provablyFair';

interface ProvablyFairState {
  clientSeed: string;
  serverSeedHash: string; // The hashed version we show the user
  nonce: number;
  
  // The actual server seed is kept secret on the server ideally, 
  // but for a fully on-chain/client-verified architecture without a dedicated backend per spin,
  // we rotate it and reveal the PREVIOUS seed.
  activeServerSeed: string; 
  previousServerSeed: string | null;
  previousClientSeed: string | null;
  previousNonce: number | null;

  generateNewClientSeed: () => Promise<void>;
  rotateServerSeed: () => Promise<void>;
  incrementNonce: () => void;
  getAndIncrementNonce: () => number;
}

export const useProvablyFairStore = create<ProvablyFairState>()(
  persist(
    (set, get) => ({
      clientSeed: 'aquaspin_default_client',
      serverSeedHash: '',
      nonce: 0,
      activeServerSeed: '',
      previousServerSeed: null,
      previousClientSeed: null,
      previousNonce: null,

      generateNewClientSeed: async () => {
        const seed = await ProvablyFair.generateSeed(32);
        set({ clientSeed: seed, nonce: 0 });
      },

      rotateServerSeed: async () => {
        const { activeServerSeed, clientSeed, nonce } = get();
        const newServerSeed = await ProvablyFair.generateSeed(64);
        const newHash = await ProvablyFair.hashServerSeed(newServerSeed);
        
        set({
          previousServerSeed: activeServerSeed || null,
          previousClientSeed: clientSeed,
          previousNonce: nonce,
          activeServerSeed: newServerSeed,
          serverSeedHash: newHash,
          nonce: 0
        });
      },

      incrementNonce: () => {
        set(state => ({ nonce: state.nonce + 1 }));
      },

      getAndIncrementNonce: () => {
        const current = get().nonce;
        set(state => ({ nonce: state.nonce + 1 }));
        return current;
      }
    }),
    {
      name: 'provably-fair-storage',
      // Only persist public verification artifacts to localStorage, never the secret active seed
      partialize: (state) => ({
        clientSeed: state.clientSeed,
        serverSeedHash: state.serverSeedHash,
        nonce: state.nonce,
        previousServerSeed: state.previousServerSeed,
        previousClientSeed: state.previousClientSeed,
        previousNonce: state.previousNonce,
      }),
    }
  )
);
