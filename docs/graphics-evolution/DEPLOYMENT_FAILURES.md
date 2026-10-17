# AquaSpin Rewards — Deployment Failures & Diagnoses


## [2026-10-17T08:45:11.226Z] Task: REC-COINFLIP-3D-PBR-TEXTURES (Commit: bf6209d)
- **Root Cause:** Live smoke test failed runtime assertion.
- **Retries Attempted:** 1
- **Status:** BLOCKED
- **Remediation Action:** Preserved last known good release.

## [2026-10-17T12:37:12.559Z] Task: REC-QUIZ-HOLOGRAPHIC-HUD-PBR (Commit: 1c0a80f)
- **Root Cause:** Vercel CLI 54.21.1 (Node.js 24.18.0)
Retrieving project…
Deploying vermaarnav113-5136s-projects/aquaspin-rewards
Uploading [--------------------] (0.0B/616.1KB)
Uploading [=====---------------] (157.2KB/616.1KB)
Uploading [==========----------] (313.6KB/616.1KB)
Uploading [===============-----] (473.6KB/616.1KB)
Uploading [====================] (616.1KB/616.1KB)
  Inspect         https://vercel.com/vermaarnav113-5136s-projects/aquaspin-rewards/bbE2gTUVzNvppkrBTZwWAvQphLco
  Preview         https://aquaspin-rewards-e30imb2bj-vermaarnav113-5136s-projects.vercel.app
Building…
Building…
Running build in Washington, D.C., USA (East) – iad1
Build machine configuration: 2 cores, 8 GB
Retrieving list of deployment files...
Downloading 139 deployment files...
Restored build cache from previous deployment (RwNMx3aL524iuk77z2mcDRTdqSh6)
Running "vercel build"
Vercel CLI 64.0.2
Installing dependencies...
npm warn Unknown env config "cache-dir". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
up to date in 1s
152 packages are looking for funding
run `npm fund` for details
npm warn install-scripts 2 packages have install scripts not yet covered by allowScripts:
npm warn install-scripts   esbuild@0.21.5 (postinstall: node install.js)
npm warn install-scripts   esbuild@0.28.2 (postinstall: node install.js)
npm warn install-scripts
npm warn install-scripts Run `npm install-scripts ls` to review, or `npm install-scripts approve <pkg>` to allow.
npm warn Unknown env config "cache-dir". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
> aquaspin-rewards@1.0.0 build
> tsc && vite build
src/components/games/MemoryGame.tsx(6,33): error TS6133: 'Brain' is declared but its value is never read.
Error: [BUILD_UTILS_SPAWN_2] Command "npm run build" exited with 2
Error: Command "npm run build" exited with 2

- **Retries Attempted:** 1
- **Status:** BLOCKED
- **Remediation Action:** Preserved last known good release.
