var board = null;
var game = new Chess();
var pendingMove = null;
var gameMode = 'ai';
var aiDifficulty = '1';
var blindfoldMode = false;
var blindfoldVisibleSquare = null;
var currentEval = 0;
var evalMateScore = null;
var timeControl = 0;
var increment = 0;
var whiteTime = 0;
var blackTime = 0;
var timerInterval = null;
var isTimerRunning = false;
var soundEnabled = true;
var muteSounds = false;
var moveHistory = [];
var capturedWhite = [];
var capturedBlack = [];
var gameStarted = false;
var timeExpired = false;
var stockfish = null;
var stockfishTimeoutId = null;
var isAIMoving = false;
var playerColor = 'w';
var audioContext = null;
var achievementGameStartTime = Date.now();
var achievementHintUsed = false;

// Puzzle mode state
var puzzleMode = false;
var puzzleData = null;
var puzzleSolutionIndex = 0;
var puzzleSolved = false;
var puzzleFailed = false;
var puzzleHintShown = false;
var puzzlesCompleted = 0;
var puzzleIndex = 0;

var statusEl = document.getElementById("status");
var boardEl = document.getElementById("myBoard");

var urlParams = new URLSearchParams(window.location.search);
var urlMode = urlParams.get('mode');
if (!urlMode) {
  window.location.href = 'index.html';
}
if (urlMode === 'pvp' || urlMode === 'ai') {
  gameMode = urlMode;

  var urlTime = urlParams.get('time');
  var urlInc = urlParams.get('inc');
  var urlDiff = urlParams.get('diff');

  if (urlDiff && urlMode === 'ai') {
    aiDifficulty = urlDiff;
    blindfoldMode = (aiDifficulty === '5');
  }

  if (urlTime) {
    timeControl = parseInt(urlTime);
  } else if (urlMode === 'pvp') {
    timeControl = 600;
  } else {
    timeControl = 0;
  }

  if (urlInc) {
    increment = parseInt(urlInc);
  }

  whiteTime = timeControl;
  blackTime = timeControl;

  var timeLabelEl = document.getElementById('timeLabel');
  if (timeLabelEl) {
    if (timeControl > 0) {
      var mins = Math.floor(timeControl / 60);
      timeLabelEl.textContent = mins + ' min' + (increment > 0 ? ' +' + increment + 's' : '');
      timeLabelEl.style.display = '';
    } else {
      timeLabelEl.style.display = 'none';
    }
  }

  var aiProfileSection = document.getElementById('aiProfileSection');
  if (aiProfileSection) {
    aiProfileSection.style.display = gameMode === 'ai' ? 'flex' : 'none';
  }
} else if (urlMode === 'puzzle') {
  puzzleMode = true;
  gameMode = 'puzzle';
} else if (urlMode === 'trial') {
  gameMode = 'ai';
  aiDifficulty = '3';
  var trialAISect = document.getElementById('aiProfileSection');
  if (trialAISect) trialAISect.style.display = 'none';
  var rivalSect = document.getElementById('rivalProfileSection');
  if (rivalSect) rivalSect.style.display = '';
}

function getPieceTheme(piece) {
  if (typeof ShopSystem !== 'undefined') {
    return ShopSystem.getPieceUrl(piece);
  }
  return 'https://lichess1.org/assets/piece/pixel/' + piece + '.svg';
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
  console.log('Loading Stockfish 18 engine...');
  try {
    stockfish = new Worker('engine/stockfish-18-lite-single.js');
    stockfish.onmessage = handleStockfishResponse;
    stockfish.postMessage('uci');
    stockfish.postMessage('isready');
    stockfish.postMessage('setoption name Skill Level value ' + ({ '1': 1, '2': 7, '3': 14, '4': 20, '5': 4 }[aiDifficulty] || 1));
    console.log('Stockfish 18 Web Worker loaded successfully!');
  } catch (err) {
    console.error('Failed to load Stockfish worker:', err);
    stockfish = null;
  }
}

function handleStockfishResponse(event) {
  var message = typeof event.data === 'string' ? event.data : '';

  if (!message.startsWith('bestmove') && message.indexOf('score') !== -1 && isEvalBarEnabled()) {
    var cpMatch = message.match(/\bscore cp (-?\d+)/);
    var mateMatch = message.match(/\bscore mate (-?\d+)/);
    var pvIdx = message.match(/\bmultipv (\d+)/);
    if ((!pvIdx || pvIdx[1] === '1') && (cpMatch || mateMatch)) {
      var sign = (game.turn() === 'b') ? -1 : 1;
      if (mateMatch) {
        updateEvalBar(parseInt(mateMatch[1]) * sign, true);
      } else if (cpMatch) {
        updateEvalBar((parseInt(cpMatch[1]) / 100) * sign, false);
      }
    }
  }
  
  if (message.startsWith('bestmove')) {
    if (!isAIMoving) return;
    hideAIThinking();
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
          board.position(game.fen(), !blindfoldMode);
        } catch (e) {
          console.error('Error updating board position:', e);
        }
        highlightLastMove(from, to);
        updateBlindfoldVisibility(to);
        updateStatus();
        updateTheme();
        updateMoveHistory();
        updateCapturedPieces();
        applyIncrement(move.color);
}
    }
  }
}



function onDragStart(source, piece) {
  if (game.game_over()) return false;
  if (timeExpired) return false;
  if (gameMode === 'ai' && game.turn() !== playerColor) return false;
  if (puzzleMode && (puzzleSolved || puzzleFailed)) return false;
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
     (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }
  return true;
}

