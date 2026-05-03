var LiveGiftSystem = (function () {
  var comboMap = {};
  var queue = [];
  var processing = false;
  var muted = false;

  function sendGift(opts) {
    var id = opts.id;
    var sender = opts.sender || 'Anonymous';
    var combo = opts.combo;

    var cfg = GIFT_EFFECTS[id];
    if (!cfg) return;

    if (combo == null) {
      var now = Date.now();
      if (comboMap[id] && (now - comboMap[id].lastTime) < GIFT_COMBO_TIMEOUT) {
        comboMap[id].count++;
      } else {
        comboMap[id] = { count: 1, lastTime: now };
      }
      comboMap[id].lastTime = now;
      combo = comboMap[id].count;
    }

    queue.push({ cfg: cfg, sender: sender, combo: combo });
    if (!processing) processQueue();
  }

  function processQueue() {
    if (queue.length === 0) { processing = false; return; }
    processing = true;
    var item = queue.shift();
    executeGift(item.cfg, item.sender, item.combo, function () {
      setTimeout(function () { processQueue(); }, 200);
    });
  }

  function executeGift(cfg, sender, combo, cb) {
    if (muted) { if (cb) cb(); return; }

    GiftParticleEngine.init();
    GiftUI.init();

    GiftUI.showGiftCard(cfg, sender, combo);

    if (cfg.screenFlash) {
      setTimeout(function () {
        GiftUI.screenFlash(cfg.screenFlash.color, cfg.screenFlash.opacity, cfg.screenFlash.duration);
      }, 300);
    }

    if (cfg.shakeIntensity > 0) {
      setTimeout(function () {
        GiftUI.screenShake(cfg.shakeIntensity, cfg.shakeDuration || 500);
      }, 400);
    }

    if (cfg.rarity === 'mythic') {
      GiftUI.showBrightnessBoost(0.1, cfg.duration);
    }

    GiftEffectOrchestrator.playEffect(cfg, combo);
    GiftEffectOrchestrator.playComboEffect(combo, cfg.rarityColor);

    setTimeout(function () {
      cleanup(cfg);
      if (cb) cb();
    }, cfg.duration + 500);
  }

  function cleanup(cfg) {
    if (queue.length === 0) {
      setTimeout(function () {
        GiftParticleEngine.clear();
      }, 1000);
    }
  }

  function setMuted(v) { muted = v; }
  function isMuted() { return muted; }

  function clearQueue() {
    queue = [];
    GiftEffectOrchestrator.cleanup();
    GiftParticleEngine.clear();
    GiftUI.clearAll();
    processing = false;
  }

  function destroy() {
    clearQueue();
    GiftParticleEngine.destroy();
    GiftUI.destroy();
    GiftModelFactory.destroy();
    comboMap = {};
  }

  function getCombo(giftId) {
    return comboMap[giftId] ? comboMap[giftId].count : 0;
  }

  function resetCombo(giftId) {
    delete comboMap[giftId];
  }

  return {
    sendGift: sendGift,
    setMuted: setMuted,
    isMuted: isMuted,
    clearQueue: clearQueue,
    destroy: destroy,
    getCombo: getCombo,
    resetCombo: resetCombo
  };
})();
