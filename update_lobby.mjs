
import fs from "fs";

let lobby = fs.readFileSync("src/components/multiplayer/Lobby.tsx", "utf-8");

// Change setShowComingSoon to navigate
lobby = lobby.replace(
  "import { Users, Loader2 } from \x27lucide-react\x27;",
  "import { Users, Loader2 } from \x27lucide-react\x27;\nimport { useNavigate } from \x27react-router-dom\x27;"
);

lobby = lobby.replace(
  "const [showComingSoon, setShowComingSoon] = useState(false);",
  "const [showComingSoon, setShowComingSoon] = useState(false);\n  const navigate = useNavigate();"
);

lobby = lobby.replace(
  "onClick={() => setShowComingSoon(true)}",
  "onClick={() => navigate(\`/multiplayer/tictactoe/\${match.matchId}\`, { state: { match } })}"
);

fs.writeFileSync("src/components/multiplayer/Lobby.tsx", lobby);
console.log("Lobby updated.");

