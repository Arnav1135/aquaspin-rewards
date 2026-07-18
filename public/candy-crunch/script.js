document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('.grid');
  const scoreDisplay = document.getElementById('score');
  const width = 8;
  const squares = [];
  let score = 0;

  const candyColors = [
    'candy-red',
    'candy-blue',
    'candy-green',
    'candy-yellow',
    'candy-orange',
    'candy-purple'
  ];

  // Create Board
  function createBoard() {
    for (let i = 0; i < width * width; i++) {
      const square = document.createElement('div');
      square.setAttribute('id', i);
      
      const randomColor = Math.floor(Math.random() * candyColors.length);
      const candy = document.createElement('div');
      candy.classList.add('candy');
      candy.classList.add(candyColors[randomColor]);
      
      // Allow drag & drop on the square wrapper
      square.setAttribute('draggable', true);
      square.appendChild(candy);
      
      grid.appendChild(square);
      squares.push(square);
    }
  }

  createBoard();

  // Dragging Variables
  let colorBeingDragged;
  let colorBeingReplaced;
  let squareIdBeingDragged;
  let squareIdBeingReplaced;

  // Add Event Listeners
  squares.forEach(square => square.addEventListener('dragstart', dragStart));
  squares.forEach(square => square.addEventListener('dragend', dragEnd));
  squares.forEach(square => square.addEventListener('dragover', dragOver));
  squares.forEach(square => square.addEventListener('dragenter', dragEnter));
  squares.forEach(square => square.addEventListener('dragleave', dragLeave));
  squares.forEach(square => square.addEventListener('drop', dragDrop));

  // Touch Support
  squares.forEach(square => square.addEventListener('touchstart', touchStart, {passive: false}));
  squares.forEach(square => square.addEventListener('touchend', touchEnd, {passive: false}));
  squares.forEach(square => square.addEventListener('touchmove', touchMove, {passive: false}));

  let touchTarget = null;

  function touchStart(e) {
    e.preventDefault();
    if (e.target.classList.contains('candy')) {
      const square = e.target.parentElement;
      squareIdBeingDragged = parseInt(square.id);
      colorBeingDragged = e.target.className;
      square.classList.add('dragging');
    } else {
      squareIdBeingDragged = parseInt(e.target.id);
      colorBeingDragged = e.target.children[0]?.className;
      e.target.classList.add('dragging');
    }
  }

  function touchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    if (elem) {
      if (elem.classList.contains('candy')) {
        touchTarget = elem.parentElement;
      } else if (elem.hasAttribute('id')) {
        touchTarget = elem;
      }
    }
  }

  function touchEnd(e) {
    e.preventDefault();
    squares[squareIdBeingDragged].classList.remove('dragging');
    if (touchTarget && touchTarget.id) {
      squareIdBeingReplaced = parseInt(touchTarget.id);
      colorBeingReplaced = touchTarget.children[0]?.className;
      
      if (colorBeingDragged && colorBeingReplaced) {
        swapCandies();
        validateMove();
      }
    }
    touchTarget = null;
  }

  function dragStart() {
    colorBeingDragged = this.children[0]?.className;
    squareIdBeingDragged = parseInt(this.id);
    this.classList.add('dragging');
  }

  function dragOver(e) {
    e.preventDefault();
  }

  function dragEnter(e) {
    e.preventDefault();
  }

  function dragLeave() {
    //
  }

  function dragDrop() {
    colorBeingReplaced = this.children[0]?.className;
    squareIdBeingReplaced = parseInt(this.id);
    
    if (colorBeingDragged && colorBeingReplaced) {
      swapCandies();
    }
  }

  function swapCandies() {
    squares[squareIdBeingDragged].children[0].className = colorBeingReplaced;
    squares[squareIdBeingReplaced].children[0].className = colorBeingDragged;
  }

  function dragEnd() {
    this.classList.remove('dragging');
    validateMove();
  }

  function validateMove() {
    // Valid moves are immediately adjacent
    let validMoves = [
      squareIdBeingDragged - 1, 
      squareIdBeingDragged - width, 
      squareIdBeingDragged + 1, 
      squareIdBeingDragged + width
    ];
    
    // Prevent wrap-around (left/right edges)
    if (squareIdBeingDragged % width === 0) {
      validMoves = validMoves.filter(m => m !== squareIdBeingDragged - 1);
    }
    if (squareIdBeingDragged % width === width - 1) {
      validMoves = validMoves.filter(m => m !== squareIdBeingDragged + 1);
    }

    let validMove = validMoves.includes(squareIdBeingReplaced);

    if (squareIdBeingReplaced !== undefined && validMove) {
      squareIdBeingReplaced = null;
      // Note: A real candy crush checks if the swap ACTUALLY makes a match before allowing it.
      // But for this simple implementation, we just validate the adjacent grid move.
    } else if (squareIdBeingReplaced !== undefined && !validMove) {
      // Revert swap
      squares[squareIdBeingReplaced].children[0].className = colorBeingReplaced;
      squares[squareIdBeingDragged].children[0].className = colorBeingDragged;
      squareIdBeingReplaced = null;
    }
  }

  // Drop candies once some have been cleared
  function moveIntoSquareBelow() {
    for (let i = 0; i < 56; i++) {
      let squareBelow = i + width;
      let currentCandy = squares[i].children[0];
      let belowCandy = squares[squareBelow].children[0];
      
      // If below is empty (or has invisible class applied by match detection)
      if (squares[squareBelow].classList.contains('invisible')) {
        // Move current down
        belowCandy.className = currentCandy.className;
        squares[squareBelow].classList.remove('invisible');
        
        // Clear current
        currentCandy.className = 'candy';
        squares[i].classList.add('invisible');
      }

      const firstRow = [0, 1, 2, 3, 4, 5, 6, 7];
      const isFirstRow = firstRow.includes(i);
      
      // Generate new candies at the top
      if (isFirstRow && squares[i].classList.contains('invisible')) {
        let randomColor = Math.floor(Math.random() * candyColors.length);
        currentCandy.className = `candy ${candyColors[randomColor]}`;
        squares[i].classList.remove('invisible');
      }
    }
  }

  // --- Match Detection ---

  // Check for row of Four
  function checkRowForFour() {
    for (let i = 0; i < 60; i++) {
      let rowOfFour = [i, i+1, i+2, i+3];
      let decidedColor = squares[i].children[0]?.className;
      const isBlank = squares[i].classList.contains('invisible') || !decidedColor || decidedColor === 'candy';

      const notValid = [5, 6, 7, 13, 14, 15, 21, 22, 23, 29, 30, 31, 37, 38, 39, 45, 46, 47, 53, 54, 55];
      if (notValid.includes(i)) continue;

      if (rowOfFour.every(index => squares[index].children[0]?.className === decidedColor && !isBlank)) {
        score += 4;
        scoreDisplay.innerHTML = score;
        rowOfFour.forEach(index => {
          squares[index].classList.add('invisible');
          squares[index].children[0].className = 'candy';
        });
      }
    }
  }

  // Check for column of Four
  function checkColumnForFour() {
    for (let i = 0; i < 39; i++) {
      let columnOfFour = [i, i+width, i+width*2, i+width*3];
      let decidedColor = squares[i].children[0]?.className;
      const isBlank = squares[i].classList.contains('invisible') || !decidedColor || decidedColor === 'candy';

      if (columnOfFour.every(index => squares[index].children[0]?.className === decidedColor && !isBlank)) {
        score += 4;
        scoreDisplay.innerHTML = score;
        columnOfFour.forEach(index => {
          squares[index].classList.add('invisible');
          squares[index].children[0].className = 'candy';
        });
      }
    }
  }

  // Check for row of Three
  function checkRowForThree() {
    for (let i = 0; i < 61; i++) {
      let rowOfThree = [i, i+1, i+2];
      let decidedColor = squares[i].children[0]?.className;
      const isBlank = squares[i].classList.contains('invisible') || !decidedColor || decidedColor === 'candy';

      const notValid = [6, 7, 14, 15, 22, 23, 30, 31, 38, 39, 46, 47, 54, 55];
      if (notValid.includes(i)) continue;

      if (rowOfThree.every(index => squares[index].children[0]?.className === decidedColor && !isBlank)) {
        score += 3;
        scoreDisplay.innerHTML = score;
        rowOfThree.forEach(index => {
          squares[index].classList.add('invisible');
          squares[index].children[0].className = 'candy';
        });
      }
    }
  }

  // Check for column of Three
  function checkColumnForThree() {
    for (let i = 0; i < 47; i++) {
      let columnOfThree = [i, i+width, i+width*2];
      let decidedColor = squares[i].children[0]?.className;
      const isBlank = squares[i].classList.contains('invisible') || !decidedColor || decidedColor === 'candy';

      if (columnOfThree.every(index => squares[index].children[0]?.className === decidedColor && !isBlank)) {
        score += 3;
        scoreDisplay.innerHTML = score;
        columnOfThree.forEach(index => {
          squares[index].classList.add('invisible');
          squares[index].children[0].className = 'candy';
        });
      }
    }
  }

  // Run game loop
  window.setInterval(function() {
    checkRowForFour();
    checkColumnForFour();
    checkRowForThree();
    checkColumnForThree();
    moveIntoSquareBelow();
  }, 100);
});
