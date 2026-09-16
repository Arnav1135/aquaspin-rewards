
import fs from "fs";

let app = fs.readFileSync("src/App.tsx", "utf-8");

app = app.replace(
  "const CarromApp = lazy(() => import(\x27@/games/carrom/CarromApp\x27));",
  "const CarromApp = lazy(() => import(\x27@/games/carrom/CarromApp\x27));\nconst TicTacToeOnline = lazy(() => import(\x27@/games/tictactoe-online/TicTacToeOnline\x27));"
);

app = app.replace(
  "<Route path=\"/multiplayer\" element={<ProtectedRoute><MultiplayerLobby /></ProtectedRoute>} />",
  "<Route path=\"/multiplayer\" element={<ProtectedRoute><MultiplayerLobby /></ProtectedRoute>} />\n          <Route path=\"/multiplayer/tictactoe/:matchId\" element={<ProtectedRoute><Suspense fallback={<GameFallback />}><TicTacToeOnline /></Suspense></ProtectedRoute>} />"
);

fs.writeFileSync("src/App.tsx", app);
console.log("App routed.");

