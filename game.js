const boardEl = document.getElementById("myBoard");
const statusEl = document.getElementById("status");
const pieceImages = boardEl.querySelectorAll('img');
const defeatedPiecesSelector = `#myBoard img[src*="w"], #myBoard img[src*="b"]`;

let board = null;
const game = new Chess();
let pendingMove = null;

function getPieceTheme(piece) {
  return `https://lichess1.org/assets/piece/pixel/${piece}.svg`;
}

const config = {
  draggable: true,
  position: 'start',
  pieceTheme: getPieceTheme,
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
};

function onDragStart(source, piece) {
  if (game.game_over()) return false;
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
     (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }
}

function onDrop(source, target) {
  const moves = game.moves({ verbose: true });
  const promoMove = moves.find(m => m.from === source && m.to === target && m.promotion);
  if (promoMove) {
    pendingMove = { from: source, to: target };
    showPromotionModal(game.turn());
    return 'snapback';
  }

  try {
    const move = game.move({
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

    boardEl.setAttribute('data-valid-move', 'true');
  } catch (e) {
    boardEl.classList.add("flash-red");
    setTimeout(() => {
      boardEl.classList.remove("flash-red");
    }, 450);
    return 'snapback';
  }
}

function onSnapEnd() {
  board.position(game.fen());
  if (boardEl.hasAttribute('data-valid-move')) {
    updateStatus();
    updateTheme();
    boardEl.removeAttribute('data-valid-move');
  }
}

function showPromotionModal(color) {
  const modal = document.getElementById('promotionModal');
  const container = document.getElementById('promoPieces');
  container.innerHTML = '';

  const pieces = ['q', 'r', 'b', 'n'];

  pieces.forEach(p => {
    const img = document.createElement('img');
    img.src = getPieceTheme(color + p.toUpperCase());
    img.className = 'promo-piece';
    img.onclick = () => promote(p);
    container.appendChild(img);
  });

  modal.classList.add('show');
}

function promote(pieceType) {
  const modal = document.getElementById('promotionModal');
  modal.classList.remove('show');

  if (pendingMove) {
    game.move({
      from: pendingMove.from,
      to: pendingMove.to,
      promotion: pieceType
    });

    board.position(game.fen());
    pendingMove = null;

    updateStatus();
    updateTheme();
  }
}

function updateStatus() {
  requestAnimationFrame(() => {
    let status = '';
    const moveColor = game.turn() === 'w' ? 'White' : 'Black';
    if (game.in_checkmate()) {
      status = `Game Over — ${moveColor} is checkmated`;
    } else if (game.in_draw()) {
      status = 'Game Over — Draw';
    } else {
      status = `${moveColor}'s turn`;
      if (game.in_check()) status += ' (CHECK!)';
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

  const currentPieceImages = boardEl.querySelectorAll('img');
  currentPieceImages.forEach(p => p.classList.remove('mate-piece'));

  if (game.in_checkmate()) {
    boardEl.classList.add('theme-gameover');
    const defeated = game.turn();
    boardEl.querySelectorAll(`img[src*="${defeated}"]`)
      .forEach(p => p.classList.add('mate-piece'));
  } else if (game.in_draw()) {
    boardEl.classList.add('theme-draw');
  } else if (game.in_check()) {
    boardEl.classList.add('theme-check');
  } else if (game.turn() === 'w') {
    boardEl.classList.add('theme-white');
  } else {
    boardEl.classList.add('theme-black');
  }
}

function resetGame() {
  game.reset();
  board.start();
  updateStatus();
  updateTheme();
}

function flipBoard() {
  board.flip();
  updateStatus();
  updateTheme();
}

board = Chessboard("myBoard", config);
updateStatus();
updateTheme();
