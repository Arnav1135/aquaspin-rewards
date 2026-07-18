document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('.grid');
  const levelDisplay = document.getElementById('level-val');
  const scoreDisplay = document.getElementById('score-val');
  const targetDisplay = document.getElementById('target-val');
  const movesDisplay = document.getElementById('moves-val');
  const objectiveText = document.getElementById('objective-text');

  // Modals
  const modal = document.getElementById('level-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const modalBtn = document.getElementById('modal-btn');

  // Game Settings & State
  let level = 1;
  let score = 0;
  let targetScore = 1500;
  let moves = 25;
  let width = 8;
  let cells = []; // 1D array representing the board
  let isChecking = false;
  let candiesColors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
  
  // Drag state
  let dragStartCell = null;
  let dragEndCell = null;

  // Level Definition & Dynamic Generation
  function loadLevel(levelNum) {
    score = 0;
    scoreDisplay.innerHTML = score;
    levelDisplay.innerHTML = levelNum;

    // Scale grid size and targets with level
    if (levelNum === 1) {
      width = 7;
      targetScore = 1000;
      moves = 25;
    } else if (levelNum === 2) {
      width = 8;
      targetScore = 2000;
      moves = 28;
    } else if (levelNum <= 5) {
      width = 8;
      targetScore = 1500 + levelNum * 500;
      moves = Math.max(15, 30 - levelNum);
    } else if (levelNum <= 10) {
      width = 9;
      targetScore = 3000 + levelNum * 800;
      moves = Math.max(15, 35 - levelNum);
    } else {
      width = 10;
      targetScore = 8000 + levelNum * 1000;
      moves = Math.max(12, 40 - Math.floor(levelNum / 1.5));
    }

    targetDisplay.innerHTML = targetScore;
    movesDisplay.innerHTML = moves;
    grid.style.setProperty('--grid-size', width);

    // Set Objective text
    let hasJellyObjective = levelNum >= 2;
    if (hasJellyObjective) {
      objectiveText.innerHTML = "CLEAR ALL JELLY!";
    } else {
      objectiveText.innerHTML = "REACH THE TARGET!";
    }

    // Build the grid structure
    buildBoardGrid(hasJellyObjective);
  }

  // Build Board DOM & data structure
  function buildBoardGrid(hasJelly) {
    grid.innerHTML = '';
    cells = [];

    const cellSize = 540 / width;

    for (let i = 0; i < width * width; i++) {
      const cell = document.createElement('div');
      cell.classList.add('grid-item');
      cell.setAttribute('id', i);
      
      const col = i % width;
      const row = Math.floor(i / width);
      cell.style.left = (col * cellSize) + 'px';
      cell.style.top = (row * cellSize) + 'px';

      // 1. Spawning Jelly Underlay
      let isJelly = false;
      if (hasJelly) {
        // Spawn jelly in central regions or randomly
        if (col >= 1 && col < width - 1 && row >= 1 && row < width - 1) {
          isJelly = true;
          const jelly = document.createElement('div');
          jelly.classList.add('jelly-underlay');
          cell.appendChild(jelly);
        }
      }

      // 2. Spawn Candies or Blockers
      const candyContainer = document.createElement('div');
      candyContainer.classList.add('candy');
      cell.appendChild(candyContainer);

      // Determine contents: blocker or normal candy
      let cellType = 'normal'; // normal, blocker-frosting, blocker-chocolate, blocker-licorice
      let blockerStrength = 0;
      let candyColor = '';
      let candyType = 'normal'; // normal, striped-h, striped-v, wrapped, color-bomb, fish, bomb-timer
      let bombCountdown = 9;

      // Spawn Blockers based on level difficulty
      let spawnFrosting = level >= 3 && Math.random() < 0.15 && (row === Math.floor(width/2) || row === Math.floor(width/2) - 1);
      let spawnChocolate = level >= 4 && Math.random() < 0.1 && (row === width - 1 || row === width - 2);
      let spawnLicorice = level >= 5 && Math.random() < 0.12 && (col === 0 || col === width - 1);
      let spawnBomb = level >= 6 && Math.random() < 0.05;

      if (spawnFrosting) {
        cellType = 'blocker-frosting';
        blockerStrength = Math.random() < 0.5 ? 1 : 2; // 1-hit or 2-hit frosting
      } else if (spawnChocolate) {
        cellType = 'blocker-chocolate';
        blockerStrength = 1;
      } else if (spawnLicorice) {
        cellType = 'blocker-licorice';
        blockerStrength = 1;
      } else {
        // Random normal color
        candyColor = candiesColors[Math.floor(Math.random() * candiesColors.length)];
        if (spawnBomb) {
          candyType = 'bomb-timer';
          bombCountdown = 9;
        }
      }

      const cellData = {
        element: cell,
        candyContainer: candyContainer,
        index: i,
        col: col,
        row: row,
        isJelly: isJelly,
        cellType: cellType,
        blockerStrength: blockerStrength,
        candyColor: candyColor,
        candyType: candyType,
        bombCountdown: bombCountdown
      };

      // Set initial graphics
      renderCellGraphics(cellData);

      // Drag and Drop listeners
      cell.setAttribute('draggable', cellType === 'normal');
      cell.addEventListener('dragstart', dragStart);
      cell.addEventListener('dragover', dragOver);
      cell.addEventListener('drop', dragDrop);
      
      // Touch listeners for Mobile support
      cell.addEventListener('touchstart', touchStart, { passive: false });
      cell.addEventListener('touchmove', touchMove, { passive: false });
      cell.addEventListener('touchend', touchEnd, { passive: false });

      grid.appendChild(cell);
      cells.push(cellData);
    }

    // Clean initial matches immediately so board starts playable without existing matches
    resolveInitialMatches();
  }

  // Vector graphics generators for 4D realistic shapes matching prompt image
  function getSVGContent(color, type, strengthOrTimer = 0) {
    let fill = '';
    let defs = '';
    
    // Set 3D Radial Gradients based on color
    if (color === 'red') {
      fill = 'url(#r-bean)';
      defs = `<radialGradient id='r-bean' cx='35%25' cy='30%25' r='65%25'><stop offset='0%25' stop-color='%23ff9999'/><stop offset='30%25' stop-color='%23ff0000'/><stop offset='75%25' stop-color='%23990000'/><stop offset='100%25' stop-color='%234a0000'/></radialGradient>`;
    } else if (color === 'orange') {
      fill = 'url(#o-loz)';
      defs = `<radialGradient id='o-loz' cx='35%25' cy='30%25' r='65%25'><stop offset='0%25' stop-color='%23ffe5a3'/><stop offset='30%25' stop-color='%23ff7b00'/><stop offset='75%25' stop-color='%23cc4400'/><stop offset='100%25' stop-color='%23591100'/></radialGradient>`;
    } else if (color === 'yellow') {
      fill = 'url(#y-drop)';
      defs = `<radialGradient id='y-drop' cx='40%25' cy='50%25' r='55%25'><stop offset='0%25' stop-color='%23fffa96'/><stop offset='45%25' stop-color='%23ffcc00'/><stop offset='85%25' stop-color='%23cc9300'/><stop offset='100%25' stop-color='%23664400'/></radialGradient>`;
    } else if (color === 'green') {
      fill = 'url(#g-cube)';
      defs = `<radialGradient id='g-cube' cx='35%25' cy='30%25' r='65%25'><stop offset='0%25' stop-color='%23a8ffd3'/><stop offset='30%25' stop-color='%2300c853'/><stop offset='75%25' stop-color='%23007b22'/><stop offset='100%25' stop-color='%23003300'/></radialGradient>`;
    } else if (color === 'blue') {
      fill = 'url(#b-sph)';
      defs = `<radialGradient id='b-sph' cx='35%25' cy='30%25' r='65%25'><stop offset='0%25' stop-color='%2390e0ef'/><stop offset='30%25' stop-color='%230096c7'/><stop offset='75%25' stop-color='%2303045e'/><stop offset='100%25' stop-color='%23020224'/></radialGradient>`;
    } else if (color === 'purple') {
      fill = 'url(#p-flo)';
      defs = `<radialGradient id='p-flo' cx='35%25' cy='30%25' r='65%25'><stop offset='0%25' stop-color='%23f3d8ff'/><stop offset='30%25' stop-color='%23b5179e'/><stop offset='75%25' stop-color='%237209b7'/><stop offset='100%25' stop-color='%233f0071'/></radialGradient>`;
    }

    let innerContent = '';

    // Draw normal, striped, wrapped shapes exactly like image
    if (type === 'normal') {
      if (color === 'red') {
        innerContent = `<path d='M 28,30 C 12,42 16,74 44,76 C 68,78 82,58 74,38 C 66,18 44,18 28,30 Z' fill='${fill}'/><path d='M 33,35 C 24,42 26,56 36,54 C 31,48 31,42 34,37 C 35,35 34,35 33,35 Z' fill='%23ffffff' opacity='0.75'/><ellipse cx='64' cy='46' rx='3' ry='5' fill='%23ffffff' opacity='0.4' transform='rotate(30 64 46)'/>`;
      } else if (color === 'orange') {
        innerContent = `<rect x='25' y='15' width='50' height='70' rx='25' fill='${fill}'/><path d='M 35,25 Q 32,45 35,65 Q 40,65 38,45 Q 40,25 35,25 Z' fill='%23ffffff' opacity='0.5'/><ellipse cx='42' cy='28' rx='4' ry='8' fill='%23ffffff' opacity='0.6' transform='rotate(-10 42 28)'/>`;
      } else if (color === 'yellow') {
        innerContent = `<path d='M 50,15 C 28,48 20,64 20,72 C 20,84 32,90 50,90 C 68,90 80,84 80,72 C 80,64 72,48 50,15 Z' fill='%23e5a900'/><path d='M 50,22 C 32,51 25,66 25,72 C 25,81 35,85 50,85 C 65,85 75,81 75,72 C 75,66 68,51 50,22 Z' fill='${fill}'/><path d='M 45,35 C 38,48 35,62 38,72 C 40,72 38,58 45,45 Z' fill='%23ffffff' opacity='0.6'/>`;
      } else if (color === 'green') {
        innerContent = `<rect x='20' y='20' width='60' height='60' rx='16' fill='${fill}'/><path d='M 24,24 L 76,24 Q 76,28 72,28 L 28,28 Q 24,28 24,24 Z' fill='%23ffffff' opacity='0.5'/><rect x='26' y='32' width='8' height='36' rx='4' fill='%23ffffff' opacity='0.4'/>`;
      } else if (color === 'blue') {
        innerContent = `<circle cx='50' cy='50' r='38' fill='${fill}'/><path d='M 13,50 C 25,62 75,62 87,50 C 75,56 25,56 13,50 Z' fill='%2300b4d8' stroke='%2390e0ef' stroke-width='2'/><path d='M 13,50 C 25,58 75,58 87,50 Q 87,52 87,50' fill='none' stroke='%230077b6' stroke-width='3' opacity='0.6'/><circle cx='40' cy='38' r='10' fill='%23ffffff' opacity='0.5'/>`;
      } else if (color === 'purple') {
        innerContent = `<g fill='${fill}'><circle cx='50' cy='50' r='24'/><circle cx='50' cy='28' r='14'/><circle cx='69' cy='39' r='14'/><circle cx='69' cy='61' r='14'/><circle cx='50' cy='72' r='14'/><circle cx='31' cy='61' r='14'/><circle cx='31' cy='39' r='14'/></g><circle cx='50' cy='50' r='12' fill='none' stroke='%23f3d8ff' stroke-width='2' stroke-dasharray='4,4' opacity='0.5'/><circle cx='50' cy='50' r='6' fill='none' stroke='%23ffffff' stroke-width='1.5' opacity='0.4'/><circle cx='50' cy='24' r='4' fill='%23ffffff' opacity='0.4'/><circle cx='65' cy='35' r='4' fill='%23ffffff' opacity='0.4'/>`;
      }
    } else if (type === 'striped-h') {
      // Horizontal stripes overlayed
      innerContent = getSVGContent(color, 'normal') + `
        <g stroke='%23ffffff' stroke-width='5' opacity='0.85'>
          <line x1='15' y1='35' x2='85' y2='35'/>
          <line x1='10' y1='50' x2='90' y2='50'/>
          <line x1='15' y1='65' x2='85' y2='65'/>
        </g>
      `;
    } else if (type === 'striped-v') {
      // Vertical stripes overlayed
      innerContent = getSVGContent(color, 'normal') + `
        <g stroke='%23ffffff' stroke-width='5' opacity='0.85'>
          <line x1='35' y1='15' x2='35' y2='85'/>
          <line x1='50' y1='10' x2='50' y2='90'/>
          <line x1='65' y1='15' x2='65' y2='85'/>
        </g>
      `;
    } else if (type === 'wrapped') {
      // Rotated diamond transparent wrapper twisted on sides
      innerContent = `
        <g opacity='0.8'>
          <rect x='18' y='18' width='64' height='64' rx='10' fill='rgba(255,255,255,0.15)' stroke='%23ffffff' stroke-width='2.5' transform='rotate(45 50 50)'/>
          <polygon points='8,50 20,40 20,60' fill='rgba(255,255,255,0.35)' stroke='%23ffffff'/>
          <polygon points='92,50 80,40 80,60' fill='rgba(255,255,255,0.35)' stroke='%23ffffff'/>
        </g>
      ` + getSVGContent(color, 'normal');
    } else if (type === 'color-bomb') {
      // Chocolate disco ball covered in colorful sprinkles
      innerContent = `
        <defs>
          <radialGradient id='choc' cx='35%25' cy='30%25' r='65%25'><stop offset='0%25' stop-color='%236f4e37'/><stop offset='60%25' stop-color='%233d2314'/><stop offset='100%25' stop-color='%231f1008'/></radialGradient>
        </defs>
        <circle cx='50' cy='50' r='42' fill='url(%23choc)'/>
        <!-- Multi-colored sprinkles (capsules) -->
        <rect x='35' y='28' width='10' height='5' rx='2.5' fill='%23ff0055' transform='rotate(25 35 28)'/>
        <rect x='58' y='30' width='10' height='5' rx='2.5' fill='%2300ffcc' transform='rotate(-40 58 30)'/>
        <rect x='28' y='52' width='10' height='5' rx='2.5' fill='%23ffff00' transform='rotate(60 28 52)'/>
        <rect x='48' y='46' width='10' height='5' rx='2.5' fill='%23ff7700' transform='rotate(-10 48 46)'/>
        <rect x='64' y='58' width='10' height='5' rx='2.5' fill='%23b5179e' transform='rotate(45 64 58)'/>
        <rect x='46' y='68' width='10' height='5' rx='2.5' fill='%230096c7' transform='rotate(-30 46 68)'/>
        <rect x='30' y='38' width='10' height='5' rx='2.5' fill='%23ffffff' transform='rotate(80 30 38)'/>
      `;
    } else if (type === 'fish') {
      // Swedish Fish shape matching color
      innerContent = `<path d='M 15,50 C 25,35 45,35 65,42 L 82,30 L 76,50 L 82,70 L 65,58 C 45,65 25,65 15,50 Z' fill='${fill}'/><circle cx='28' cy='46' r='3' fill='%23ffffff' opacity='0.7'/>`;
    } else if (type === 'bomb-timer') {
      innerContent = getSVGContent(color, 'normal') + `
        <!-- Candy Bomb Countdown timer overlay -->
        <circle cx='50' cy='50' r='18' fill='%232b1a38' stroke='%23ffffff' stroke-width='2'/>
        <text x='50' y='56' font-size='16' font-weight='900' fill='%23ff0055' text-anchor='middle'>${strengthOrTimer}</text>
      `;
    }

    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>${defs}${innerContent}</svg>`;
  }

  // Draw Blockers (Frosting, Chocolate, Licorice, Cake-Bomb, Magic-Mixer)
  function getBlockerSVG(type, strength) {
    if (type === 'blocker-frosting') {
      // Whipped icing block
      let fill = strength === 2 ? '%23e0f7fa' : '%23ffffff';
      let stroke = strength === 2 ? '%2300acc1' : '%23ffb74d';
      return `<svg viewBox='0 0 100 100'><rect x='10' y='10' width='80' height='80' rx='12' fill='${fill}' stroke='${stroke}' stroke-width='5'/><path d='M 25,50 Q 50,15 75,50 Q 50,85 25,50 Z' fill='rgba(255,255,255,0.7)'/><circle cx='50' cy='50' r='8' fill='%23e91e63'/></svg>`;
    } else if (type === 'blocker-chocolate') {
      // Segmented dark chocolate bar block
      return `<svg viewBox='0 0 100 100'><rect x='10' y='10' width='80' height='80' rx='8' fill='%234e2f1d' stroke='%2327140b' stroke-width='4'/><rect x='18' y='18' width='30' height='30' rx='3' fill='%235d3a24'/><rect x='52' y='18' width='30' height='30' rx='3' fill='%235d3a24'/><rect x='18' y='52' width='30' height='30' rx='3' fill='%235d3a24'/><rect x='52' y='52' width='30' height='30' rx='3' fill='%235d3a24'/></svg>`;
    } else if (type === 'blocker-licorice') {
      // Black twisted licorice swirl
      return `<svg viewBox='0 0 100 100'><rect x='10' y='10' width='80' height='80' rx='10' fill='rgba(0,0,0,0.1)'/><circle cx='50' cy='50' r='38' fill='%231a1a1a' stroke='%23000000' stroke-width='4'/><circle cx='50' cy='50' r='28' fill='none' stroke='%23333333' stroke-width='4'/><circle cx='50' cy='50' r='18' fill='none' stroke='%234d4d4d' stroke-width='4'/><circle cx='50' cy='50' r='8' fill='%231a1a1a'/></svg>`;
    }
    return '';
  }

  // Renders the specific SVG graphics based on cell state
  function renderCellGraphics(cell) {
    if (cell.cellType === 'normal') {
      cell.candyContainer.innerHTML = getSVGContent(cell.candyColor, cell.candyType, cell.bombCountdown);
      cell.element.setAttribute('draggable', true);
    } else {
      cell.candyContainer.innerHTML = getBlockerSVG(cell.cellType, cell.blockerStrength);
      cell.element.setAttribute('draggable', false);
    }
  }

  // Swap animations using coordinates & FLIP transitions
  function animateSwap(cellA, cellB, onComplete) {
    const cellSize = 540 / width;
    const aLeft = cellA.col * cellSize;
    const aTop = cellA.row * cellSize;
    const bLeft = cellB.col * cellSize;
    const bTop = cellB.row * cellSize;

    // Swap position styling immediately
    cellA.element.style.left = bLeft + 'px';
    cellA.element.style.top = bTop + 'px';
    cellB.element.style.left = aLeft + 'px';
    cellB.element.style.top = aTop + 'px';

    setTimeout(() => {
      // Swap properties in data structure
      const tempColor = cellA.candyColor;
      const tempType = cellA.candyType;
      const tempCellType = cellA.cellType;
      const tempStrength = cellA.blockerStrength;
      const tempCountdown = cellA.bombCountdown;

      cellA.candyColor = cellB.candyColor;
      cellA.candyType = cellB.candyType;
      cellA.cellType = cellB.cellType;
      cellA.blockerStrength = cellB.blockerStrength;
      cellA.bombCountdown = cellB.bombCountdown;

      cellB.candyColor = tempColor;
      cellB.candyType = tempType;
      cellB.cellType = tempCellType;
      cellB.blockerStrength = tempStrength;
      cellB.bombCountdown = tempCountdown;

      // Re-render styles and reset absolute positions to match correct coordinates
      cellA.element.style.left = aLeft + 'px';
      cellA.element.style.top = aTop + 'px';
      cellB.element.style.left = bLeft + 'px';
      cellB.element.style.top = bTop + 'px';

      renderCellGraphics(cellA);
      renderCellGraphics(cellB);

      onComplete();
    }, 220);
  }

  // Clean initial matches so player doesn't start with automatic clearing
  function resolveInitialMatches() {
    let hasMatches = true;
    while (hasMatches) {
      hasMatches = false;
      const matches = findMatchesOnBoard();
      if (matches.length > 0) {
        hasMatches = true;
        matches.forEach(m => {
          m.indices.forEach(index => {
            if (cells[index].cellType === 'normal') {
              // Swap to a random other color to break the match
              cells[index].candyColor = candiesColors[Math.floor(Math.random() * candiesColors.length)];
              renderCellGraphics(cells[index]);
            }
          });
        });
      }
    }
  }

  // --- Swapping Logic & Special Combo handling ---

  function swap(id1, id2) {
    if (isChecking) return;
    isChecking = true;

    const cell1 = cells[id1];
    const cell2 = cells[id2];

    // Check special combo first before making regular swap validation
    if (checkSpecialCombo(cell1, cell2)) {
      moves--;
      movesDisplay.innerHTML = moves;
      isChecking = false;
      return;
    }

    animateSwap(cell1, cell2, () => {
      // Validate match
      const matches = findMatchesOnBoard();
      if (matches.length > 0) {
        // Successful Move!
        moves--;
        movesDisplay.innerHTML = moves;
        decrementBombs();
        handleCascades();
      } else {
        // Revert Swap
        animateSwap(cell1, cell2, () => {
          isChecking = false;
        });
      }
    });
  }

  // Handles Special Candy Combinations (Striped+Striped, Wrapped+Wrapped, ColorBomb+Stripe, etc.)
  function checkSpecialCombo(cell1, cell2) {
    const t1 = cell1.candyType;
    const t2 = cell2.candyType;

    if (t1 === 'normal' && t2 === 'normal') return false;

    // Both must be normal/special candies (no blockers)
    if (cell1.cellType !== 'normal' || cell2.cellType !== 'normal') return false;

    // Color Bomb + Color Bomb
    if (t1 === 'color-bomb' && t2 === 'color-bomb') {
      triggerColorBombCombo(cell1, cell2, 'all');
      return true;
    }
    // Color Bomb + Striped
    if ((t1 === 'color-bomb' && (t2 === 'striped-h' || t2 === 'striped-v')) ||
        (t2 === 'color-bomb' && (t1 === 'striped-h' || t1 === 'striped-v'))) {
      const stripeCell = t1 === 'color-bomb' ? cell2 : cell1;
      const bombCell = t1 === 'color-bomb' ? cell1 : cell2;
      triggerColorBombCombo(bombCell, stripeCell, 'striped');
      return true;
    }
    // Color Bomb + Wrapped
    if ((t1 === 'color-bomb' && t2 === 'wrapped') || (t2 === 'color-bomb' && t1 === 'wrapped')) {
      const wrapCell = t1 === 'color-bomb' ? cell2 : cell1;
      const bombCell = t1 === 'color-bomb' ? cell1 : cell2;
      triggerColorBombCombo(bombCell, wrapCell, 'wrapped');
      return true;
    }
    // Color Bomb + Normal
    if (t1 === 'color-bomb' || t2 === 'color-bomb') {
      const bombCell = t1 === 'color-bomb' ? cell1 : cell2;
      const normalCell = t1 === 'color-bomb' ? cell2 : cell1;
      triggerColorBombCombo(bombCell, normalCell, 'normal');
      return true;
    }
    // Striped + Striped
    if ((t1 === 'striped-h' || t1 === 'striped-v') && (t2 === 'striped-h' || t2 === 'striped-v')) {
      triggerStripedStripedCombo(cell1, cell2);
      return true;
    }
    // Wrapped + Wrapped
    if (t1 === 'wrapped' && t2 === 'wrapped') {
      triggerWrappedWrappedCombo(cell1, cell2);
      return true;
    }
    // Striped + Wrapped
    if (((t1 === 'striped-h' || t1 === 'striped-v') && t2 === 'wrapped') ||
        (t2 === 'striped-h' || t2 === 'striped-v') && t1 === 'wrapped') {
      triggerStripedWrappedCombo(cell1, cell2);
      return true;
    }
    // Fish combos
    if (t1 === 'fish' || t2 === 'fish') {
      triggerFishCombo(cell1, cell2);
      return true;
    }

    return false;
  }

  // --- Combinations Activation functions ---

  function triggerColorBombCombo(bomb, target, mode) {
    // Clear the bomb cell itself
    clearCell(bomb);

    const targetColor = target.candyColor;

    if (mode === 'all') {
      // Clear board entirely
      cells.forEach(c => {
        if (c.cellType === 'normal') clearCell(c);
      });
    } else if (mode === 'striped') {
      // Transform all candies of color to striped and trigger
      cells.forEach(c => {
        if (c.cellType === 'normal' && c.candyColor === targetColor) {
          c.candyType = Math.random() < 0.5 ? 'striped-h' : 'striped-v';
          renderCellGraphics(c);
          setTimeout(() => triggerSpecialCandy(c), 150);
        }
      });
    } else if (mode === 'wrapped') {
      // Transform all of color to wrapped and trigger
      cells.forEach(c => {
        if (c.cellType === 'normal' && c.candyColor === targetColor) {
          c.candyType = 'wrapped';
          renderCellGraphics(c);
          setTimeout(() => triggerSpecialCandy(c), 150);
        }
      });
    } else {
      // Clear all candies of color
      cells.forEach(c => {
        if (c.cellType === 'normal' && c.candyColor === targetColor) {
          clearCell(c);
        }
      });
    }

    setTimeout(handleCascades, 300);
  }

  function triggerStripedStripedCombo(c1, c2) {
    const actIdx = c2.index;
    clearCell(c1);
    clearCell(c2);
    // Clear full row and full column crossing at the activation point
    clearRow(Math.floor(actIdx / width));
    clearColumn(actIdx % width);

    setTimeout(handleCascades, 300);
  }

  function triggerWrappedWrappedCombo(c1, c2) {
    const idx = c2.index;
    clearCell(c1);
    clearCell(c2);
    // Massive 5x5 double blast
    explodeArea(idx, 2);
    setTimeout(() => {
      explodeArea(idx, 2);
      setTimeout(handleCascades, 300);
    }, 250);
  }

  function triggerStripedWrappedCombo(c1, c2) {
    const actIdx = c2.index;
    clearCell(c1);
    clearCell(c2);
    const row = Math.floor(actIdx / width);
    const col = actIdx % width;

    // Clears 3 horizontal and 3 vertical lines centered around target
    for (let r = row - 1; r <= row + 1; r++) {
      if (r >= 0 && r < width) clearRow(r);
    }
    for (let c = col - 1; c <= col + 1; c++) {
      if (c >= 0 && c < width) clearColumn(c);
    }

    setTimeout(handleCascades, 300);
  }

  function triggerFishCombo(c1, c2) {
    const other = c1.candyType === 'fish' ? c2 : c1;
    const fish = c1.candyType === 'fish' ? c1 : c2;

    clearCell(fish);
    clearCell(other);

    // Swedish fish swims to target
    spawnSwedishFish(other.candyType);
    setTimeout(handleCascades, 350);
  }

  // --- Cascade / Loop Resolvers ---

  function handleCascades() {
    const matches = findMatchesOnBoard();
    if (matches.length > 0) {
      // Clear matched cells and spawn special items
      clearMatches(matches);
      setTimeout(() => {
        applyGravity();
        setTimeout(handleCascades, 250);
      }, 250);
    } else {
      isChecking = false;
      checkGameStatus();
    }
  }

  // Decrement Countdown Candy Bombs
  function decrementBombs() {
    cells.forEach(c => {
      if (c.candyType === 'bomb-timer' && c.cellType === 'normal') {
        c.bombCountdown--;
        renderCellGraphics(c);
        if (c.bombCountdown <= 0) {
          triggerGameOver("A candy bomb reached zero!");
        }
      }
    });
  }

  // --- Match Detection Engines (Match 3, 4, 5, and T/L shapes) ---

  function findMatchesOnBoard() {
    const matches = [];
    const matchedIndices = new Set();

    // 1. Horizontal Matches
    for (let r = 0; r < width; r++) {
      let matchCount = 1;
      let matchColor = '';
      let startIndex = 0;

      for (let c = 0; c < width; c++) {
        const idx = r * width + c;
        const cell = cells[idx];
        const color = cell.cellType === 'normal' ? cell.candyColor : '';

        if (color && color === matchColor) {
          matchCount++;
        } else {
          if (matchCount >= 3) {
            const indices = [];
            for (let i = 0; i < matchCount; i++) {
              indices.push(startIndex + i);
            }
            matches.push({ dir: 'h', indices, color: matchColor });
          }
          matchCount = 1;
          matchColor = color;
          startIndex = idx;
        }
      }
      if (matchCount >= 3) {
        const indices = [];
        for (let i = 0; i < matchCount; i++) {
          indices.push(startIndex + i);
        }
        matches.push({ dir: 'h', indices, color: matchColor });
      }
    }

    // 2. Vertical Matches
    for (let c = 0; c < width; c++) {
      let matchCount = 1;
      let matchColor = '';
      let startIndex = 0;

      for (let r = 0; r < width; r++) {
        const idx = r * width + c;
        const cell = cells[idx];
        const color = cell.cellType === 'normal' ? cell.candyColor : '';

        if (color && color === matchColor) {
          matchCount++;
        } else {
          if (matchCount >= 3) {
            const indices = [];
            for (let i = 0; i < matchCount; i++) {
              indices.push(startIndex + i * width);
            }
            matches.push({ dir: 'v', indices, color: matchColor });
          }
          matchCount = 1;
          matchColor = color;
          startIndex = idx;
        }
      }
      if (matchCount >= 3) {
        const indices = [];
        for (let i = 0; i < matchCount; i++) {
          indices.push(startIndex + i * width);
        }
        matches.push({ dir: 'v', indices, color: matchColor });
      }
    }

    return matches;
  }

  // Clear matched cells, spawn Striped, Wrapped, or Color Bombs
  function clearMatches(matches) {
    const indicesToClear = new Set();
    const specialsToCreate = []; // { index, type, color }

    matches.forEach(m => {
      const len = m.indices.length;
      
      // Determine central target square for special candy spawn
      const spawnIndex = m.indices[Math.floor(len / 2)];

      if (len === 5) {
        // Straight line of 5 -> Color Bomb
        specialsToCreate.push({ index: spawnIndex, type: 'color-bomb', color: 'any' });
      } else if (len === 4) {
        // Line of 4 -> Striped
        const type = m.dir === 'h' ? 'striped-v' : 'striped-h';
        specialsToCreate.push({ index: spawnIndex, type, color: m.color });
      }

      m.indices.forEach(idx => indicesToClear.add(idx));
    });

    // Check for L or T shape matches (intersection of horizontal and vertical matches)
    const hMatches = matches.filter(m => m.dir === 'h');
    const vMatches = matches.filter(m => m.dir === 'v');

    hMatches.forEach(hm => {
      vMatches.forEach(vm => {
        if (hm.color === vm.color) {
          const intersection = hm.indices.filter(x => vm.indices.includes(x));
          if (intersection.length > 0) {
            // L or T shape intersection -> Wrapped Candy
            const spawnIndex = intersection[0];
            specialsToCreate.push({ index: spawnIndex, type: 'wrapped', color: hm.color });
          }
        }
      });
    });

    // Execute clears
    indicesToClear.forEach(idx => {
      const cell = cells[idx];
      // Increment score based on match size
      score += 100;
      scoreDisplay.innerHTML = score;

      clearCell(cell);
    });

    // Spawn special candies
    specialsToCreate.forEach(s => {
      const cell = cells[s.index];
      cell.cellType = 'normal';
      cell.candyType = s.type;
      cell.candyColor = s.color === 'any' ? '' : s.color;
      cell.element.classList.remove('matched');
      renderCellGraphics(cell);
    });
  }

  // Clears a single cell, activating specials and damage blockers
  function clearCell(cell) {
    if (!cell) return;

    // 1. Damage blockers if cell is blocker
    if (cell.cellType.startsWith('blocker-')) {
      damageBlocker(cell);
      return;
    }

    // 2. Clear jelly
    if (cell.isJelly) {
      cell.isJelly = false;
      const jelly = cell.element.querySelector('.jelly-underlay');
      if (jelly) jelly.remove();
      score += 200;
      scoreDisplay.innerHTML = score;
    }

    // Trigger special candy effects before clearing
    const type = cell.candyType;
    cell.candyType = 'normal'; // reset

    if (type === 'striped-h') {
      clearRow(cell.row);
    } else if (type === 'striped-v') {
      clearColumn(cell.col);
    } else if (type === 'wrapped') {
      explodeArea(cell.index, 1);
    }

    // Set element matched visual
    cell.element.classList.add('matched');
    
    // Damage adjacent blockers
    damageAdjacentBlockers(cell.index);
  }

  // Damage adjacent blockers (Frosting, Chocolate, Licorice)
  function damageAdjacentBlockers(index) {
    const row = Math.floor(index / width);
    const col = index % width;

    const adjacents = [
      { r: row - 1, c: col },
      { r: row + 1, c: col },
      { r: row, c: col - 1 },
      { r: row, c: col + 1 }
    ];

    adjacents.forEach(adj => {
      if (adj.r >= 0 && adj.r < width && adj.c >= 0 && adj.c < width) {
        const neighbor = cells[adj.r * width + adj.c];
        if (neighbor.cellType.startsWith('blocker-')) {
          damageBlocker(neighbor);
        }
      }
    });
  }

  function damageBlocker(cell) {
    cell.blockerStrength--;
    score += 150;
    scoreDisplay.innerHTML = score;
    if (cell.blockerStrength <= 0) {
      cell.cellType = 'normal';
      cell.candyColor = candiesColors[Math.floor(Math.random() * candiesColors.length)];
      cell.candyType = 'normal';
      renderCellGraphics(cell);
    } else {
      renderCellGraphics(cell);
    }
  }

  // --- Special Candy Action Resolvers ---

  function clearRow(row) {
    for (let c = 0; c < width; c++) {
      const cell = cells[row * width + c];
      if (cell && !cell.element.classList.contains('matched')) {
        clearCell(cell);
      }
    }
  }

  function clearColumn(col) {
    for (let r = 0; r < width; r++) {
      const cell = cells[r * width + col];
      if (cell && !cell.element.classList.contains('matched')) {
        clearCell(cell);
      }
    }
  }

  function explodeArea(index, radius) {
    const row = Math.floor(index / width);
    const col = index % width;

    for (let r = row - radius; r <= row + radius; r++) {
      for (let c = col - radius; c <= col + radius; c++) {
        if (r >= 0 && r < width && c >= 0 && c < width) {
          const cell = cells[r * width + c];
          if (cell && !cell.element.classList.contains('matched')) {
            clearCell(cell);
          }
        }
      }
    }
  }

  function triggerSpecialCandy(cell) {
    clearCell(cell);
  }

  // Swedish fish swims to target objectives (Jelly, Blockers, or random)
  function spawnSwedishFish(fishComboType) {
    let target = findSwedishFishTarget();
    if (target) {
      // Simulate swim wait, then hit objective
      setTimeout(() => {
        if (fishComboType === 'striped-h' || fishComboType === 'striped-v') {
          target.candyType = 'striped-h';
          renderCellGraphics(target);
          triggerSpecialCandy(target);
        } else if (fishComboType === 'wrapped') {
          target.candyType = 'wrapped';
          renderCellGraphics(target);
          triggerSpecialCandy(target);
        } else {
          clearCell(target);
        }
      }, 300);
    }
  }

  function findSwedishFishTarget() {
    // Priority 1: Jelly
    let jellies = cells.filter(c => c.isJelly && c.cellType === 'normal');
    if (jellies.length > 0) return jellies[Math.floor(Math.random() * jellies.length)];

    // Priority 2: Blockers
    let blockers = cells.filter(c => c.cellType.startsWith('blocker-'));
    if (blockers.length > 0) return blockers[Math.floor(Math.random() * blockers.length)];

    // Priority 3: Random Candy
    let normals = cells.filter(c => c.cellType === 'normal');
    if (normals.length > 0) return normals[Math.floor(Math.random() * normals.length)];

    return null;
  }

  // --- Gravity / Falling Cascade system ---

  function applyGravity() {
    const cellSize = 540 / width;

    // Start scanning column-wise from bottom row upward
    for (let c = 0; c < width; c++) {
      let emptySlots = 0;
      for (let r = width - 1; r >= 0; r--) {
        const idx = r * width + c;
        const cell = cells[idx];

        // Skip blockers, they remain fixed unless cleared
        if (cell.cellType.startsWith('blocker-')) {
          emptySlots = 0; // reset slot counts below blockers
          continue;
        }

        if (cell.element.classList.contains('matched')) {
          emptySlots++;
        } else if (emptySlots > 0) {
          // Slide this cell's candy down by the emptySlot offset
          const targetIndex = idx + emptySlots * width;
          const targetCell = cells[targetIndex];

          targetCell.candyColor = cell.candyColor;
          targetCell.candyType = cell.candyType;
          targetCell.cellType = cell.cellType;
          targetCell.bombCountdown = cell.bombCountdown;
          targetCell.blockerStrength = cell.blockerStrength;

          targetCell.element.classList.remove('matched');
          renderCellGraphics(targetCell);

          // Animate the slide transition
          targetCell.element.style.transition = 'none';
          targetCell.element.style.transform = `translateY(${-emptySlots * cellSize}px)`;
          targetCell.element.offsetHeight; // force reflow
          targetCell.element.style.transition = 'transform 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          targetCell.element.style.transform = 'translateY(0)';

          // Clear original
          cell.element.classList.add('matched');
          cell.candyType = 'normal';
        }
      }

      // Fill in newly empty spaces at the top of the columns
      for (let r = 0; r < width; r++) {
        const idx = r * width + c;
        const cell = cells[idx];

        if (cell.cellType.startsWith('blocker-')) continue;

        if (cell.element.classList.contains('matched')) {
          cell.candyColor = candiesColors[Math.floor(Math.random() * candiesColors.length)];
          cell.candyType = 'normal';
          cell.cellType = 'normal';
          
          cell.element.classList.remove('matched');
          renderCellGraphics(cell);

          // Animate spawn drop
          cell.element.style.transition = 'none';
          cell.element.style.transform = 'translateY(-200px)';
          cell.element.offsetHeight;
          cell.element.style.transition = 'transform 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          cell.element.style.transform = 'translateY(0)';
        }
      }
    }
  }

  // --- Game State Checks & Controls ---

  function checkGameStatus() {
    // Check level complete conditions
    const hasJellyLeft = cells.some(c => c.isJelly);
    const scoreAchieved = score >= targetScore;

    if (levelDisplay.innerHTML == level) {
      let objectiveMet = false;
      if (level >= 2) {
        objectiveMet = !hasJellyLeft;
      } else {
        objectiveMet = scoreAchieved;
      }

      if (objectiveMet) {
        triggerWin();
        return;
      }
    }

    if (moves <= 0) {
      triggerGameOver("You ran out of moves!");
    }
  }

  function triggerWin() {
    modalTitle.innerHTML = "LEVEL COMPLETE!";
    modalDesc.innerHTML = `Congratulations! You scored ${score} points!`;
    modalBtn.innerHTML = "NEXT LEVEL";
    modal.classList.remove('hidden');
  }

  function triggerGameOver(reason) {
    modalTitle.innerHTML = "GAME OVER";
    modalDesc.innerHTML = `${reason} Score achieved: ${score}`;
    modalBtn.innerHTML = "RETRY";
    modal.classList.remove('hidden');
  }

  modalBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    if (modalBtn.innerHTML === "NEXT LEVEL") {
      level++;
      loadLevel(level);
    } else {
      loadLevel(level);
    }
  });

  // --- Drag & Touch Handlers ---

  function dragStart(e) {
    if (isChecking) return;
    dragStartCell = cells[parseInt(this.id)];
    this.classList.add('dragging');
  }

  function dragOver(e) {
    e.preventDefault();
  }

  function dragDrop(e) {
    e.preventDefault();
    if (isChecking || !dragStartCell) return;
    
    dragEndCell = cells[parseInt(this.id)];
    dragStartCell.element.classList.remove('dragging');

    if (isValidAdjacent(dragStartCell, dragEndCell)) {
      swap(dragStartCell.index, dragEndCell.index);
    }
    dragStartCell = null;
    dragEndCell = null;
  }

  // Mobile Touch Support
  let touchStartElement = null;

  function touchStart(e) {
    if (isChecking) return;
    const touch = e.touches[0];
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    const gridItem = elem ? elem.closest('.grid-item') : null;
    if (gridItem) {
      dragStartCell = cells[parseInt(gridItem.id)];
      gridItem.classList.add('dragging');
      touchStartElement = gridItem;
    }
  }

  function touchMove(e) {
    e.preventDefault();
  }

  function touchEnd(e) {
    if (isChecking || !dragStartCell) return;
    if (touchStartElement) touchStartElement.classList.remove('dragging');

    const touch = e.changedTouches[0];
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    const gridItem = elem ? elem.closest('.grid-item') : null;

    if (gridItem) {
      dragEndCell = cells[parseInt(gridItem.id)];
      if (isValidAdjacent(dragStartCell, dragEndCell)) {
        swap(dragStartCell.index, dragEndCell.index);
      }
    }
    dragStartCell = null;
    dragEndCell = null;
    touchStartElement = null;
  }

  function isValidAdjacent(c1, c2) {
    const colDiff = Math.abs(c1.col - c2.col);
    const rowDiff = Math.abs(c1.row - c2.row);
    return (colDiff === 1 && rowDiff === 0) || (colDiff === 0 && rowDiff === 1);
  }

  // Start Level 1
  loadLevel(1);
});