function onDrop(source, target) {
  if (puzzleMode) {
    return onPuzzleDrop(source, target);
  }
  if (gameMode === 'ai' && game.turn() !== playerColor) {
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

  if (typeof AchievementTracker !== 'undefined') {
    AchievementTracker.trackMove(move);
  }

  boardEl.setAttribute('data-valid-move', 'true');
  updateBlindfoldVisibility(target);
}

function handlePuzzleSolved(puzzleData) {
  puzzleSolved = true;
  markPuzzleSolved(puzzleData.id);
  puzzlesCompleted = (function() { try { return JSON.parse(localStorage.getItem('hypergrid_solved') || '[]'); } catch(e) { return []; } })().length;
  playSound('gameover');
  statusEl.textContent = 'Puzzle Solved! \u2713';
  statusEl.style.color = '#0f0';
  var puzzleStatusEl = document.getElementById('puzzleStatus');
  if (puzzleStatusEl) puzzleStatusEl.textContent = '\u2713 Solved!';

  var tierId = puzzleData.id.charAt(0);
  if (tierId === 'e') updateRivalDialogue('solved_easy');
  else if (tierId === 'm') updateRivalDialogue('solved_medium');
  else updateRivalDialogue('solved_hard');

  var solvedCountEl = document.getElementById('puzzlesSolvedCount');
  if (solvedCountEl) solvedCountEl.textContent = puzzlesCompleted;

  if (typeof AchievementTracker !== 'undefined') {
    AchievementTracker.trackPuzzleSolved(puzzleData.id, achievementHintUsed);
  }
  achievementHintUsed = false;

  showPuzzleCompleteModal(puzzleData);
}

function onPuzzleDrop(source, target) {
  if (puzzleSolved || puzzleFailed) return 'snapback';
  if (!puzzleData) return 'snapback';

  var move = game.move({
    from: source,
    to: target,
    promotion: 'q'
  });

  if (move === null) {
    boardEl.classList.add("flash-red");
    setTimeout(() => { boardEl.classList.remove("flash-red"); }, 450);
    return 'snapback';
  }

  var expectedSan = puzzleData.solution[puzzleSolutionIndex];

  if (move.san === expectedSan) {
    puzzleSolutionIndex++;
    playSound(move.captured ? 'capture' : 'move');
    updateRivalDialogue('correct');

    moveHistory.push({
      from: source, to: target,
      piece: move.piece, color: move.color,
      captured: move.captured, promotion: move.promotion,
      san: move.san
    });

    board.position(game.fen());
    updateMoveHistory();
    updateCapturedPieces();
    updateTheme();

    if (puzzleSolutionIndex >= puzzleData.solution.length) {
      handlePuzzleSolved(puzzleData);
    } else {
      statusEl.textContent = 'Correct! Find the next move...';
      statusEl.style.color = '#4ecdc4';

      if (puzzleSolutionIndex < puzzleData.solution.length) {
        var opponentSan = puzzleData.solution[puzzleSolutionIndex];
        var opponentMove = game.move(opponentSan);
        if (opponentMove) {
          puzzleSolutionIndex++;
          if (opponentMove.captured) {
            var oppCapturedColor = opponentMove.color === 'w' ? 'b' : 'w';
            var oppCapturedPiece = opponentMove.captured.toUpperCase();
            if (oppCapturedColor === 'w') capturedWhite.push(oppCapturedPiece);
            else capturedBlack.push(oppCapturedPiece);
          }
          moveHistory.push({
            from: opponentMove.from, to: opponentMove.to,
            piece: opponentMove.piece, color: opponentMove.color,
            captured: opponentMove.captured, promotion: opponentMove.promotion,
            san: opponentMove.san
          });
          board.position(game.fen());
          updateMoveHistory();
          updateCapturedPieces();
          if (puzzleSolutionIndex >= puzzleData.solution.length) {
            handlePuzzleSolved(puzzleData);
          }
        }
      }
    }
    return;
  } else {
    game.undo();
    puzzleFailed = true;
    playSound('check');
    updateRivalDialogue('wrong');
    statusEl.textContent = 'Incorrect! The best move was ' + expectedSan;
    statusEl.style.color = '#e94560';
    var puzzleFailEl = document.getElementById('puzzleStatus');
    if (puzzleFailEl) puzzleFailEl.textContent = '\u2717 Try again';

    setTimeout(function() {
      puzzleFailed = false;
      statusEl.textContent = 'Find the best move!';
      setPuzzleStatusColor();
      var resetEl = document.getElementById('puzzleStatus');
      if (resetEl) resetEl.textContent = 'Difficulty ' + puzzleData.difficulty + '/5';
    }, 2500);

    return 'snapback';
  }
}

function onSnapEnd() {
  try {
    board.position(game.fen(), !blindfoldMode);
  } catch (e) {
    console.error('Error in onSnapEnd board.position:', e);
  }
  refreshBlindfoldVisibility();
  if (boardEl.hasAttribute('data-valid-move')) {
    if (moveHistory.length > 0) {
      var last = moveHistory[moveHistory.length - 1];
      highlightLastMove(last.from, last.to);
    }
    updateStatus();
    updateTheme();
    updateMoveHistory();
    updateCapturedPieces();
    boardEl.removeAttribute('data-valid-move');
    
    applyIncrement(last.color);
    
    if (gameMode === 'ai' && !game.game_over() && game.turn() !== playerColor) {
      console.log('Calling AI for opponent move');
      setTimeout(makeAIMove, 300);
    }
  }
  if (puzzleMode) {
    board.position(game.fen());
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

    if (typeof AchievementTracker !== 'undefined') {
      AchievementTracker.trackMove(move);
    }
    
    try {
      board.position(game.fen(), !blindfoldMode);
    } catch (e) {
      console.error('Error in promote board.position:', e);
    }
    updateBlindfoldVisibility(pendingMove.to);
    pendingMove = null;
    
    updateStatus();
    updateTheme();
    updateMoveHistory();
    updateCapturedPieces();
    applyIncrement(move.color);

    if (gameMode === 'ai' && !game.game_over() && game.turn() !== playerColor) {
      setTimeout(makeAIMove, 300);
    }
  }
}

function makeAIMove() {
  if (!stockfish) {
    console.error('Stockfish not loaded - cannot make AI move');
    return;
  }

  var aiColor = playerColor === 'w' ? 'b' : 'w';
  if (game.game_over() || game.turn() !== aiColor) {
    return;
  }

  if (isAIMoving) {
    console.log('AI already moving, skipping');
    return;
  }

  isAIMoving = true;
  showAIThinking();

  var moveCount = moveHistory.length;
  var difficultySettings = {
    '1': { skill: 1 },
    '2': { skill: 7 },
    '3': { skill: 14 },
    '4': { skill: 20 },
    '5': { skill: 4 }
  };
  var settings = difficultySettings[aiDifficulty] || difficultySettings['2'];

  if (settings.skill <= 1 && Math.random() < 0.15) {
    var moves = game.moves({ verbose: true });
    if (moves.length > 0) {
      var randomMove = moves[Math.floor(Math.random() * moves.length)];
      setTimeout(function() {
        applyAIMoveFromSAN(randomMove.san);
      }, 400);
      return;
    }
  }

  if (aiDifficulty === '5' && Math.random() < 0.10) {
    var bMoves = game.moves({ verbose: true });
    if (bMoves.length > 0) {
      var bRandomMove = bMoves[Math.floor(Math.random() * bMoves.length)];
      setTimeout(function() {
        applyAIMoveFromSAN(bRandomMove.san);
      }, 400);
      return;
    }
  }

  var baseDepths = { '1': 2, '2': 8, '3': 14, '4': 20, '5': 4 };
  var baseDepth = baseDepths[aiDifficulty] || 8;
  var maxDepths = { '1': 4, '2': 14, '3': 20, '4': 26, '5': 10 };
  var maxDepth = maxDepths[aiDifficulty] || 14;

  var progress = Math.min(moveCount / 20, 1);
  var depth = Math.round(baseDepth + (maxDepth - baseDepth) * progress);

  var baseTimeout = { '1': 300, '2': 1500, '3': 3000, '4': 5000, '5': 800 };
  var maxTimeout  = { '1': 500, '2': 3000, '3': 6000, '4': 10000, '5': 2000 };
  var timeoutMs = Math.round(baseTimeout[aiDifficulty] + (maxTimeout[aiDifficulty] - baseTimeout[aiDifficulty]) * progress);

  stockfishTimeoutId = setTimeout(function() {
    console.log('Stockfish timeout - forcing best move');
    stockfish.postMessage('stop');
  }, timeoutMs);

  stockfish.postMessage('setoption name Skill Level value ' + settings.skill);
  var movesStr = moveHistory.map(function(m) { return m.from + m.to + (m.promotion || ''); }).join(' ');
  if (movesStr) {
    stockfish.postMessage('position startpos moves ' + movesStr);
  } else {
    stockfish.postMessage('position startpos');
  }
  stockfish.postMessage('go depth ' + depth);
}

function applyAIMoveFromSAN(san) {
  var move = game.move(san);
  if (!move) {
    isAIMoving = false;
    hideAIThinking();
    return;
  }

  if (move.captured) {
    var capturedColor = move.color === 'w' ? 'b' : 'w';
    var capturedPiece = move.captured.toUpperCase();
    if (capturedColor === 'w') capturedWhite.push(capturedPiece);
    else capturedBlack.push(capturedPiece);
    playSound('capture');
  } else {
    playSound('move');
  }

  moveHistory.push({
    from: move.from, to: move.to,
    piece: move.piece, color: move.color,
    captured: move.captured, promotion: move.promotion,
    san: move.san
  });

  try { board.position(game.fen(), !blindfoldMode); } catch (e) {}
  highlightLastMove(move.from, move.to);
  updateBlindfoldVisibility(move.to);
  isAIMoving = false;
  hideAIThinking();
  updateStatus();
  updateTheme();
  updateMoveHistory();
  updateCapturedPieces();
}

function updateStatus() {
  var status = '';
  var moveColor = game.turn() === 'w' ? 'White' : 'Black';

  statusEl.classList.remove('white-turn', 'black-turn', 'check', 'gameover');

  if (game.in_checkmate()) {
    status = `Game Over — ${moveColor} is checkmated`;
    statusEl.classList.add('gameover');
    if (!muteSounds) playSound('gameover');
    stopTimer();
    var m = document.getElementById('gameOverModal');
    var t = document.getElementById('gameOverTitle');
    var msg = document.getElementById('gameOverMessage');
    if (m) {
      if (t) t.textContent = 'Checkmate';
      if (msg) msg.textContent = moveColor + ' is checkmated!';
      m.classList.add('show');
    }
    trackGameAchievement('checkmate', moveColor);
  }
  else if (game.in_draw()) {
    status = 'Game Over — Draw';
    statusEl.classList.add('gameover');
    if (!muteSounds) playSound('gameover');
    stopTimer();
    var m = document.getElementById('gameOverModal');
    var t = document.getElementById('gameOverTitle');
    var msg = document.getElementById('gameOverMessage');
    if (m) {
      if (t) t.textContent = 'Draw';
      if (msg) msg.textContent = 'The game is a draw.';
      m.classList.add('show');
    }
    trackGameAchievement('draw', null);
  }
  else {
    status = `${moveColor}'s turn`;
    statusEl.classList.add(game.turn() === 'w' ? 'white-turn' : 'black-turn');
    if (game.in_check()) {
      status += ' (CHECK!)';
      statusEl.classList.add('check');
      if (!muteSounds) playSound('check');
    }
  }
  statusEl.textContent = status;
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
    
    if (i + 2 >= moveHistory.length || (blackMove && i + 1 === moveHistory.length - 1) || (!blackMove && i === moveHistory.length - 1)) {
      row.classList.add('last-move-row');
    }
    
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
  var sortedWhite = capturedWhite.slice().sort((a, b) => pieceValues[b] - pieceValues[a]);
  var sortedBlack = capturedBlack.slice().sort((a, b) => pieceValues[b] - pieceValues[a]);
  
  sortedWhite.forEach(p => {
    var img = document.createElement('img');
    img.src = getPieceTheme('w' + p);
    img.className = 'captured-piece white-captured';
    whiteContainer.appendChild(img);
  });
  
  sortedBlack.forEach(p => {
    var img = document.createElement('img');
    img.src = getPieceTheme('b' + p);
    img.className = 'captured-piece black-captured';
    blackContainer.appendChild(img);
  });
  updateMaterialAdvantage();
}

function trackGameAchievement(endType, loserOrWinner) {
  if (typeof AchievementTracker === 'undefined') return;

  var playTime = Math.round((Date.now() - achievementGameStartTime) / 1000);
  var result = 'draw';
  var winnerColor = null;
  var playerPiecesLost = null;

  if (endType === 'checkmate') {
    var loserColor = loserOrWinner === 'White' ? 'w' : 'b';
    winnerColor = loserColor === 'w' ? 'b' : 'w';
  } else if (endType === 'timeout') {
    winnerColor = loserOrWinner;
  }

  if (gameMode === 'ai') {
    if (winnerColor === playerColor) {
      result = 'win';
    } else if (winnerColor) {
      result = 'loss';
    }
    if (playerColor === 'w') {
      playerPiecesLost = capturedBlack.length;
    } else {
      playerPiecesLost = capturedWhite.length;
    }
  } else if (gameMode === 'pvp') {
    if (winnerColor) result = 'win';
  }

  if (urlMode === 'trial') {
    if (winnerColor === playerColor) result = 'win';
    else if (winnerColor) result = 'loss';
  }

  AchievementTracker.trackGameEnd(result, {
    mode: urlMode === 'trial' ? 'trial' : gameMode,
    difficulty: aiDifficulty,
    playerColor: playerColor,
    winnerColor: winnerColor,
    moveCount: moveHistory.length,
    playerPiecesLost: playerPiecesLost,
    playTime: playTime
  });

  if (typeof ShopSystem !== 'undefined' && result === 'win') {
    ShopSystem.awardCoins(5);
    if (urlMode === 'trial') {
      ShopSystem.awardCoins(45);
    }
  }

  if (typeof ShopSystem !== 'undefined' && gameMode === 'ai' && urlMode !== 'trial') {
    var affinityTable = {
      '1': { loss: 0.5, draw: 1, win: 2 },
      '2': { loss: 1, draw: 2, win: 4 },
      '5': { loss: 1, draw: 2, win: 4 },
      '3': { loss: 1.5, draw: 3, win: 6 },
      '4': { loss: 2.5, draw: 5, win: 10 }
    };
    var pts = affinityTable[aiDifficulty] || affinityTable['1'];
    var earned = pts[result] || 0;
    if (earned > 0) ShopSystem.addAffinity(aiDifficulty, earned);
  }
}

function resetGame() {
  game.reset();
  board.start();
  clearHighlights();
  moveHistory = [];
  capturedWhite = [];
  capturedBlack = [];
  gameStarted = false;
  timeExpired = false;
  playerColor = 'w';
  board.orientation('white');
  achievementGameStartTime = Date.now();
  updateFlipButton();
  whiteTime = timeControl;
  blackTime = timeControl;
  updateTimers();
  stopTimer();
  isTimerRunning = false;
  isAIMoving = false;
  pendingMove = null;
  updateBlindfoldVisibility(null);
  updateEvalBar(0, false);
  evalMateScore = null;
  document.getElementById('promotionModal').classList.remove('show');
  document.getElementById('gameOverModal').classList.remove('show');
  if (stockfishTimeoutId) {
    clearTimeout(stockfishTimeoutId);
    stockfishTimeoutId = null;
  }
  if (stockfish) {
    stockfish.postMessage('ucinewgame');
  }
  updateStatus();
  updateTheme();
  updateMoveHistory();
  updateCapturedPieces();
}

function flipBoard() {
  board.flip();
}

function handleFlipOrSwitch() {
  var btn = document.getElementById('flipBtn');
  if (gameMode === 'ai' && moveHistory.length === 0) {
    playerColor = playerColor === 'w' ? 'b' : 'w';
    if (playerColor === 'b') {
      board.orientation('black');
    } else {
      board.orientation('white');
    }
    updateFlipButton();
    if (playerColor === 'b') {
      setTimeout(makeAIMove, 500);
    }
  } else {
    board.flip();
  }
  setTimeout(refreshBlindfoldVisibility, 100);
}

function updateFlipButton() {
  var btn = document.getElementById('flipBtn');
  if (!btn) return;
  if (gameMode === 'ai' && moveHistory.length === 0) {
    if (playerColor === 'w') {
      btn.innerHTML = 'Play as Black';
    } else {
      btn.innerHTML = 'Play as White';
    }
    btn.style.display = '';
  } else if (gameMode === 'ai') {
    btn.innerHTML = 'Flip Board';
    btn.style.display = '';
  } else {
    btn.innerHTML = 'Flip Board';
    btn.style.display = '';
  }
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

  if (gameMode === 'ai' && moveHistory.length > 0 && game.turn() !== playerColor) {
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
  updateBlindfoldVisibility(null);
  muteSounds = true;
  updateStatus();
  muteSounds = false;
  updateTheme();
  updateMoveHistory();
  updateCapturedPieces();
}

function changeGameMode() {
}

function changeDifficulty() {
  updateEloBadge();
updateAIProfile();
  if (stockfish) {
    var skillMap = { '1': 1, '2': 7, '3': 14, '4': 20, '5': 4 };
    stockfish.postMessage('setoption name Skill Level value ' + (skillMap[aiDifficulty] || 1));
  }
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
    timeExpired = true;
    stopTimer();
    if (whiteTime <= 0) {
      statusEl.textContent = 'Game Over — Black wins on time';
    } else {
      statusEl.textContent = 'Game Over — White wins on time';
    }
    boardEl.classList.add('theme-gameover');
    var m = document.getElementById('gameOverModal');
    var t = document.getElementById('gameOverTitle');
    var msg = document.getElementById('gameOverMessage');
    if (m) {
      if (t) t.textContent = 'Time Out';
      if (msg) msg.textContent = whiteTime <= 0 ? 'Black wins on time!' : 'White wins on time!';
      m.classList.add('show');
    }
    trackGameAchievement('timeout', whiteTime <= 0 ? 'b' : 'w');
  }
}

function updateTimers() {
  var whiteDisplay = document.querySelector('#whiteTimer .timer-display');
  var blackDisplay = document.querySelector('#blackTimer .timer-display');
  
  whiteDisplay.textContent = formatTime(whiteTime);
  blackDisplay.textContent = formatTime(blackTime);
  
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

function formatTime(seconds) {
  if (seconds >= 3600) {
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    return h + ':' + (m < 10 ? '0' : '') + m;
  }
  var mins = Math.floor(seconds / 60);
  var secs = seconds % 60;
  return mins + ':' + (secs < 10 ? '0' : '') + secs;
}

function applyIncrement(moveColor) {
  if (increment <= 0 || timeControl === 0) return;
  if (moveColor === 'w') {
    whiteTime += increment;
  } else {
    blackTime += increment;
  }
  updateTimers();
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  var btn = document.getElementById('soundToggle');
  btn.textContent = soundEnabled ? '🔊' : '🔇';
}

function playSound(type) {
  if (!soundEnabled || muteSounds) return;
  
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
    case 'achievement-bronze':
      var bronzeNotes = [523, 659];
      bronzeNotes.forEach((freq, i) => {
        var osc = audioContext.createOscillator();
        var gain = audioContext.createGain();
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, audioContext.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.15 + 0.25);
        osc.start(audioContext.currentTime + i * 0.15);
        osc.stop(audioContext.currentTime + i * 0.15 + 0.25);
      });
      break;
    case 'achievement-silver':
      var silverNotes = [523, 659, 784];
      silverNotes.forEach((freq, i) => {
        var osc = audioContext.createOscillator();
        var gain = audioContext.createGain();
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, audioContext.currentTime + i * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.14 + 0.25);
        osc.start(audioContext.currentTime + i * 0.14);
        osc.stop(audioContext.currentTime + i * 0.14 + 0.25);
      });
      break;
    case 'achievement-gold':
      var goldNotes = [523, 659, 784, 1047];
      goldNotes.forEach((freq, i) => {
        var osc = audioContext.createOscillator();
        var gain = audioContext.createGain();
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, audioContext.currentTime + i * 0.13);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.13 + 0.3);
        osc.start(audioContext.currentTime + i * 0.13);
        osc.stop(audioContext.currentTime + i * 0.13 + 0.3);
      });
      var shimmer = audioContext.createOscillator();
      var shimGain = audioContext.createGain();
      shimmer.type = 'sine';
      shimmer.connect(shimGain);
      shimGain.connect(audioContext.destination);
      shimmer.frequency.value = 2093;
      shimGain.gain.setValueAtTime(0.06, audioContext.currentTime + 0.5);
      shimGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.9);
      shimmer.start(audioContext.currentTime + 0.5);
      shimmer.stop(audioContext.currentTime + 0.9);
      break;
  }
}



