const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../src/components/games/Chess3D/App.tsx');
let content = fs.readFileSync(appPath, 'utf-8');

// Hook into game over to trigger checkmate camera
content = content.replace(
  /if \(chess\.isCheckmate\(\)\) \{/,
  `if (chess.isCheckmate()) {
        const winningColor = currentTurn === 'w' ? 'b' : 'w';
        
        // Find king position
        if (sceneRef.current) {
           const kingSquare = chess.board().reduce((acc, row, rIdx) => {
             row.forEach((p, fIdx) => {
               if (p && p.type === 'k' && p.color === currentTurn) {
                 acc = String.fromCharCode(97 + fIdx) + (8 - rIdx);
               }
             });
             return acc;
           }, '');
           
           if (kingSquare) {
             const { algebraToWorld } = require('./chess/board');
             const kingPos = algebraToWorld(kingSquare);
             // Use ts-ignore to bypass private access for cinematic effect
             // @ts-ignore
             if (sceneRef.current.cameraController && sceneRef.current.cameraController.playCheckmateSequence) {
               // @ts-ignore
               sceneRef.current.cameraController.playCheckmateSequence(winningColor, kingPos);
             }
           }
        }
  `
);

fs.writeFileSync(appPath, content);
console.log('App.tsx updated with Checkmate trigger');
