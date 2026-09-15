import { Project, SyntaxKind } from 'ts-morph';
import fs from 'fs';
import path from 'path';

const project = new Project({
  tsConfigFilePath: "d:/Web App - Aqua Blue/tsconfig.app.json",
});

const files = [
  ...project.getSourceFiles("src/components/games/**/*.tsx"),
  ...project.getSourceFiles("src/components/games/**/*.ts"),
  project.getSourceFile("src/pages/MiniGames.tsx")
].filter(Boolean);

let modifiedCount = 0;

for (const sourceFile of files) {
  let modified = false;

  // 1. Remove empty onClose handlers
  // Find onClose={() => {}} or onClose={() => { }}
  sourceFile.forEachDescendant(node => {
    if (node.getKind() === SyntaxKind.JsxAttribute) {
      if (node.getName() === "onClose") {
        const initializer = node.getInitializer();
        if (initializer && initializer.getKind() === SyntaxKind.JsxExpression) {
          const expr = initializer.getExpression();
          if (expr && expr.getKind() === SyntaxKind.ArrowFunction) {
            const body = expr.getBody();
            if (body && body.getKind() === SyntaxKind.Block && body.getStatements().length === 0) {
              node.remove();
              modified = true;
            }
          }
        }
      }
    }
  });

  // 2. Cap renderer devicePixelRatio (if using WebGLRenderer or Canvas)
  // For Canvas, find dpr={...} or inject it.
  // Actually, we can just inject it into AquaSpinEngine or Canvas if not present.
  // Let's do it manually for Canvas where it's not wrapped by AquaSpinEngine
  sourceFile.forEachDescendant(node => {
    if (node.getKind() === SyntaxKind.JsxOpeningElement || node.getKind() === SyntaxKind.JsxSelfClosingElement) {
      if (node.getTagNameNode().getText() === "Canvas") {
        const dprAttr = node.getAttribute("dpr");
        if (!dprAttr) {
          node.addAttribute({
            name: "dpr",
            initializer: "{[1, typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1]}"
          });
          modified = true;
        }
      }
    }
  });

  // 3. Memory leaks: setInterval, setTimeout, requestAnimationFrame, addEventListener
  // This is complex. For now, let's just find them and log them, or try to auto-fix.
  // Actually, we can inject a global cleanup interceptor into the game frame or similar?
  // No, the instruction says "ensure EVERY game implements rigorous `useEffect` cleanup"
  
  if (modified) {
    sourceFile.saveSync();
    modifiedCount++;
  }
}

console.log(`Modified ${modifiedCount} files.`);
