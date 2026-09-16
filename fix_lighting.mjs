
import fs from "fs";
let light = fs.readFileSync("src/engine/3d/LightingSystem.tsx", "utf-8");
light = light.replace("skyColor=", "color=");
fs.writeFileSync("src/engine/3d/LightingSystem.tsx", light);

