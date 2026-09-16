
import fs from "fs";

const files = [
  "src/games/carrom/CarromApp.tsx",
  "src/games/candy-crunch/CandyCrunchApp.tsx"
];

for (const f of files) {
  let content = fs.readFileSync(f, "utf-8");
  
  if (!content.includes("GameShell")) {
    content = content.replace(
      "import React,",
      `import { GameShell } from "@/components/games/GameShell";\nimport { useNavigate } from "react-router-dom";\nimport { AGEA } from "@/engine/AIGameEngineArchitect";\nimport React,`
    );
    
    // Instead of exporting default function App() { ... }, wrap its return
    content = content.replace("export default function ", "export default function App_"); // wait, tricky.
    
    // Easier: Just replace the outermost return <div ...> with return <GameShell><div ...>
    // In CarromApp: return ( <div className="relative w-full h-screen...
    // In CandyCrunchApp: return ( <div className="candy-crunch-app...
    content = content.replace(/return \(\s*<div/g, `const navigate = useNavigate();\n  return (\n    <GameShell onClose={() => { AGEA.exitGameExperience(); navigate("/games"); }}>\n      <div`);
    
    // Close it
    content = content.replace(/<\/div>\s*\);\s*}\s*$/g, "      </div>\n    </GameShell>\n  );\n}\n");
    
    fs.writeFileSync(f, content);
    console.log("Fixed " + f);
  }
}