board = Chessboard("myBoard", config);

if (puzzleMode) {
  loadPuzzle();
} else {
  initStockfish();
}
updateStatus();
if (typeof ShopSystem !== 'undefined') {
  var equippedBoard = ShopSystem.getEquippedBoard();
  boardEl.classList.remove('theme-cyber', 'theme-dark', 'theme-neon', 'theme-inferno', 'theme-arctic', 'theme-royal', 'theme-matrix', 'theme-rose');
  boardEl.classList.add(equippedBoard);
}
updateTheme();
updateTimers();
updateFlipButton();
updateEloBadge();
updateAIProfile();
initEvalBar();

if (blindfoldMode) {
  boardEl.classList.add('blindfold-mode');
  var blindBanner = document.getElementById('blindfoldBanner');
  if (blindBanner) blindBanner.style.display = '';
  var moveHistSection = document.getElementById('moveHistorySection');
  if (moveHistSection) moveHistSection.style.display = 'none';
  startBlindfoldObserver();
}

function updateEloBadge() {
}

function updateAIProfile() {
  var section = document.getElementById('aiProfileSection');
  var rivalSection = document.getElementById('rivalProfileSection');
  if (!section) return;
  if (urlMode === 'trial') {
    section.style.display = 'none';
    if (rivalSection) rivalSection.style.display = '';
    return;
  }
  if (gameMode !== 'ai') {
    section.style.display = 'none';
    if (rivalSection) rivalSection.style.display = 'none';
    return;
  }
  section.style.display = '';
  if (rivalSection) rivalSection.style.display = 'none';
  var nameEl = document.getElementById('aiProfileName');
  var eloEl = document.getElementById('aiProfileElo');
  var imgEl = document.getElementById('aiProfileImg');
  var profiles = {
    '1': { name: 'Nova', elo: '~600 ELO', img: 'images/beginner.jpg' },
    '2': { name: 'Phantom', elo: '~1400 ELO', img: 'images/medium1.jpg' },
    '3': { name: 'Overlord', elo: '~1800 ELO', img: 'images/medium2.jpg' },
    '4': { name: 'HyperGrid', elo: '3000+ ELO', img: 'images/master.jpg' },
    '5': { name: 'Blind', elo: '~1000 ELO', img: 'images/blind.jpg' }
  };
  var p = profiles[aiDifficulty] || profiles['1'];
  if (nameEl) nameEl.textContent = p.name;
  if (eloEl) eloEl.textContent = p.elo;
  if (imgEl) imgEl.src = p.img;
}

