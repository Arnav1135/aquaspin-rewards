import { LEVELS } from '../data/levels.js';
    export class MapScene {
      constructor(app) { this.app = app; this.id = 'map-scene'; }
      wake() {
        this.renderMap();
      }
      renderMap() {
        const scroller = document.getElementById('map-scroller');
        scroller.querySelectorAll('.level-node').forEach(e => e.remove());
        const maxLevel = parseInt(localStorage.getItem('cc_max_level') || '1', 10);
        
        LEVELS.forEach((level, i) => {
          if (i > 30) return; // limit for now
          const x = 50 + Math.sin(i * 0.5) * 30;
          const y = 3000 - 100 - i * 80;
          
          const node = document.createElement('div');
          node.className = 'level-node ' + (i + 1 <= maxLevel ? 'unlocked' : '') + (i + 1 < maxLevel ? ' passed' : '');
          node.style.left = x + '%';
          node.style.top = y + 'px';
          node.innerText = level.id;
          
          if (i + 1 <= maxLevel) {
            node.onclick = () => this.app.sceneManager.showModal('level-intro', level);
          }
          scroller.appendChild(node);
        });
        
        // Scroll to active level
        setTimeout(() => {
          const active = scroller.querySelector('.level-node.unlocked:not(.passed)') || scroller.querySelector('.level-node.unlocked');
          if (active) {
            document.getElementById('map-scene').scrollTop = active.offsetTop - window.innerHeight / 2;
          }
        }, 100);
      }
      sleep() {}
    }