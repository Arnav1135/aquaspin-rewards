import { Project, SyntaxKind } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: "d:/Web App - Aqua Blue/tsconfig.json",
});

const files = [
  ...project.getSourceFiles("src/components/games/**/*.tsx"),
  ...project.getSourceFiles("src/components/games/**/*.ts"),
  project.getSourceFile("src/pages/MiniGames.tsx")
].filter(Boolean);

let modifiedCount = 0;

for (const sourceFile of files) {
  let modified = false;

  // 1. Remove empty onClose handlers (replace with onClose={onClose})
  sourceFile.forEachDescendant(node => {
    if (node.getKind() === SyntaxKind.JsxAttribute) {
      const attr = node;
      if (attr.getName() === "onClose") {
        const init = attr.getInitializer();
        if (init && init.getKind() === SyntaxKind.JsxExpression) {
          const expr = init.getExpression();
          if (expr && expr.getKind() === SyntaxKind.ArrowFunction) {
            const body = expr.getBody();
            if (body && body.getKind() === SyntaxKind.Block && body.getStatements().length === 0) {
              attr.replaceWithText("onClose={onClose}");
              modified = true;
            }
          }
        }
      }
    }
  });

  // 2. Cap devicePixelRatio
  sourceFile.forEachDescendant(node => {
    if (node.getKind() === SyntaxKind.CallExpression) {
      const callExpr = node;
      const expr = callExpr.getExpression();
      if (expr && expr.getKind() === SyntaxKind.PropertyAccessExpression) {
        if (expr.getName() === "setPixelRatio") {
          const args = callExpr.getArguments();
          if (args && args.length === 1 && args[0].getText().includes("devicePixelRatio") && !args[0].getText().includes("Math.min")) {
            callExpr.removeArgument(0);
            callExpr.insertArgument(0, "Math.min(window.devicePixelRatio, 2)");
            modified = true;
          }
        }
      }
    }
    
    // R3F Canvas dpr cap
    if (node.getKind() === SyntaxKind.JsxOpeningElement || node.getKind() === SyntaxKind.JsxSelfClosingElement) {
      const tagNameNode = node.getTagNameNode();
      if (tagNameNode) {
        const tagName = tagNameNode.getText();
        if (tagName === "Canvas" || tagName === "AquaSpinEngine") {
          const dprAttr = node.getAttribute("dpr");
          if (!dprAttr && tagName === "Canvas") {
            node.addAttribute({
              name: "dpr",
              initializer: "{[1, typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1]}"
            });
            modified = true;
          }
        }
      }
    }
  });

  if (modified) {
    sourceFile.saveSync();
    modifiedCount++;
  }
}

console.log(`Modified ${modifiedCount} files for onClose and dpr.`);
