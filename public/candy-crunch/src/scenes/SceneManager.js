export class SceneManager {
      constructor() {
        this.scenes = {};
        this.activeScene = null;
      }
      add(name, scene) {
        this.scenes[name] = scene;
      }
      start(name, data) {
        if (this.activeScene) {
          this.activeScene.sleep();
          document.getElementById(this.activeScene.id).classList.remove('active');
        }
        this.activeScene = this.scenes[name];
        document.getElementById(this.activeScene.id).classList.add('active');
        this.activeScene.wake(data);
      }
      showModal(id, data) {
        const c = document.getElementById('modal-container');
        c.classList.remove('hidden');
        const content = document.getElementById('modal-content');
        if (id === 'settings') {
          content.innerHTML = '<h2>Settings</h2><button class="btn-primary" onclick="document.getElementById(\'modal-container\').classList.add(\'hidden\')">Close</button>';
        } else if (id === 'level-intro') {
          content.innerHTML = `<h2>${data.name}</h2><p>Target: ${data.objectives[0].target}</p><button class="btn-primary" id="btn-play-level">Play</button>`;
          setTimeout(() => {
            document.getElementById('btn-play-level').onclick = () => {
              c.classList.add('hidden');
              window.app.sceneManager.start('game', { level: data });
            };
          }, 100);
        } else if (id === 'win') {
          content.innerHTML = '<h2>Level Cleared!</h2><button class="btn-primary" onclick="document.getElementById(\'modal-container\').classList.add(\'hidden\'); window.app.sceneManager.start(\'map\');">Continue</button>';
        } else if (id === 'lose') {
          content.innerHTML = '<h2>Out of Moves!</h2><button class="btn-primary" onclick="document.getElementById(\'modal-container\').classList.add(\'hidden\'); window.app.sceneManager.start(\'map\');">Back to Map</button>';
        }
      }
    }