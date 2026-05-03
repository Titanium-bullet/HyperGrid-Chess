var AchievementTracker = (function () {
  var STATS_KEY = 'hypergrid_stats';
  var ACHIEVEMENTS_KEY = 'hypergrid_achievements';

  var defaultStats = {
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    gamesDrawn: 0,
    aiWins: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    pvpWins: { w: 0, b: 0 },
    trialWins: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
    puzzlesSolved: 0,
    puzzlesSolvedNoHint: 0,
    totalMoves: 0,
    enPassants: 0,
    castles: 0,
    promotions: 0,
    queensCaptured: 0,
    gamesWonNoPieceLost: 0,
    fastestWinMoves: 999,
    totalPlayTimeSeconds: 0
  };

  var ACHIEVEMENTS = {
    first_blood: {
      name: 'First Blood',
      icon: '\u2694',
      category: 'victories',
      description: 'Win games against AI',
      tiers: [
        { label: 'Bronze', threshold: 1 },
        { label: 'Silver', threshold: 5 },
        { label: 'Gold', threshold: 25 }
      ],
      getValue: function (s) { return s.gamesWon; }
    },
    nova_slayer: {
      name: 'Nova Slayer',
      icon: '\uD83C\uDF1F',
      category: 'victories',
      description: 'Defeat Nova (~600 ELO)',
      tiers: [
        { label: 'Bronze', threshold: 1 },
        { label: 'Silver', threshold: 3 },
        { label: 'Gold', threshold: 10 }
      ],
      getValue: function (s) { return (s.aiWins['1'] || 0); }
    },
    phantom_slayer: {
      name: 'Phantom Slayer',
      icon: '\uD83D\uDC7B',
      category: 'victories',
      description: 'Defeat Phantom (~1400 ELO)',
      tiers: [
        { label: 'Bronze', threshold: 1 },
        { label: 'Silver', threshold: 3 },
        { label: 'Gold', threshold: 10 }
      ],
      getValue: function (s) { return (s.aiWins['2'] || 0); }
    },
    overlord_slayer: {
      name: 'Overlord Slayer',
      icon: '\uD83D\uDC51',
      category: 'victories',
      description: 'Defeat Overlord (~1800 ELO)',
      tiers: [
        { label: 'Bronze', threshold: 1 },
        { label: 'Silver', threshold: 3 },
        { label: 'Gold', threshold: 10 }
      ],
      getValue: function (s) { return (s.aiWins['3'] || 0); }
    },
    hypergrid_slayer: {
      name: 'HyperGrid Slayer',
      icon: '\uD83D\uDD25',
      category: 'victories',
      description: 'Defeat HyperGrid (3000+ ELO)',
      tiers: [
        { label: 'Bronze', threshold: 1 },
        { label: 'Silver', threshold: 3 },
        { label: 'Gold', threshold: 5 }
      ],
      getValue: function (s) { return (s.aiWins['4'] || 0); }
    },
    blind_slayer: {
      name: 'Blind Slayer',
      icon: '\uD83D\uDC41',
      category: 'victories',
      description: 'Defeat Blind (~1000 ELO) in Blindfold Mode',
      tiers: [
        { label: 'Bronze', threshold: 1 },
        { label: 'Silver', threshold: 3 },
        { label: 'Gold', threshold: 10 }
      ],
      getValue: function (s) { return (s.aiWins['5'] || 0); }
    },
    rookie_solver: {
      name: 'Rookie Solver',
      icon: '\uD83D\uDCA1',
      category: 'puzzles',
      description: 'Solve Rookie (easy) puzzles',
      tiers: [
        { label: 'Bronze', threshold: 3 },
        { label: 'Silver', threshold: 10 },
        { label: 'Gold', threshold: 10 }
      ],
      getValue: function (s) { return s.easyPuzzlesSolved || 0; },
      getExtra: function (s) {
        if (s.easyPuzzlesNoHint >= 10) return { goldMet: true };
        return { goldMet: false };
      },
      goldOverride: 'Solve all 10 without hints'
    },
    tactician: {
      name: 'Tactician',
      icon: '\uD83C\uDFAF',
      category: 'puzzles',
      description: 'Solve Tactical (medium) puzzles',
      tiers: [
        { label: 'Bronze', threshold: 3 },
        { label: 'Silver', threshold: 10 },
        { label: 'Gold', threshold: 10 }
      ],
      getValue: function (s) { return s.mediumPuzzlesSolved || 0; },
      getExtra: function (s) {
        if (s.mediumPuzzlesNoHint >= 10) return { goldMet: true };
        return { goldMet: false };
      },
      goldOverride: 'Solve all 10 without hints'
    },
    mastermind: {
      name: 'Mastermind',
      icon: '\uD83E\uDDE0',
      category: 'puzzles',
      description: 'Solve Master (hard) puzzles',
      tiers: [
        { label: 'Bronze', threshold: 3 },
        { label: 'Silver', threshold: 10 },
        { label: 'Gold', threshold: 10 }
      ],
      getValue: function (s) { return s.hardPuzzlesSolved || 0; },
      getExtra: function (s) {
        if (s.hardPuzzlesNoHint >= 10) return { goldMet: true };
        return { goldMet: false };
      },
      goldOverride: 'Solve all 10 without hints'
    },
    puzzle_master: {
      name: 'Puzzle Master',
      icon: '\uD83E\uDDE9',
      category: 'puzzles',
      description: 'Solve puzzles in total',
      tiers: [
        { label: 'Bronze', threshold: 10 },
        { label: 'Silver', threshold: 20 },
        { label: 'Gold', threshold: 30 }
      ],
      getValue: function (s) { return s.puzzlesSolved; }
    },
    spectre_challenger: {
      name: 'Spectre Challenger',
      icon: '\uD83D\uDC7E',
      category: 'trial',
      description: 'Challenge SPECTRE in the Monster Trial',
      tiers: [
        { label: 'Bronze', threshold: 1 },
        { label: 'Silver', threshold: 1 },
        { label: 'Gold', threshold: 1 }
      ],
      getValue: function (s) { return s.trialAttempts || 0; },
      silverOverride: 'Complete the trial',
      goldOverride: 'Defeat SPECTRE'
    },
    spectre_slayer: {
      name: 'Spectre Slayer',
      icon: '\u26A1',
      category: 'trial',
      description: 'Defeat SPECTRE in the Monster Trial',
      tiers: [
        { label: 'Bronze', threshold: 1 },
        { label: 'Silver', threshold: 3 },
        { label: 'Gold', threshold: 5 }
      ],
      getValue: function (s) { return s.trialWins; }
    },
    en_passant: {
      name: 'En Passant',
      icon: '\u2194',
      category: 'moves',
      description: 'Perform en passant captures',
      tiers: [
        { label: 'Bronze', threshold: 1 },
        { label: 'Silver', threshold: 3 },
        { label: 'Gold', threshold: 10 }
      ],
      getValue: function (s) { return s.enPassants; }
    },
    castle_master: {
      name: 'Castle Master',
      icon: '\uD83C\uDFF0',
      category: 'moves',
      description: 'Castle your king',
      tiers: [
        { label: 'Bronze', threshold: 1 },
        { label: 'Silver', threshold: 5 },
        { label: 'Gold', threshold: 20 }
      ],
      getValue: function (s) { return s.castles; }
    },
    promotion_master: {
      name: 'Promotion Master',
      icon: '\uD83D\uDC51',
      category: 'moves',
      description: 'Promote pawns',
      tiers: [
        { label: 'Bronze', threshold: 1 },
        { label: 'Silver', threshold: 3 },
        { label: 'Gold', threshold: 10 }
      ],
      getValue: function (s) { return s.promotions; }
    },
    queen_hunter: {
      name: 'Queen Hunter',
      icon: '\uD83D\uDDE1',
      category: 'moves',
      description: 'Capture opponent queens',
      tiers: [
        { label: 'Bronze', threshold: 1 },
        { label: 'Silver', threshold: 3 },
        { label: 'Gold', threshold: 10 }
      ],
      getValue: function (s) { return s.queensCaptured; }
    },
    speed_demon: {
      name: 'Speed Demon',
      icon: '\u26A1',
      category: 'challenges',
      description: 'Win a game in few moves',
      tiers: [
        { label: 'Bronze', threshold: 1 },
        { label: 'Silver', threshold: 1 },
        { label: 'Gold', threshold: 1 }
      ],
      getValue: function (s) {
        if (s.fastestWinMoves <= 15) return 1;
        if (s.fastestWinMoves <= 20) return 1;
        if (s.fastestWinMoves <= 30) return 1;
        return 0;
      },
      bronzeOverride: 'Win in under 30 moves',
      silverOverride: 'Win in under 20 moves',
      goldOverride: 'Win in under 15 moves',
      customCheck: function (s) {
        if (s.fastestWinMoves <= 30) return 1;
        return 0;
      },
      customLevel: function (s) {
        if (s.fastestWinMoves <= 15) return 3;
        if (s.fastestWinMoves <= 20) return 2;
        if (s.fastestWinMoves <= 30) return 1;
        return 0;
      }
    },
    iron_defense: {
      name: 'Iron Defense',
      icon: '\uD83D\uDEE1',
      category: 'challenges',
      description: 'Win without losing pieces',
      tiers: [
        { label: 'Bronze', threshold: 1 },
        { label: 'Silver', threshold: 1 },
        { label: 'Gold', threshold: 1 }
      ],
      getValue: function (s) { return s.gamesWonNoPieceLost > 0 ? 1 : 0; },
      bronzeOverride: 'Win losing 3 or fewer pieces',
      silverOverride: 'Win losing 1 or fewer pieces',
      goldOverride: 'Win losing no pieces',
      customCheck: function (s) {
        if ((s.gamesWonMaxLoss || 999) <= 3) return 1;
        return 0;
      },
      customLevel: function (s) {
        var loss = s.gamesWonMaxLoss != null ? s.gamesWonMaxLoss : 999;
        if (loss <= 0) return 3;
        if (loss <= 1) return 2;
        if (loss <= 3) return 1;
        return 0;
      }
    },
    on_fire: {
      name: 'On Fire',
      icon: '\uD83D\uDD25',
      category: 'challenges',
      description: 'Build a win streak',
      tiers: [
        { label: 'Bronze', threshold: 2 },
        { label: 'Silver', threshold: 5 },
        { label: 'Gold', threshold: 10 }
      ],
      getValue: function (s) { return s.bestWinStreak; }
    },
    dark_side: {
      name: 'Dark Side',
      icon: '\uD83C\uDF19',
      category: 'challenges',
      description: 'Win games playing as Black',
      tiers: [
        { label: 'Bronze', threshold: 1 },
        { label: 'Silver', threshold: 3 },
        { label: 'Gold', threshold: 10 }
      ],
      getValue: function (s) { return (s.pvpWins['b'] || 0) + (s.aiWinsAsBlack || 0); }
    },
    pvp_warrior: {
      name: 'PvP Warrior',
      icon: '\uD83E\uDD1D',
      category: 'challenges',
      description: 'Win Two Player games',
      tiers: [
        { label: 'Bronze', threshold: 1 },
        { label: 'Silver', threshold: 5 },
        { label: 'Gold', threshold: 15 }
      ],
      getValue: function (s) { return (s.pvpWins['w'] || 0) + (s.pvpWins['b'] || 0); }
    },
    dedicated: {
      name: 'Dedicated Player',
      icon: '\u23F3',
      category: 'stats',
      description: 'Play games',
      tiers: [
        { label: 'Bronze', threshold: 5 },
        { label: 'Silver', threshold: 25 },
        { label: 'Gold', threshold: 100 }
      ],
      getValue: function (s) { return s.gamesPlayed; }
    },
    centurion: {
      name: 'Centurion',
      icon: '\u265F',
      category: 'stats',
      description: 'Make moves',
      tiers: [
        { label: 'Bronze', threshold: 50 },
        { label: 'Silver', threshold: 200 },
        { label: 'Gold', threshold: 1000 }
      ],
      getValue: function (s) { return s.totalMoves; }
    },
    marathon: {
      name: 'Marathon',
      icon: '\u23F1',
      category: 'stats',
      description: 'Total time playing',
      tiers: [
        { label: 'Bronze', threshold: 600 },
        { label: 'Silver', threshold: 3600 },
        { label: 'Gold', threshold: 18000 }
      ],
      getValue: function (s) { return s.totalPlayTimeSeconds; },
      formatValue: function (v) {
        if (v >= 3600) return Math.floor(v / 3600) + 'h ' + Math.floor((v % 3600) / 60) + 'm';
        if (v >= 60) return Math.floor(v / 60) + 'm';
        return v + 's';
      }
    },
    completionist: {
      name: 'Completionist',
      icon: '\u2B50',
      category: 'stats',
      description: 'Unlock all other achievements',
      tiers: [
        { label: 'Bronze', threshold: 50 },
        { label: 'Silver', threshold: 80 },
        { label: 'Gold', threshold: 100 }
      ],
      getValue: function (s) {
        var total = 0;
        var unlocked = 0;
        var keys = Object.keys(ACHIEVEMENTS);
        for (var i = 0; i < keys.length; i++) {
          if (keys[i] === 'completionist') continue;
          total++;
          var a = AchievementTracker.getState()[keys[i]];
          if (a && a.level > 0) unlocked++;
        }
        return total > 0 ? Math.round((unlocked / total) * 100) : 0;
      }
    }
  };

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getStats() {
    try {
      var raw = localStorage.getItem(STATS_KEY);
      if (!raw) return deepClone(defaultStats);
      var parsed = JSON.parse(raw);
      var merged = deepClone(defaultStats);
      for (var key in parsed) {
        if (parsed.hasOwnProperty(key)) {
          merged[key] = parsed[key];
        }
      }
      return merged;
    } catch (e) {
      return deepClone(defaultStats);
    }
  }

  function saveStats(stats) {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (e) {}
  }

  function getState() {
    try {
      var raw = localStorage.getItem(ACHIEVEMENTS_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (e) {
      return {};
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function enrichStatsWithPuzzles(stats) {
    var solvedIds = [];
    var noHintIds = [];
    try {
      solvedIds = JSON.parse(localStorage.getItem('hypergrid_solved') || '[]');
    } catch (e) {}
    try {
      noHintIds = JSON.parse(localStorage.getItem('hypergrid_solved_no_hint') || '[]');
    } catch (e) {}

    var easySolved = 0, mediumSolved = 0, hardSolved = 0;
    var easyNoHint = 0, mediumNoHint = 0, hardNoHint = 0;
    for (var i = 0; i < solvedIds.length; i++) {
      var tier = solvedIds[i].charAt(0);
      if (tier === 'e') easySolved++;
      else if (tier === 'm') mediumSolved++;
      else if (tier === 'h') hardSolved++;
    }
    for (var j = 0; j < noHintIds.length; j++) {
      var t = noHintIds[j].charAt(0);
      if (t === 'e') easyNoHint++;
      else if (t === 'm') mediumNoHint++;
      else if (t === 'h') hardNoHint++;
    }
    stats.easyPuzzlesSolved = easySolved;
    stats.mediumPuzzlesSolved = mediumSolved;
    stats.hardPuzzlesSolved = hardSolved;
    stats.easyPuzzlesNoHint = easyNoHint;
    stats.mediumPuzzlesNoHint = mediumNoHint;
    stats.hardPuzzlesNoHint = hardNoHint;
    stats.puzzlesSolved = solvedIds.length;
    return stats;
  }

  function checkAchievements() {
    var stats = getStats();
    stats = enrichStatsWithPuzzles(stats);
    var state = getState();
    var newlyUnlocked = [];

    var keys = Object.keys(ACHIEVEMENTS);
    for (var i = 0; i < keys.length; i++) {
      var id = keys[i];
      var def = ACHIEVEMENTS[id];
      var current = state[id] || { level: 0, unlockedAt: [] };
      var newLevel = current.level;

      if (def.customLevel) {
        var cl = def.customLevel(stats);
        if (cl > newLevel) {
          newLevel = cl;
        }
      } else {
        var val = def.getValue(stats);
        for (var t = def.tiers.length - 1; t >= 0; t--) {
          var tierMet = false;
          if (def.goldOverride && t === 2 && def.getExtra) {
            tierMet = def.getExtra(stats).goldMet;
          } else {
            tierMet = val >= def.tiers[t].threshold;
          }
          if (tierMet && (t + 1) > newLevel) {
            newLevel = t + 1;
            break;
          }
        }
      }

      while (current.unlockedAt.length < newLevel) {
        current.unlockedAt.push(Date.now());
      }
      current.level = newLevel;
      state[id] = current;

      if (newLevel > (state[id] ? 0 : 0) && newLevel > 0) {
        newlyUnlocked.push({ id: id, level: newLevel, def: def });
      }
    }

    saveState(state);
    return newlyUnlocked;
  }

  function checkAndNotify() {
    var newly = checkAchievements();
    for (var i = 0; i < newly.length; i++) {
      var n = newly[i];
      var tierName = n.def.tiers[Math.min(n.level - 1, n.def.tiers.length - 1)].label;
      showToast(n.def.name, tierName, n.def.icon);

      if (typeof ShopSystem !== 'undefined') {
        var coinReward = 0;
        if (tierName === 'Bronze') coinReward = 10;
        else if (tierName === 'Silver') coinReward = 25;
        else if (tierName === 'Gold') coinReward = 50;
        if (coinReward > 0) {
          ShopSystem.awardCoins(coinReward);
        }
      }
    }
  }

  function showToast(name, tier, icon) {
    var existing = document.getElementById('achievement-toast-container');
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'achievement-toast-container';
      existing.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
      document.body.appendChild(existing);
    }

    var tierLower = (tier || 'bronze').toLowerCase();
    var toast = document.createElement('div');
    toast.className = 'achievement-toast toast-' + tierLower;
    toast.innerHTML =
      '<div class="achievement-toast-icon">' + icon + '</div>' +
      '<div class="achievement-toast-body">' +
        '<div class="achievement-toast-label">Achievement Unlocked!</div>' +
        '<div class="achievement-toast-name">' + name +
          ' <span class="toast-tier-dot ' + tierLower + '"></span>' +
          '<span class="toast-tier-text ' + tierLower + '">' + tier + '</span>' +
        '</div>' +
      '</div>';

    existing.appendChild(toast);

    if (tierLower === 'silver') {
      var silverFlash = document.createElement('div');
      silverFlash.className = 'achievement-silver-flash';
      document.body.appendChild(silverFlash);
      setTimeout(function () {
        if (silverFlash.parentNode) silverFlash.parentNode.removeChild(silverFlash);
      }, 1100);
    }

    if (tierLower === 'gold') {
      toast.classList.add('toast-shake');
      var flash = document.createElement('div');
      flash.className = 'achievement-gold-flash';
      document.body.appendChild(flash);
      setTimeout(function () {
        if (flash.parentNode) flash.parentNode.removeChild(flash);
      }, 1500);
      setTimeout(function () {
        toast.classList.remove('toast-shake');
      }, 1000);
    }

    if (typeof playSound === 'function') {
      playSound('achievement-' + tierLower);
    }

    setTimeout(function () {
      toast.classList.add('achievement-toast-fade');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 600);
    }, 10000);
  }

  function trackMove(move) {
    var stats = getStats();
    stats.totalMoves++;

    if (move.san) {
      if (move.san.indexOf('O-O') === 0) {
        stats.castles++;
      }
      if (move.san === 'e.p.' || (move.flags && move.flags.indexOf('e') >= 0)) {
        stats.enPassants++;
      }
    }
    if (move.captured && move.captured === 'q') {
      stats.queensCaptured++;
    }
    if (move.promotion) {
      stats.promotions++;
    }

    saveStats(stats);
  }

  function trackGameEnd(result, data) {
    var stats = getStats();
    stats.gamesPlayed++;

    if (data && data.playTime && data.playTime > 0) {
      stats.totalPlayTimeSeconds += data.playTime;
    }

    if (result === 'win') {
      stats.gamesWon++;
      stats.currentWinStreak++;
      if (stats.currentWinStreak > stats.bestWinStreak) {
        stats.bestWinStreak = stats.currentWinStreak;
      }

      if (data) {
        if (data.mode === 'ai' && data.difficulty) {
          if (!stats.aiWins[data.difficulty]) stats.aiWins[data.difficulty] = 0;
          stats.aiWins[data.difficulty]++;
        }
        if (data.mode === 'ai' && data.playerColor === 'b') {
          stats.aiWinsAsBlack = (stats.aiWinsAsBlack || 0) + 1;
        }
        if (data.mode === 'pvp' && data.winnerColor) {
          if (!stats.pvpWins[data.winnerColor]) stats.pvpWins[data.winnerColor] = 0;
          stats.pvpWins[data.winnerColor]++;
        }
        if (data.mode === 'trial') {
          stats.trialWins = (stats.trialWins || 0) + 1;
        }
        if (data.moveCount && data.moveCount < stats.fastestWinMoves) {
          stats.fastestWinMoves = data.moveCount;
        }
        if (data.playerPiecesLost != null) {
          if (data.playerPiecesLost <= 0) {
            stats.gamesWonNoPieceLost = (stats.gamesWonNoPieceLost || 0) + 1;
          }
          if (stats.gamesWonMaxLoss == null || data.playerPiecesLost < stats.gamesWonMaxLoss) {
            stats.gamesWonMaxLoss = data.playerPiecesLost;
          }
        }
      }
    } else if (result === 'loss') {
      stats.gamesLost++;
      stats.currentWinStreak = 0;
    } else if (result === 'draw') {
      stats.gamesDrawn++;
      stats.currentWinStreak = 0;
    }

    if (data && data.mode === 'trial') {
      stats.trialAttempts = (stats.trialAttempts || 0) + 1;
    }

    saveStats(stats);
    checkAndNotify();
  }

  function trackPuzzleSolved(puzzleId, usedHint) {
    var stats = getStats();
    stats.puzzlesSolved = (stats.puzzlesSolved || 0) + 1;
    if (!usedHint) {
      stats.puzzlesSolvedNoHint = (stats.puzzlesSolvedNoHint || 0) + 1;
    }
    saveStats(stats);

    if (!usedHint) {
      var noHintIds = [];
      try { noHintIds = JSON.parse(localStorage.getItem('hypergrid_solved_no_hint') || '[]'); } catch (e) {}
      if (noHintIds.indexOf(puzzleId) === -1) {
        noHintIds.push(puzzleId);
        localStorage.setItem('hypergrid_solved_no_hint', JSON.stringify(noHintIds));
      }
    }

    if (!usedHint && typeof ShopSystem !== 'undefined') {
      ShopSystem.awardCoins(3);
    }

    checkAndNotify();
  }

  return {
    getDefinitions: function () { return ACHIEVEMENTS; },
    getStats: getStats,
    getState: getState,
    enrichStatsWithPuzzles: enrichStatsWithPuzzles,
    trackMove: trackMove,
    trackGameEnd: trackGameEnd,
    trackPuzzleSolved: trackPuzzleSolved,
    checkAndNotify: checkAndNotify,
    showToast: showToast
  };
})();