function highlightLastMove(from, to) {
  clearHighlights();
  var boardDiv = document.getElementById('myBoard');
  if (!boardDiv) return;
  var fromSq = boardDiv.querySelector('[data-squareid="' + from + '"]');
  var toSq = boardDiv.querySelector('[data-squareid="' + to + '"]');
  if (fromSq) fromSq.classList.add('highlight-lastmove');
  if (toSq) toSq.classList.add('highlight-lastmove');
}

function clearHighlights() {
  var boardDiv = document.getElementById('myBoard');
  if (!boardDiv) return;
  boardDiv.querySelectorAll('.highlight-lastmove').forEach(function(el) {
    el.classList.remove('highlight-lastmove');
  });
}

function updateBlindfoldVisibility(square) {
  if (!blindfoldMode) return;
  var boardDiv = document.getElementById('myBoard');
  if (!boardDiv) return;
  blindfoldVisibleSquare = square;
  boardDiv.querySelectorAll('.bf-show').forEach(function(el) {
    el.classList.remove('bf-show');
  });
  if (!square) return;
  var sqEl = boardDiv.querySelector('[data-squareid="' + square + '"]') ||
             boardDiv.querySelector('[data-square="' + square + '"]');
  if (sqEl) sqEl.classList.add('bf-show');
}

