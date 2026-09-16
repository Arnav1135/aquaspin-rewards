
import fs from "fs";

let engine = fs.readFileSync("src/engine/3d/AquaSpinEngine.tsx", "utf-8");
engine = engine.replace(
  "{quality === \"high\" ? (\n                <SSR />\n              ) : <></>}",
  `{quality === "high" ? (
                <>
                  <SSR />
                  <SSAO blendFunction={BlendFunction.MULTIPLY} samples={31} radius={0.1} intensity={15} luminanceInfluence={0.6} color="black" />
                </>
              ) : <></>}`
);
engine = engine.replace(
  "{cameraMode === \"cinematic\" && quality === \"high\" ? (\n                <DepthOfField focusDistance={0} focalLength={0.04} bokehScale={3} height={480} />\n              ) : <></>}",
  `{cameraMode === "cinematic" ? (
                <>
                  {quality === "high" && <DepthOfField focusDistance={0} focalLength={0.04} bokehScale={3} height={480} />}
                  <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.002, 0.002) as any} radialModulation={false} modulationOffset={0} />
                </>
              ) : <></>}`
);
fs.writeFileSync("src/engine/3d/AquaSpinEngine.tsx", engine);

let light = fs.readFileSync("src/engine/3d/LightingSystem.tsx", "utf-8");
light = light.replace(
  "<ambientLight intensity={0.4} />",
  `{/* Dynamic ambient color based on preset */}
      <ambientLight intensity={preset === "night" ? 0.2 : (preset === "sunset" ? 0.5 : 0.4)} color={preset === "sunset" ? "#ffedd6" : (preset === "night" ? "#d6e4ff" : "#ffffff")} />
      
      {/* Hemisphere light for rich GI feel */}
      <hemisphereLight skyColor={preset === "sunset" ? "#ffb347" : "#ffffff"} groundColor={preset === "night" ? "#0a0a2a" : "#444444"} intensity={0.3} />`
);
light = light.replace(
  "blur={2.5}",
  "blur={quality === \"high\" ? 4.0 : 2.5}"
);
fs.writeFileSync("src/engine/3d/LightingSystem.tsx", light);

console.log("Graphics upgraded");

