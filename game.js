var board = null;
var game = new Chess();
var pendingMove = null;
var gameMode = 'ai';
var aiDifficulty = 2;
var timeControl = 600;
var whiteTime = 600;
var blackTime = 600;
var timerInterval = null;
var isTimerRunning = false;
var soundEnabled = true;
var muteSounds = false;
var moveHistory = [];
var capturedWhite = [];
var capturedBlack = [];
var gameStarted = false;
var stockfish = null;
var stockfishTimeoutId = null;
var isAIMoving = false;
var audioContext = null;

var statusEl = document.getElementById("status");
var boardEl = document.getElementById("myBoard");

var urlParams = new URLSearchParams(window.location.search);
var urlMode = urlParams.get('mode');
if (urlMode === 'pvp' || urlMode === 'ai') {
  gameMode = urlMode;
  var gameModeEl = document.getElementById('gameMode');
  if (gameModeEl) {
    gameModeEl.value = gameMode;
  }
  var difficultyGroup = document.getElementById('difficultyGroup');
  if (difficultyGroup) {
    difficultyGroup.style.display = gameMode === 'ai' ? 'flex' : 'none';
  }
}

function getPieceTheme(piece) {
  return `https://lichess1.org/assets/piece/pixel/${piece}.svg`;
}

var config = {
  draggable: true,
  position: 'start',
  pieceTheme: getPieceTheme,
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
};

function initStockfish() {
  console.log('Fetching Stockfish from CDN...');
  
  fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.0/stockfish.js')
    .then(response => response.text())
    .then(scriptText => {
      var blob = new Blob([scriptText], { type: 'application/javascript' });
      var workerUrl = URL.createObjectURL(blob);
      
      stockfish = new Worker(workerUrl);
      stockfish.onmessage = handleStockfishResponse;
      
      stockfish.postMessage('uci');
      stockfish.postMessage('isready');
      
      console.log('Stockfish Web Worker loaded successfully!');
    })
    .catch(err => {
      console.error('Failed to load Stockfish worker:', err);
      stockfish = null;
    });
}

function handleStockfishResponse(event) {
  var message = typeof event.data === 'string' ? event.data : '';
  
  if (message.startsWith('bestmove')) {
    if (stockfishTimeoutId) {
      clearTimeout(stockfishTimeoutId);
      stockfishTimeoutId = null;
    }
    
    var bestMove = message.split(' ')[1];
    isAIMoving = false;
    
    console.log('Stockfish best move:', bestMove);
    
    if (bestMove && bestMove !== '(none)') {
      var from = bestMove.substring(0, 2);
      var to = bestMove.substring(2, 4);
      var promotion = bestMove.length > 4 ? bestMove.substring(4, 5) : null;

      var move = game.move({
        from: from,
        to: to,
        promotion: promotion || 'q'
      });

      if (move) {
        if (move.captured) {
          var capturedColor = move.color === 'w' ? 'b' : 'w';
          var capturedPiece = move.captured.toUpperCase();
          if (capturedColor === 'w') {
            capturedWhite.push(capturedPiece);
          } else {
            capturedBlack.push(capturedPiece);
          }
          playSound('capture');
        } else {
          playSound('move');
        }

        moveHistory.push({
          from: from,
          to: to,
          piece: move.piece,
          color: move.color,
          captured: move.captured,
          promotion: promotion,
          san: move.san
        });

        try {
          board.position(game.fen());
        } catch (e) {
          console.error('Error updating board position:', e);
        }
        updateStatus();
        updateTheme();
        updateMoveHistory();
        updateCapturedPieces();
        saveToLocalStorage();
      }
    }
  }
}



function onDragStart(source, piece) {
  if (game.game_over()) return false;
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
     (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }
  return true;
}

