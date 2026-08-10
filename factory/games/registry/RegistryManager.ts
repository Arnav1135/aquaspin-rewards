import * as fs from 'fs';
import * as path from 'path';

export interface GameManifest {
  id: string;
  name: string;
  version: string;
  status: 'development' | 'production';
  assets: string[];
}

export class RegistryManager {
  private registryPath: string;

  constructor(registryPath: string = path.join(process.cwd(), 'factory', 'games', 'registry', 'games.json')) {
    this.registryPath = registryPath;
  }

  /**
   * Registers a newly generated game into the central factory registry.
   */
  public registerGame(manifest: GameManifest): void {
    console.log(`[RegistryManager] Registering game: ${manifest.id}`);
    let games: GameManifest[] = [];
    
    if (fs.existsSync(this.registryPath)) {
      const data = fs.readFileSync(this.registryPath, 'utf-8');
      games = JSON.parse(data);
    } else {
      fs.mkdirSync(path.dirname(this.registryPath), { recursive: true });
    }

    const existingIndex = games.findIndex(g => g.id === manifest.id);
    if (existingIndex >= 0) {
      games[existingIndex] = manifest;
    } else {
      games.push(manifest);
    }

    fs.writeFileSync(this.registryPath, JSON.stringify(games, null, 2));
    console.log(`[RegistryManager] Game registered successfully.`);
  }

  public getGame(id: string): GameManifest | undefined {
    if (!fs.existsSync(this.registryPath)) return undefined;
    const data = fs.readFileSync(this.registryPath, 'utf-8');
    const games: GameManifest[] = JSON.parse(data);
    return games.find(g => g.id === id);
  }
}
