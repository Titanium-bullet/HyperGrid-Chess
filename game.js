var board = null;
var game = new Chess();
var pendingMove = null; 
var statusEl = document.getElementById("status");
var boardEl = document.getElementById("myBoard");
function getPieceTheme(piece){
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
function onDragStart(source, piece){
  if(game.game_over()) return false;
  if((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
     (game.turn() === 'b' && piece.search(/^w/) !== -1)){
    return false;
  }
}
function onDrop(source, target){

  var moves = game.moves({verbose: true});
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

  if(move === null){
    boardEl.classList.add("flash-red");
    setTimeout(() => {
      boardEl.classList.remove("flash-red");
    }, 450);
    return 'snapback';
  }

  boardEl.setAttribute('data-valid-move', 'true');
}
function onSnapEnd(){
  board.position(game.fen());
  if (boardEl.hasAttribute('data-valid-move')) {
    updateStatus();
    updateTheme();
    boardEl.removeAttribute('data-valid-move');
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
    // Actually apply the move in chess.js now that we know the piece
    game.move({
      from: pendingMove.from,
      to: pendingMove.to,
      promotion: pieceType
    });
   
    // Update the visual board
    board.position(game.fen());
    pendingMove = null;
   
    updateStatus();
    updateTheme();
  }
}
// --- STATUS AND THEME LOGIC --- //
function updateStatus(){
  requestAnimationFrame(() => {
    var status = '';
    var moveColor = game.turn() === 'w' ? 'White' : 'Black';
    if(game.in_checkmate()){
      status = `Game Over — ${moveColor} is checkmated`;
    }
    else if(game.in_draw()){
      status = 'Game Over — Draw';
    }
    else{
      status = `${moveColor}'s turn`;
      if(game.in_check()) status += ' (CHECK!)';
    }
    statusEl.textContent = status;
  });
}
function updateTheme() {
  // Strip all dynamic themes to start fresh on every move
  boardEl.classList.remove(
    'theme-white',
    'theme-black',
    'theme-check',
    'theme-gameover',
    'theme-draw'
  );
  document.querySelectorAll('#myBoard img')
    .forEach(p => p.classList.remove('mate-piece'));
  if(game.in_checkmate()){
    boardEl.classList.add('theme-gameover');
    // Color only the defeated side pieces red
    let defeated = game.turn();
    document.querySelectorAll(`#myBoard img[src*="${defeated}"]`)
      .forEach(p => p.classList.add('mate-piece'));
  }
  else if(game.in_draw()){
    boardEl.classList.add('theme-draw');
  }
  else if(game.in_check()){
    boardEl.classList.add('theme-check');
  }
  else if(game.turn() === 'w'){
    boardEl.classList.add('theme-white');
  }
  else{
    boardEl.classList.add('theme-black');
  }
}
function resetGame(){
  game.reset();
  board.start();
  updateStatus();
  updateTheme();
}
function flipBoard(){
  board.flip();
  updateStatus();
  updateTheme();
}
board = Chessboard("myBoard", config);
updateStatus();
updateTheme();
