
import fs from "fs";
let code = fs.readFileSync("src/components/ui/LevelUpManager.tsx", "utf-8");

code = code.replace(
  "update({ level: correctLevel })",
  "update({ level: correctLevel } as any)"
);

fs.writeFileSync("src/components/ui/LevelUpManager.tsx", code);
console.log("TS fixed.");