function onDrop(source, target) {
  if (gameMode === 'ai' && game.turn() === 'b') {
    return 'snapback';
  }
  
  if (!gameStarted) {
    gameStarted = true;
    startTimer();
  }

  var moves = game.moves({ verbose: true });
  var promoMove = moves.find(m => m.from === source && m.to === target && m.promotion);
  if (promoMove) {
    pendingMove = { from: source, to: target };
    showPromotionModal(game.turn());
    return 'snapback';
  }

  var move = game.move({
    from: source,
    to: target,
    promotion: 'q'
  });

  if (move === null) {
    boardEl.classList.add("flash-red");
    setTimeout(() => {
      boardEl.classList.remove("flash-red");
    }, 450);
    return 'snapback';
  }

  if (move.captured) {
    var capturedColor = move.color === 'w' ? 'b' : 'w';
    var capturedPiece = move.captured.toUpperCase();
    if (capturedColor === 'w') {
      capturedWhite.push(capturedPiece);
    } else {
      capturedBlack.push(capturedPiece);
    }
    playSound('capture');
  } else {
    playSound('move');
  }

  moveHistory.push({
    from: source,
    to: target,
    piece: move.piece,
    color: move.color,
    captured: move.captured,
    promotion: move.promotion,
    san: move.san
  });

  boardEl.setAttribute('data-valid-move', 'true');
  saveToLocalStorage();
}

function onSnapEnd() {
  try {
    board.position(game.fen());
  } catch (e) {
    console.error('Error in onSnapEnd board.position:', e);
  }
  if (boardEl.hasAttribute('data-valid-move')) {
    updateStatus();
    updateTheme();
    updateMoveHistory();
    updateCapturedPieces();
    boardEl.removeAttribute('data-valid-move');
    
    if (gameMode === 'ai' && !game.game_over() && game.turn() === 'b') {
      console.log('Calling AI for black move');
      setTimeout(makeAIMove, 300);
    }
  }
}

function showPromotionModal(color) {
  var modal = document.getElementById('promotionModal');
  var container = document.getElementById('promoPieces');
  container.innerHTML = '';

  var pieces = ['q', 'r', 'b', 'n'];
 
  pieces.forEach(p => {
    var img = document.createElement('img');
    img.src = getPieceTheme(color + p.toUpperCase());
    img.className = 'promo-piece';
    img.onclick = () => promote(p);
    container.appendChild(img);
  });
 
  modal.classList.add('show');
}

function promote(pieceType) {
  var modal = document.getElementById('promotionModal');
  modal.classList.remove('show');
 
  if (pendingMove) {
    var move = game.move({
      from: pendingMove.from,
      to: pendingMove.to,
      promotion: pieceType
    });

    if (!move) {
      pendingMove = null;
      return;
    }

    if (move.captured) {
      var capturedColor = move.color === 'w' ? 'b' : 'w';
      var capturedPiece = move.captured.toUpperCase();
      if (capturedColor === 'w') {
        capturedWhite.push(capturedPiece);
      } else {
        capturedBlack.push(capturedPiece);
      }
      playSound('capture');
    } else {
      playSound('move');
    }

    moveHistory.push({
      from: pendingMove.from,
      to: pendingMove.to,
      piece: move.piece,
      color: move.color,
      captured: move.captured,
      promotion: pieceType,
      san: move.san
    });
    
    try {
      board.position(game.fen());
    } catch (e) {
      console.error('Error in promote board.position:', e);
    }
    pendingMove = null;
    
    updateStatus();
    updateTheme();
    updateMoveHistory();
    updateCapturedPieces();
    saveToLocalStorage();

    if (gameMode === 'ai' && !game.game_over() && game.turn() === 'b') {
      setTimeout(makeAIMove, 300);
    }
  }
}

function makeAIMove() {
  if (!stockfish) {
    console.error('Stockfish not loaded - cannot make AI move');
    return;
  }
  
  if (game.game_over() || game.turn() !== 'b') {
    return;
  }
  
  if (isAIMoving) {
    console.log('AI already moving, skipping');
    return;
  }
  
  isAIMoving = true;
  
  var depth = aiDifficulty === 1 ? 8 : aiDifficulty === 2 ? 12 : 20;
  var timeoutMs = aiDifficulty === 1 ? 3000 : aiDifficulty === 2 ? 5000 : 15000;
  
  stockfishTimeoutId = setTimeout(function() {
    console.log('Stockfish timeout');
    isAIMoving = false;
  }, timeoutMs);
  
  stockfish.postMessage('position fen ' + game.fen());
  stockfish.postMessage('go depth ' + depth);
}

