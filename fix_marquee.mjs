
import fs from "fs";

let code = fs.readFileSync("src/components/ui/LiveWinnersMarquee.tsx", "utf-8");

code = code.replace(
  "const [wins, setWins] = useState<{ id: number; text: string; amount: number }[]>([]);",
  "const [wins, setWins] = useState<{ id: number; text: string; amount: number; game: string }[]>([]);"
);

fs.writeFileSync("src/components/ui/LiveWinnersMarquee.tsx", code);
console.log("Marquee TS fixed.");

