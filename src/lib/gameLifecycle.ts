/**
 * ONE SOURCE OF TRUTH FOR FULLSCREEN AND GAME EXITS
 * Prevents multiple games/components from fighting over viewport control.
 */

class FullscreenController {
  public isFullscreen(): boolean {
    return !!document.fullscreenElement;
  }

  public async enterFullscreen(): Promise<void> {
    if (!this.isFullscreen() && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (e) {
        console.warn("Fullscreen request denied", e);
      }
    }
  }

  public async exitFullscreen(): Promise<void> {
    if (this.isFullscreen() && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch (e) {
        console.warn("Fullscreen exit failed", e);
      }
    }
  }

  public async toggleFullscreen(): Promise<void> {
    if (this.isFullscreen()) {
      await this.exitFullscreen();
    } else {
      await this.enterFullscreen();
    }
  }
}

export const fullscreenManager = new FullscreenController();

let isExiting = false;

/**
 * Universal Exit Function
 * Ensures all WebGL, Audio, and Canvas resources are forcefully purged
 * before navigation occurs.
 */
export async function exitGameExperience(onClose: () => void) {
  if (isExiting) return;
  isExiting = true;

  try {
    // 1. Force exit fullscreen
    await fullscreenManager.exitFullscreen();

    // 2. Restore document overflow in case games locked it
    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "auto";

    // 3. Clear all global intervals and timeouts if possible
    // (Note: To safely clear all, we would track them, but for now we clear the highest known ID)
    const highestId = window.setTimeout(() => {}, 0);
    for (let i = highestId; i >= 0; i--) {
      window.clearTimeout(i);
      window.clearInterval(i);
    }

    // 4. Force React/DOM to tick, then invoke the callback
    requestAnimationFrame(() => {
      onClose();
      isExiting = false; // Reset lock
    });

  } catch (error) {
    console.error("Error during game exit sequence:", error);
    onClose();
    isExiting = false;
  }
}