function updateStatus() {
  requestAnimationFrame(() => {
    var status = '';
    var moveColor = game.turn() === 'w' ? 'White' : 'Black';
    if (game.in_checkmate()) {
      status = `Game Over — ${moveColor} is checkmated`;
      if (!muteSounds) playSound('gameover');
      stopTimer();
    }
    else if (game.in_draw()) {
      status = 'Game Over — Draw';
      if (!muteSounds) playSound('gameover');
      stopTimer();
    }
    else {
      status = `${moveColor}'s turn`;
      if (game.in_check()) {
        status += ' (CHECK!)';
        if (!muteSounds) playSound('check');
      }
    }
    statusEl.textContent = status;
  });
}

function updateTheme() {
  boardEl.classList.remove(
    'theme-white',
    'theme-black',
    'theme-check',
    'theme-gameover',
    'theme-draw'
  );
  document.querySelectorAll('#myBoard img')
    .forEach(p => p.classList.remove('mate-piece'));
  if (game.in_checkmate()) {
    boardEl.classList.add('theme-gameover');
    let defeated = game.turn();
    document.querySelectorAll(`#myBoard img[src*="${defeated}"]`)
      .forEach(p => p.classList.add('mate-piece'));
  }
  else if (game.in_draw()) {
    boardEl.classList.add('theme-draw');
  }
  else if (game.in_check()) {
    boardEl.classList.add('theme-check');
  }
  else if (game.turn() === 'w') {
    boardEl.classList.add('theme-white');
  }
  else {
    boardEl.classList.add('theme-black');
  }
}

function updateMoveHistory() {
  var historyEl = document.getElementById('moveHistory');
  historyEl.innerHTML = '';
  
  var moveNumber = 1;
  for (var i = 0; i < moveHistory.length; i += 2) {
    var whiteMove = moveHistory[i];
    var blackMove = moveHistory[i + 1];
    
    var row = document.createElement('div');
    row.className = 'move-row';
    
    var numSpan = document.createElement('span');
    numSpan.className = 'move-number';
    numSpan.textContent = moveNumber + '.';
    
    var whiteSpan = document.createElement('span');
    whiteSpan.className = 'move-white';
    whiteSpan.textContent = whiteMove ? whiteMove.san : '';
    
    var blackSpan = document.createElement('span');
    blackSpan.className = 'move-black';
    blackSpan.textContent = blackMove ? blackMove.san : '';
    
    row.appendChild(numSpan);
    row.appendChild(whiteSpan);
    row.appendChild(blackSpan);
    historyEl.appendChild(row);
    
    moveNumber++;
  }
  
  historyEl.scrollTop = historyEl.scrollHeight;
}

