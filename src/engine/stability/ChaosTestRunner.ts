// ChaosTestRunner.ts

export class ChaosTestRunner {
  static runLayerATest(triggerCrashFn: () => void) {
    console.warn("🧪 [Chaos Test] Triggering Layer A Frame Crash in 2 seconds...");
    setTimeout(() => {
      try {
        triggerCrashFn(); // This should trigger the ErrorBoundary
      } catch (e: any) {
        // If it throws synchronously here, log it, but normally it throws in React render
        console.error("🧪 [Chaos Test] Caught synchronously, expected React ErrorBoundary to catch it.");
      }
    }, 2000);
  }

  // To be implemented in later phases:
  // static runLayerCTest() {
  //   const canvas = document.querySelector('canvas');
  //   const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
  //   const ext = gl?.getExtension('WEBGL_lose_context');
  //   if (ext) {
  //     console.warn("🧪 [Chaos Test] Forcing WebGL Context Loss...");
  //     ext.loseContext();
  //     // setTimeout(() => ext.restoreContext(), 3000);
  //   }
  // }
}
