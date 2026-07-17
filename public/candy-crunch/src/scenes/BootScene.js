export class BootScene {
      constructor(app) { this.app = app; this.id = 'boot-scene'; }
      wake() {
        setTimeout(() => {
          const btn = document.getElementById('btn-start');
          btn.classList.remove('hidden');
          btn.onclick = () => this.app.sceneManager.start('map');
        }, 1000);
      }
      sleep() {}
    }