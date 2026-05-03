var ShopSystem = (function () {
  var COINS_KEY = 'hypergrid_coins';
  var INVENTORY_KEY = 'hypergrid_inventory';

  var SHOP_ITEMS = {
    boards: [
      { id: 'theme-cyber', name: 'Midnight', price: 0, description: 'Dark navy/purple gradient', preview: ['#1a1a2e', '#0f3460'] },
      { id: 'theme-dark', name: 'Shadow', price: 0, description: 'Flat dark minimal', preview: ['#2a2a3a', '#1a1a2a'] },
      { id: 'theme-neon', name: 'Neon City', price: 0, description: 'Bright neon green/cyan squares', preview: ['#0a2a2a', '#003333'] },
      { id: 'theme-inferno', name: 'Inferno', price: 0, description: 'Red/orange fire gradient', preview: ['#2a0a0a', '#3a1500'] },
      { id: 'theme-arctic', name: 'Arctic', price: 0, description: 'Ice blue/white frosted', preview: ['#1a2a3a', '#0a1a2a'] },
      { id: 'theme-royal', name: 'Royal', price: 0, description: 'Gold/marble ornate', preview: ['#2a2a1a', '#1a1a0a'] },
      { id: 'theme-matrix', name: 'Matrix', price: 0, description: 'Green-on-black code aesthetic', preview: ['#0a0a0a', '#001a00'] },
      { id: 'theme-rose', name: 'Rose', price: 0, description: 'Dark dusty rose glow', preview: ['#2a1a20', '#3d1f2a'] }
    ],
    pieces: [
      { id: 'pixel', name: 'Pixel', price: 0, description: 'Retro pixel art style' },
      { id: 'alpha', name: 'Alpha', price: 0, description: 'Clean modern design' },
      { id: 'cburnett', name: 'CBurnett', price: 0, description: 'Detailed tournament style' },
      { id: 'maestro', name: 'Maestro', price: 0, description: 'Artistic stylized' },
      { id: 'merida', name: 'Merida', price: 0, description: 'Classic tournament style' },
      { id: 'tatiana', name: 'Tatiana', price: 0, description: 'Elegant classic Russian' }
    ],
    powerups: [
      { id: 'bestMove', name: 'Best Move Hint', price: 0, qty: 3, description: 'Highlights the engine\'s top move', icon: '\uD83D\uDCA1' },
      { id: 'evalBar', name: 'Eval Bar', price: 0, qty: 1, description: 'Shows position advantage bar', icon: '\uD83D\uDCCA' },
      { id: 'legalMoves', name: 'Legal Move Highlights', price: 0, qty: 5, description: 'Highlights all legal moves on select', icon: '\u2B50' },
      { id: 'undoPack', name: 'Undo Pack', price: 0, qty: 5, description: 'Extra undo uses', icon: '\u21A9' }
    ],
    gifts: [
      { id: 'coffee', name: 'Coffee', price: 0, affinity: 3, icon: '\u2615', description: 'A warm cup of comfort', universal: false },
      { id: 'rose', name: 'Rose', price: 0, affinity: 6, icon: '\uD83C\uDF39', description: 'A symbol of affection', universal: false },
      { id: 'watch', name: 'Luxury Watch', price: 0, affinity: 12, icon: '\u231A', description: 'Time is precious', universal: false },
      { id: 'giftbox', name: 'Gift Box', price: 0, affinity: 20, icon: '\uD83C\uDF81', description: 'What could be inside?', universal: false },
      { id: 'diamond', name: 'Diamond Ring', price: 0, affinity: 30, icon: '\uD83D\uDC8E', description: 'For someone truly special', universal: false },
      { id: 'car', name: 'Luxury Car', price: 0, affinity: 75, icon: '\uD83C\uDFCE', description: '+15 affinity for ALL AI opponents', universal: true },
      { id: 'cruise', name: 'Cruise Ship', price: 0, affinity: 100, icon: '\uD83D\uDEA2', description: '+20 affinity for ALL AI opponents', universal: true },
      { id: 'island', name: 'Private Island', price: 0, affinity: 125, icon: '\uD83C\uDFD6', description: '+25 affinity for ALL AI opponents', universal: true }
    ]
  };

  var AFFINITY_KEY = 'hypergrid_affinity';

  var defaultInventory = {
    equippedBoard: 'theme-cyber',
    equippedPieces: 'pixel',
    boards: ['theme-cyber', 'theme-dark'],
    pieces: ['pixel'],
    powerups: { bestMove: 0, evalBar: 0, legalMoves: 0, undoPack: 0 }
  };

  function getCoins() {
    try { return parseInt(localStorage.getItem(COINS_KEY)) || 0; }
    catch (e) { return 0; }
  }

  function saveCoins(amount) {
    try { localStorage.setItem(COINS_KEY, JSON.stringify(amount)); }
    catch (e) {}
  }

  function addCoins(amount) {
    var current = getCoins();
    saveCoins(current + amount);
    return current + amount;
  }

  function getInventory() {
    try {
      var raw = localStorage.getItem(INVENTORY_KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaultInventory));
      var inv = JSON.parse(raw);
      var def = JSON.parse(JSON.stringify(defaultInventory));
      for (var key in def) {
        if (!(key in inv)) inv[key] = def[key];
      }
      return inv;
    } catch (e) {
      return JSON.parse(JSON.stringify(defaultInventory));
    }
  }

  function saveInventory(inv) {
    try { localStorage.setItem(INVENTORY_KEY, JSON.stringify(inv)); }
    catch (e) {}
  }

  function owns(category, id) {
    var inv = getInventory();
    if (category === 'boards') return inv.boards.indexOf(id) !== -1;
    if (category === 'pieces') return inv.pieces.indexOf(id) !== -1;
    return false;
  }

  function buy(category, id) {
    var items;
    if (category === 'boards') items = SHOP_ITEMS.boards;
    else if (category === 'pieces') items = SHOP_ITEMS.pieces;
    else if (category === 'powerups') items = SHOP_ITEMS.powerups;
    else return { success: false, reason: 'invalid_category' };

    var item = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) { item = items[i]; break; }
    }
    if (!item) return { success: false, reason: 'not_found' };

    var coins = getCoins();
    if (coins < item.price) return { success: false, reason: 'insufficient_coins' };

    var inv = getInventory();

    if (category === 'boards') {
      if (inv.boards.indexOf(id) !== -1) return { success: false, reason: 'already_owned' };
      coins = addCoins(-item.price);
      inv.boards.push(id);
    } else if (category === 'pieces') {
      if (inv.pieces.indexOf(id) !== -1) return { success: false, reason: 'already_owned' };
      coins = addCoins(-item.price);
      inv.pieces.push(id);
    } else if (category === 'powerups') {
      coins = addCoins(-item.price);
      inv.powerups[id] = (inv.powerups[id] || 0) + item.qty;
    }

    saveInventory(inv);
    return { success: true, item: item, coinsRemaining: coins };
  }

  function equip(category, id) {
    var inv = getInventory();
    if (category === 'boards') {
      if (inv.boards.indexOf(id) === -1) return false;
      inv.equippedBoard = id;
    } else if (category === 'pieces') {
      if (inv.pieces.indexOf(id) === -1) return false;
      inv.equippedPieces = id;
    } else {
      return false;
    }
    saveInventory(inv);
    return true;
  }

  function usePowerup(id) {
    var inv = getInventory();
    if (!inv.powerups[id] || inv.powerups[id] <= 0) return false;
    inv.powerups[id]--;
    saveInventory(inv);
    return true;
  }

  function getEquippedBoard() {
    var inv = getInventory();
    return inv.equippedBoard || 'theme-cyber';
  }

  function getEquippedPieces() {
    var inv = getInventory();
    return inv.equippedPieces || 'pixel';
  }

  function getPieceUrl(piece) {
    var set = getEquippedPieces();
    return 'https://lichess1.org/assets/piece/' + set + '/' + piece + '.svg';
  }

  function getPowerupCount(id) {
    var inv = getInventory();
    return inv.powerups[id] || 0;
  }

  function awardCoins(amount, reason) {
    var newTotal = addCoins(amount);
    return newTotal;
  }

  function getAffinity(aiId) {
    try {
      var raw = localStorage.getItem(AFFINITY_KEY);
      if (!raw) return 0;
      var data = JSON.parse(raw);
      return parseFloat(data[aiId]) || 0;
    } catch (e) { return 0; }
  }

  function addAffinity(aiId, amount) {
    var data = {};
    try {
      var raw = localStorage.getItem(AFFINITY_KEY);
      if (raw) data = JSON.parse(raw);
    } catch (e) {}
    var current = parseFloat(data[aiId]) || 0;
    data[aiId] = Math.round((current + amount) * 100) / 100;
    try { localStorage.setItem(AFFINITY_KEY, JSON.stringify(data)); }
    catch (e) {}
    return data[aiId];
  }

  function getRelationshipLevel(points) {
    if (points >= 300) return { name: 'Soulmate', icon: '\uD83D\uDC96', color: '#ff69b4' };
    if (points >= 150) return { name: 'Close Friend', icon: '\uD83E\uDD1D', color: '#ffd700' };
    if (points >= 50) return { name: 'Friend', icon: '\uD83D\uDC4B', color: '#4ecdc4' };
    if (points >= 10) return { name: 'Acquaintance', icon: '\uD83D\uDE0A', color: '#88cc88' };
    return { name: 'Stranger', icon: '\uD83D\uDC64', color: '#888' };
  }

  function buyGift(id) {
    var item = null;
    for (var i = 0; i < SHOP_ITEMS.gifts.length; i++) {
      if (SHOP_ITEMS.gifts[i].id === id) { item = SHOP_ITEMS.gifts[i]; break; }
    }
    if (!item) return { success: false, reason: 'not_found' };

    var coins = getCoins();
    if (coins < item.price) return { success: false, reason: 'insufficient_coins' };

    coins = addCoins(-item.price);
    return { success: true, item: item, coinsRemaining: coins };
  }

  function applyGift(giftId, aiId) {
    var item = null;
    for (var i = 0; i < SHOP_ITEMS.gifts.length; i++) {
      if (SHOP_ITEMS.gifts[i].id === giftId) { item = SHOP_ITEMS.gifts[i]; break; }
    }
    if (!item) return { success: false };
    if (item.universal) {
      var keys = ['1', '2', '3', '4', '5'];
      var perAi = Math.round((item.affinity / keys.length) * 100) / 100;
      for (var j = 0; j < keys.length; j++) {
        addAffinity(keys[j], perAi);
      }
      return { success: true, aiId: 'all', affinity: item.affinity };
    } else {
      var newAff = addAffinity(aiId, item.affinity);
      return { success: true, aiId: aiId, affinity: item.affinity, newAffinity: newAff };
    }
  }

  return {
    getItems: function () { return SHOP_ITEMS; },
    getCoins: getCoins,
    addCoins: addCoins,
    getInventory: getInventory,
    owns: owns,
    buy: buy,
    equip: equip,
    usePowerup: usePowerup,
    getEquippedBoard: getEquippedBoard,
    getEquippedPieces: getEquippedPieces,
    getPieceUrl: getPieceUrl,
    getPowerupCount: getPowerupCount,
    awardCoins: awardCoins,
    getAffinity: getAffinity,
    addAffinity: addAffinity,
    getRelationshipLevel: getRelationshipLevel,
    buyGift: buyGift,
    applyGift: applyGift
  };
})();