function updateCapturedPieces() {
  var whiteContainer = document.getElementById('capturedWhite');
  var blackContainer = document.getElementById('capturedBlack');
  
  whiteContainer.innerHTML = '';
  blackContainer.innerHTML = '';
  
  var pieceValues = { 'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9 };
  capturedWhite.sort((a, b) => pieceValues[b] - pieceValues[a]);
  capturedBlack.sort((a, b) => pieceValues[b] - pieceValues[a]);
  
  capturedWhite.forEach(p => {
    var img = document.createElement('img');
    img.src = getPieceTheme('w' + p);
    img.className = 'captured-piece white-captured';
    whiteContainer.appendChild(img);
  });
  
  capturedBlack.forEach(p => {
    var img = document.createElement('img');
    img.src = getPieceTheme('b' + p);
    img.className = 'captured-piece black-captured';
    blackContainer.appendChild(img);
  });
}

function resetGame() {
  game.reset();
  board.start();
  moveHistory = [];
  capturedWhite = [];
  capturedBlack = [];
  gameStarted = false;
  whiteTime = timeControl;
  blackTime = timeControl;
  updateTimers();
  stopTimer();
  isTimerRunning = false;
  isAIMoving = false;
  if (stockfishTimeoutId) {
    clearTimeout(stockfishTimeoutId);
    stockfishTimeoutId = null;
  }
  updateStatus();
  updateTheme();
  updateMoveHistory();
  updateCapturedPieces();
  localStorage.removeItem('hypergridChessSave');
}

function flipBoard() {
  board.flip();
}

function cancelPendingAI() {
  if (stockfishTimeoutId) {
    clearTimeout(stockfishTimeoutId);
    stockfishTimeoutId = null;
  }
  isAIMoving = false;
}

function replayMoveHistory(history) {
  game.reset();
  for (var i = 0; i < history.length; i++) {
    var m = history[i];
    var result = game.move({
      from: m.from,
      to: m.to,
      promotion: m.promotion || 'q'
    });
    if (!result) {
      console.warn('Replay: failed to apply move', m, 'at index', i);
      break;
    }
  }
}

function undoMove() {
  if (moveHistory.length === 0) return;

  cancelPendingAI();

  var lastUndo = game.undo();
  if (!lastUndo) return;
  
  var lastMove = moveHistory.pop();
  if (lastMove && lastMove.captured) {
    var capturedColor = lastMove.color === 'w' ? 'b' : 'w';
    if (capturedColor === 'w' && capturedWhite.length > 0) {
      capturedWhite.pop();
    } else if (capturedColor === 'b' && capturedBlack.length > 0) {
      capturedBlack.pop();
    }
  }

  if (gameMode === 'ai' && moveHistory.length > 0 && game.turn() === 'b') {
    game.undo();
    var aiMove = moveHistory.pop();
    if (aiMove && aiMove.captured) {
      var aiCapturedColor = aiMove.color === 'w' ? 'b' : 'w';
      if (aiCapturedColor === 'w' && capturedWhite.length > 0) {
        capturedWhite.pop();
      } else if (aiCapturedColor === 'b' && capturedBlack.length > 0) {
        capturedBlack.pop();
      }
    }
  }
  
  try {
    board.position(game.fen());
  } catch (e) {
    console.error('Error in undoMove board.position:', e);
  }
  muteSounds = true;
  updateStatus();
  muteSounds = false;
  updateTheme();
  updateMoveHistory();
  updateCapturedPieces();
  saveToLocalStorage();
}

function changeGameMode() {
  var select = document.getElementById('gameMode');
  if (!select) return;
  
  gameMode = select.value;
  
  var difficultyGroup = document.getElementById('difficultyGroup');
  if (difficultyGroup) {
    difficultyGroup.style.display = gameMode === 'ai' ? 'flex' : 'none';
  }
  
  resetGame();
}

function changeDifficulty() {
  var select = document.getElementById('aiDifficulty');
  aiDifficulty = parseInt(select.value);
}

function changeTimeControl() {
  var select = document.getElementById('timeControl');
  timeControl = parseInt(select.value);
  whiteTime = timeControl;
  blackTime = timeControl;
  stopTimer();
  isTimerRunning = false;
  if (gameStarted && timeControl > 0 && !game.game_over()) {
    startTimer();
  }
  updateTimers();
}

function startTimer() {
  if (timeControl === 0) return;
  if (isTimerRunning) return;
  
  isTimerRunning = true;
  timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
  isTimerRunning = false;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimer() {
  if (game.game_over()) {
    stopTimer();
    return;
  }

  if (game.turn() === 'w') {
    whiteTime--;
  } else {
    blackTime--;
  }

  updateTimers();

  if (whiteTime <= 0 || blackTime <= 0) {
    stopTimer();
    if (whiteTime <= 0) {
      statusEl.textContent = 'Game Over — Black wins on time';
    } else {
      statusEl.textContent = 'Game Over — White wins on time';
    }
    boardEl.classList.add('theme-gameover');
  }
}

function updateTimers() {
  var whiteDisplay = document.getElementById('whiteTimer').querySelector('.timer-display');
  var blackDisplay = document.getElementById('blackTimer').querySelector('.timer-display');
  
  var whiteMin = Math.floor(whiteTime / 60);
  var whiteSec = whiteTime % 60;
  var blackMin = Math.floor(blackTime / 60);
  var blackSec = blackTime % 60;
  
  whiteDisplay.textContent = whiteMin + ':' + (whiteSec < 10 ? '0' : '') + whiteSec;
  blackDisplay.textContent = blackMin + ':' + (blackSec < 10 ? '0' : '') + blackSec;
  
  var whiteTimer = document.getElementById('whiteTimer');
  var blackTimer = document.getElementById('blackTimer');
  
  whiteTimer.classList.remove('active');
  blackTimer.classList.remove('active');
  
  if (game.turn() === 'w' && isTimerRunning) {
    whiteTimer.classList.add('active');
  } else if (game.turn() === 'b' && isTimerRunning) {
    blackTimer.classList.add('active');
  }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  var btn = document.getElementById('soundToggle');
  btn.textContent = soundEnabled ? '🔊' : '🔇';
}

function playSound(type) {
  if (!soundEnabled) return;
  
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  
  var oscillator = audioContext.createOscillator();
  var gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  switch(type) {
    case 'move':
      oscillator.frequency.value = 440;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      break;
    case 'capture':
      oscillator.frequency.value = 220;
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
      break;
    case 'check':
      oscillator.type = 'square';
      oscillator.frequency.value = 880;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      break;
    case 'gameover':
      oscillator.type = 'triangle';
      var notes = [523, 659, 784];
      notes.forEach((freq, i) => {
        var osc = audioContext.createOscillator();
        var gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, audioContext.currentTime + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.2 + 0.3);
        osc.start(audioContext.currentTime + i * 0.2);
        osc.stop(audioContext.currentTime + i * 0.2 + 0.3);
      });
      break;
  }
}

function saveGame() {
  var saveData = {
    fen: game.fen(),
    moveHistory: moveHistory,
    capturedWhite: capturedWhite,
    capturedBlack: capturedBlack,
    whiteTime: whiteTime,
    blackTime: blackTime,
    gameMode: gameMode,
    aiDifficulty: aiDifficulty,
    timeControl: timeControl
  };
  
  localStorage.setItem('hypergridChessSave', JSON.stringify(saveData));
  alert('Game saved!');
}

function loadGame() {
  var saved = localStorage.getItem('hypergridChessSave');
  if (!saved) {
    alert('No saved game found');
    return;
  }
  
  try {
    var saveData = JSON.parse(saved);
    
    moveHistory = saveData.moveHistory || [];
    capturedWhite = saveData.capturedWhite || [];
    capturedBlack = saveData.capturedBlack || [];
    whiteTime = saveData.whiteTime != null ? saveData.whiteTime : timeControl;
    blackTime = saveData.blackTime != null ? saveData.blackTime : timeControl;
    gameMode = saveData.gameMode || 'ai';
    aiDifficulty = saveData.aiDifficulty || 2;
    timeControl = saveData.timeControl || 600;

    if (moveHistory.length > 0) {
      replayMoveHistory(moveHistory);
    } else {
      game.load(saveData.fen);
    }
    board.position(game.fen());
    
    var gameModeEl = document.getElementById('gameMode');
    if (gameModeEl) {
      gameModeEl.value = gameMode;
    }
    var aiDifficultyEl = document.getElementById('aiDifficulty');
    if (aiDifficultyEl) {
      aiDifficultyEl.value = aiDifficulty;
    }
    var timeControlEl = document.getElementById('timeControl');
    if (timeControlEl) {
      timeControlEl.value = timeControl;
    }
    
    var difficultyGroup = document.getElementById('difficultyGroup');
    if (difficultyGroup) {
      difficultyGroup.style.display = gameMode === 'ai' ? 'flex' : 'none';
    }
    
    updateTimers();
    muteSounds = true;
    updateStatus();
    muteSounds = false;
    updateTheme();
    updateMoveHistory();
    updateCapturedPieces();
    
    if (timeControl > 0 && !game.game_over()) {
      gameStarted = true;
      startTimer();
    }
    
    alert('Game loaded!');
  } catch (e) {
    alert('Error loading game');
    console.error(e);
  }
}

function saveToLocalStorage() {
  var saveData = {
    fen: game.fen(),
    moveHistory: moveHistory,
    capturedWhite: capturedWhite,
    capturedBlack: capturedBlack,
    whiteTime: whiteTime,
    blackTime: blackTime,
    gameMode: gameMode,
    aiDifficulty: aiDifficulty,
    timeControl: timeControl
  };
  
  localStorage.setItem('hypergridChessSave', JSON.stringify(saveData));
}

board = Chessboard("myBoard", config);
initStockfish();
updateStatus();
updateTheme();
updateTimers();
