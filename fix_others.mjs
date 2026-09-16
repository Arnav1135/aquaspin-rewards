
import fs from "fs";

// Fix GameFrame.tsx (if it exists)
if (fs.existsSync("src/components/games/GameFrame.tsx")) {
  let frame = fs.readFileSync("src/components/games/GameFrame.tsx", "utf-8");
  // Replace custom fullscreen requests with fullscreenManager
  frame = frame.replace(
    /document\.documentElement\.requestFullscreen\(\)/g,
    "fullscreenManager.enterFullscreen()"
  );
  frame = frame.replace(
    /document\.exitFullscreen\(\)/g,
    "fullscreenManager.exitFullscreen()"
  );
  if (!frame.includes("fullscreenManager")) {
    frame = "import { fullscreenManager, exitGameExperience } from \"@/lib/gameLifecycle\";\n" + frame;
  }
  // Change closing logic to use exitGameExperience
  frame = frame.replace(
    /onClose\(\)/g,
    "exitGameExperience(onClose)"
  );
  fs.writeFileSync("src/components/games/GameFrame.tsx", frame);
}

// Fix AIGameEngineArchitect.ts (if it has an EXIT button)
// We will just add a global fixed button to the portal if needed, but since it is an engine, it might not render UI directly.
// The prompt asked for "permanent visible EXIT AGE control for the AGE Architect portal."
// Actually, AGE Architect is probably a page component: `src/pages/AIGameEngineArchitect.tsx` or similar. Let us check where it renders.