function refreshBlindfoldVisibility() {
  if (!blindfoldMode || !blindfoldVisibleSquare) return;
  updateBlindfoldVisibility(blindfoldVisibleSquare);
}

var bfObserver = null;
function startBlindfoldObserver() {
  if (bfObserver || !blindfoldMode) return;
  var boardDiv = document.getElementById('myBoard');
  if (!boardDiv) return;
  bfObserver = new MutationObserver(function() {
    if (blindfoldVisibleSquare) {
      var sqEl = boardDiv.querySelector('[data-squareid="' + blindfoldVisibleSquare + '"]') ||
                 boardDiv.querySelector('[data-square="' + blindfoldVisibleSquare + '"]');
      if (sqEl && !sqEl.classList.contains('bf-show')) {
        sqEl.classList.add('bf-show');
      }
    }
  });
  bfObserver.observe(boardDiv, { childList: true, subtree: true });
}

function isEvalBarEnabled() {
  try {
    if (typeof ShopSystem === 'undefined') return false;
    var inv = ShopSystem.getInventory();
    return inv && inv.powerups && inv.powerups.evalBar > 0;
  } catch (e) { return false; }
}

function initEvalBar() {
  var wrap = document.getElementById('evalBarWrap');
  if (!wrap) return;
  if (isEvalBarEnabled()) {
    wrap.style.display = 'flex';
    updateEvalBarDisplay();
  } else {
    wrap.style.display = 'none';
  }
}

