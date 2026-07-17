import { SceneManager } from './scenes/SceneManager.js';
    import { BootScene } from './scenes/BootScene.js';
    import { MapScene } from './scenes/MapScene.js';
    import { GameScene } from './scenes/GameScene.js';
    
    class App {
      constructor() {
        this.sceneManager = new SceneManager();
        this.sceneManager.add('boot', new BootScene(this));
        this.sceneManager.add('map', new MapScene(this));
        this.sceneManager.add('game', new GameScene(this));
        
        this.sceneManager.start('boot');
      }
    }
    
    window.app = new App();