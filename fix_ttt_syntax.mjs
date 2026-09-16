
import fs from "fs";

let code = fs.readFileSync("src/games/tictactoe-online/TicTacToeOnline.tsx", "utf-8");

code = code.replace(
  "gameState.winner,\n      lastMoveTimestamp: Date.now(), opponentLeft,",
  "gameState.winner, opponentLeft,"
);

fs.writeFileSync("src/games/tictactoe-online/TicTacToeOnline.tsx", code);
console.log("Syntax fixed.");