function updateEvalBar(evalValue, isMate) {
  if (isMate) {
    evalMateScore = evalValue;
    currentEval = evalValue > 0 ? 10 : -10;
  } else {
    evalMateScore = null;
    currentEval = Math.max(-10, Math.min(10, evalValue));
  }
  updateEvalBarDisplay();
}

function updateEvalBarDisplay() {
  var fill = document.getElementById('evalBarFill');
  var label = document.getElementById('evalBarLabel');
  if (!fill || !label) return;

  var pct = 50 + (currentEval / 10) * 50;
  pct = Math.max(3, Math.min(97, pct));
  fill.style.width = pct + '%';
  label.style.left = pct + '%';

  if (pct > 55) {
    label.style.color = '#1a1a1a';
  } else {
    label.style.color = '#fff';
  }

  if (evalMateScore !== null) {
    var moves = Math.abs(evalMateScore);
    label.textContent = evalMateScore > 0 ? ('+M' + moves) : ('-M' + moves);
  } else {
    var display = currentEval;
    if (Math.abs(display) >= 10) {
      label.textContent = display > 0 ? '+10.0' : '-10.0';
    } else {
      var str = (display >= 0 ? '+' : '') + display.toFixed(1);
      label.textContent = str;
    }
  }
}

function showAIThinking() {
  var el = document.getElementById('aiThinking');
  if (el) el.style.display = 'flex';
}

function hideAIThinking() {
  var el = document.getElementById('aiThinking');
  if (el) el.style.display = 'none';
}

function loadPuzzle(previousId) {
  var urlParamsPuzzle = new URLSearchParams(window.location.search).get('puzzle');
  var solvedArr = (function() { try { return JSON.parse(localStorage.getItem('hypergrid_solved') || '[]'); } catch(e) { return []; } })();
  puzzlesCompleted = solvedArr.length;
  statusEl.textContent = 'Loading puzzle...';

  var puzzleControlsTop = document.getElementById('controlsTop');
  if (puzzleControlsTop) puzzleControlsTop.style.display = 'none';

  var puzzleBar = document.getElementById('puzzleBar');
  if (puzzleBar) puzzleBar.style.display = 'flex';

  var puzzleBtns = document.getElementById('puzzleButtons');
  if (puzzleBtns) puzzleBtns.style.display = 'flex';

  var normalBtns = document.getElementById('controlsBottom');
  if (normalBtns) normalBtns.style.display = 'none';

  var captureSection = document.getElementById('captureSection');
  if (captureSection) captureSection.style.display = 'none';

  var aiProfileSection = document.getElementById('aiProfileSection');
  if (aiProfileSection) aiProfileSection.style.display = 'none';

  var puzzleCoachSection = document.getElementById('puzzleCoachSection');
  if (puzzleCoachSection) puzzleCoachSection.style.display = '';

  var timerSection = document.getElementById('timerSection');
  if (timerSection) timerSection.style.display = 'none';
  var timerSection2 = document.getElementById('timerSection2');
  if (timerSection2) timerSection2.style.display = 'none';

  var moveHistorySection = document.getElementById('moveHistorySection');
  if (moveHistorySection) moveHistorySection.style.display = 'none';

  var puzzleProgressWidget = document.getElementById('puzzleProgressWidget');
  if (puzzleProgressWidget) puzzleProgressWidget.style.display = '';

  fetch('data/puzzles.json')
    .then(function(response) { return response.json(); })
    .then(function(data) {
      var puzzles = [];
      if (data.tiers) {
        for (var t = 0; t < data.tiers.length; t++) {
          for (var p = 0; p < data.tiers[t].puzzles.length; p++) {
            puzzles.push(data.tiers[t].puzzles[p]);
          }
        }
      } else if (data.puzzles) {
        puzzles = data.puzzles;
      }

      if (!puzzles || puzzles.length === 0) {
        statusEl.textContent = 'No puzzles available';
        return;
      }

      if (previousId) {
        puzzleIndex = puzzles.findIndex(function(p) { return p.id === previousId; });
        if (puzzleIndex === -1) puzzleIndex = 0;
        puzzleIndex = (puzzleIndex + 1) % puzzles.length;
      } else if (urlParamsPuzzle) {
        puzzleIndex = puzzles.findIndex(function(p) { return p.id === urlParamsPuzzle; });
        if (puzzleIndex === -1) puzzleIndex = 0;
      } else {
        var today = new Date();
        var daySeed = today.getFullYear() * 366 + (today.getMonth() + 1) * 31 + today.getDate();
        puzzleIndex = daySeed % puzzles.length;
      }
      puzzleData = puzzles[puzzleIndex];
      puzzleSolutionIndex = 0;
      puzzleSolved = false;
      puzzleFailed = false;
      puzzleHintShown = false;

      var loaded = game.load(puzzleData.fen);
      if (!loaded) {
        statusEl.textContent = 'Error loading puzzle position';
        return;
      }

      board.position(puzzleData.fen);
      moveHistory = [];
      capturedWhite = [];
      capturedBlack = [];
      gameStarted = false;
      stopTimer();

      var turnColor = game.turn();
      board.orientation(turnColor === 'b' ? 'black' : 'white');

      updateMoveHistory();
      updateCapturedPieces();
      updateTheme();

      statusEl.textContent = 'Find the best move!';
      setPuzzleStatusColor();

      var descEl = document.getElementById('puzzleDescription');
      if (descEl) descEl.textContent = puzzleData.description;

      var diffEl = document.getElementById('puzzleDifficulty');
      if (diffEl) diffEl.textContent = '\u2605'.repeat(puzzleData.difficulty) + '\u2606'.repeat(5 - puzzleData.difficulty);

      var movesEl = document.getElementById('puzzleMoves');
      if (movesEl) movesEl.textContent = 'Moves: ' + puzzleData.solution.length;

      var statusPuzzleEl = document.getElementById('puzzleStatus');
      if (statusPuzzleEl) statusPuzzleEl.textContent = 'Difficulty ' + puzzleData.difficulty + '/5';

      var hintEl = document.getElementById('puzzleHint');
      if (hintEl) hintEl.textContent = '';

      var solvedCountEl = document.getElementById('puzzlesSolvedCount');
      if (solvedCountEl) solvedCountEl.textContent = puzzlesCompleted;

      var progressEl = document.getElementById('puzzleProgress');
      if (progressEl) progressEl.textContent = 'Puzzle ' + (puzzleIndex + 1) + ' / ' + puzzles.length;

      updateRivalDialogue('start');
      updatePuzzleProgressWidget(data);
    })
    .catch(function(err) {
      console.error('Failed to load puzzles:', err);
      statusEl.textContent = 'Error loading puzzles. Try refreshing.';
    });
}

var rivalDialogues = {
  start: ["Think you can solve this?", "Let's see if you're worthy...", "Don't disappoint me."],
  correct: ["Lucky guess.", "Even a broken clock is right twice a day.", "Don't get cocky."],
  wrong: ["Is that the best you can do?", "Pathetic.", "Try harder, human.", "Amateur move."],
  hint: ["Taking the easy way out?", "Need help already?", "So predictable."],
  solved_easy: ["Beginner's luck.", "That was beneath me.", "Cute."],
  solved_medium: ["Not bad... for a human.", "You're starting to annoy me.", "I'll admit, that was decent."],
  solved_hard: ["Impressive. But you'll never beat me.", "You got lucky.", "Enjoy it while it lasts."],
  trial_unlocked: ["So you think you're ready? Come face me.", "Foolish. You dare challenge me?", "Your journey ends here."]
};

function updateRivalDialogue(event) {
  var coachEl = document.getElementById('coachDialogue');
  var barEl = document.getElementById('rivalDialogue');
  var messages = rivalDialogues[event] || rivalDialogues.start;
  var msg = messages[Math.floor(Math.random() * messages.length)];
  if (coachEl) coachEl.textContent = msg;
  if (barEl) barEl.textContent = msg;
}

function setPuzzleStatusColor() {
  statusEl.style.color = game.turn() === 'w' ? '#4ecdc4' : '#ba55d3';
}

function updatePuzzleProgressWidget(data) {
  var solved = (function() { try { return JSON.parse(localStorage.getItem('hypergrid_solved') || '[]'); } catch(e) { return []; } })();
  var tiers = data.tiers || [];
  var counts = [0, 0, 0];
  var totals = [0, 0, 0];

  for (var t = 0; t < tiers.length && t < 3; t++) {
    totals[t] = tiers[t].puzzles.length;
    for (var p = 0; p < tiers[t].puzzles.length; p++) {
      if (solved.indexOf(tiers[t].puzzles[p].id) !== -1) {
        counts[t]++;
      }
    }
  }

  var ids = ['Easy', 'Medium', 'Hard'];
  for (var i = 0; i < 3; i++) {
    var countEl = document.getElementById('progress' + ids[i]);
    if (countEl) countEl.textContent = counts[i] + '/' + totals[i];
    var barEl = document.getElementById('progress' + ids[i] + 'Bar');
    if (barEl) barEl.style.width = (totals[i] > 0 ? (counts[i] / totals[i] * 100) : 0) + '%';
  }

  var totalEl = document.getElementById('progressTotal');
  var totalSolved = counts[0] + counts[1] + counts[2];
  var totalAll = totals[0] + totals[1] + totals[2];
  if (totalEl) totalEl.textContent = totalSolved + ' / ' + totalAll + ' solved';
}

function markPuzzleSolved(puzzleId) {
  var solved = (function() { try { return JSON.parse(localStorage.getItem('hypergrid_solved') || '[]'); } catch(e) { return []; } })();
  if (solved.indexOf(puzzleId) === -1) {
    solved.push(puzzleId);
    localStorage.setItem('hypergrid_solved', JSON.stringify(solved));
  }
}

function getPuzzleProgress() {
  var solved = (function() { try { return JSON.parse(localStorage.getItem('hypergrid_solved') || '[]'); } catch(e) { return []; } })();
  return solved;
}

function isTrialUnlocked() {
  return localStorage.getItem('hypergrid_trial_unlocked') === 'true';
}

function showPuzzleHint() {
  if (!puzzleData || puzzleSolved) return;
  var hintEl = document.getElementById('puzzleHint');
  if (!hintEl) return;

  if (puzzleHintShown) {
    hintEl.textContent = '';
    puzzleHintShown = false;
  } else {
    hintEl.textContent = puzzleData.hint;
    hintEl.style.color = '#f9ca24';
    puzzleHintShown = true;
    achievementHintUsed = true;
    updateRivalDialogue('hint');
  }
}

function showPuzzleCompleteModal(pData) {
  fetch('data/puzzles.json')
    .then(function(r) { return r.json(); })
    .then(function(data) { updatePuzzleProgressWidget(data); })
    .catch(function() {});
  var modal = document.getElementById('puzzleCompleteModal');
  var title = document.getElementById('puzzleCompleteTitle');
  var msg = document.getElementById('puzzleCompleteMessage');
  if (!modal) return;
  if (title) title.textContent = 'Puzzle Solved!';
  if (msg) msg.textContent = pData.description;
  modal.classList.add('show');
}

function hidePuzzleCompleteModal() {
  var modal = document.getElementById('puzzleCompleteModal');
  if (modal) modal.classList.remove('show');
}

function nextPuzzle() {
  var currentId = puzzleData ? puzzleData.id : null;
  puzzleData = null;
  puzzleSolutionIndex = 0;
  puzzleSolved = false;
  puzzleFailed = false;
  puzzleHintShown = false;
  achievementHintUsed = false;
  statusEl.style.color = '';
  loadPuzzle(currentId);
}

function resetPuzzle() {
  if (!puzzleData) return;
  game.load(puzzleData.fen);
  board.position(puzzleData.fen);
  moveHistory = [];
  capturedWhite = [];
  capturedBlack = [];
  puzzleSolutionIndex = 0;
  puzzleSolved = false;
  puzzleFailed = false;
  puzzleHintShown = false;
  achievementHintUsed = false;
  statusEl.textContent = 'Find the best move!';
  setPuzzleStatusColor();
  updateMoveHistory();
  updateCapturedPieces();
  updateTheme();

  var hintEl = document.getElementById('puzzleHint');
  if (hintEl) hintEl.textContent = '';
  var statusPuzzleEl = document.getElementById('puzzleStatus');
  if (statusPuzzleEl) statusPuzzleEl.textContent = 'Difficulty ' + puzzleData.difficulty + '/5';
}

function updateMaterialAdvantage() {
  var pieceValues = { 'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9 };
  var whiteScore = 0;
  var blackScore = 0;
  capturedBlack.forEach(function(p) { whiteScore += pieceValues[p] || 0; });
  capturedWhite.forEach(function(p) { blackScore += pieceValues[p] || 0; });
  var diff = whiteScore - blackScore;
  var whiteEl = document.getElementById('materialWhite');
  var blackEl = document.getElementById('materialBlack');
  if (whiteEl) whiteEl.textContent = diff > 0 ? '+' + diff : '';
  if (blackEl) blackEl.textContent = diff < 0 ? '+' + Math.abs(diff) : '';
}

function showSettingsModal() {
  populateSettingsDropdowns();
  document.getElementById('settingsModal').classList.add('show');
}

function hideSettingsModal() {
  document.getElementById('settingsModal').classList.remove('show');
}

function populateSettingsDropdowns() {
  var themeSelect = document.getElementById('themeSelect');
  var pieceSelect = document.getElementById('pieceSelect');
  var powerupSettings = document.getElementById('powerupSettings');
  var powerupList = document.getElementById('powerupList');

  if (typeof ShopSystem === 'undefined') return;

  var inv = ShopSystem.getInventory();
  var items = ShopSystem.getItems();

  themeSelect.innerHTML = '';
  for (var i = 0; i < items.boards.length; i++) {
    var b = items.boards[i];
    if (inv.boards.indexOf(b.id) !== -1) {
      var opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name;
      if (inv.equippedBoard === b.id) opt.selected = true;
      themeSelect.appendChild(opt);
    }
  }

  pieceSelect.innerHTML = '';
  for (var j = 0; j < items.pieces.length; j++) {
    var p = items.pieces[j];
    if (inv.pieces.indexOf(p.id) !== -1) {
      var popt = document.createElement('option');
      popt.value = p.id;
      popt.textContent = p.name;
      if (inv.equippedPieces === p.id) popt.selected = true;
      pieceSelect.appendChild(popt);
    }
  }

  var hasPowerups = false;
  powerupList.innerHTML = '';
  for (var k = 0; k < items.powerups.length; k++) {
    var pw = items.powerups[k];
    var count = inv.powerups[pw.id] || 0;
    if (count > 0) {
      hasPowerups = true;
      var div = document.createElement('div');
      div.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:0.85rem;';
      div.innerHTML = '<span>' + pw.icon + ' ' + pw.name + '</span><span style="color:#ffd700">x' + count + '</span>';
      powerupList.appendChild(div);
    }
  }
  powerupSettings.style.display = hasPowerups ? '' : 'none';
}

function changePieceSet() {
  var select = document.getElementById('pieceSelect');
  var set = select.value;
  if (typeof ShopSystem !== 'undefined') {
    ShopSystem.equip('pieces', set);
  }
  config.pieceTheme = function (piece) {
    return getPieceTheme(piece);
  };
  board = Chessboard("myBoard", {
    draggable: true,
    position: game.fen(),
    pieceTheme: getPieceTheme,
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
  });
  if (playerColor === 'b') board.orientation('black');
  updateTheme();
  if (blindfoldMode) {
    boardEl.classList.add('blindfold-mode');
    startBlindfoldObserver();
  }
}

function changeBoardTheme() {
  var select = document.getElementById('themeSelect');
  var theme = select.value;
  boardEl.classList.remove('theme-cyber', 'theme-dark', 'theme-neon', 'theme-inferno', 'theme-arctic', 'theme-royal', 'theme-matrix', 'theme-rose');
  boardEl.classList.add(theme);
  if (typeof ShopSystem !== 'undefined') {
    ShopSystem.equip('boards', theme);
  }
}

function hideGameOverModal() {
  document.getElementById('gameOverModal').classList.remove('show');
}
