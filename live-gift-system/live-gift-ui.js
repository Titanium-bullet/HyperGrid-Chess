var GiftUI = (function () {
  var container = null;
  var cardQueue = [];
  var activeCards = [];
  var MAX_CARDS = 3;

  function init() {
    if (container) return;
    container = document.createElement('div');
    container.id = 'giftCardContainer';
    container.style.cssText = 'position:fixed;top:50%;right:30px;transform:translateY(-50%);z-index:9003;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
    document.body.appendChild(container);
  }

  function showGiftCard(giftConfig, sender, combo, cb) {
    init();
    var card = document.createElement('div');
    card.className = 'gift-card gift-card-' + giftConfig.rarity;
    card.innerHTML =
      '<div class="gift-card-header">' +
        '<span class="gift-card-icon">' + giftConfig.icon + '</span>' +
        '<span class="gift-card-rarity" style="color:' + giftConfig.rarityColor + '">' + giftConfig.rarityLabel + '</span>' +
      '</div>' +
      '<div class="gift-card-body">' +
        '<div class="gift-card-sender">' + escapeHtml(sender) + '</div>' +
        '<div class="gift-card-action">sent</div>' +
        '<div class="gift-card-name" style="color:' + giftConfig.rarityColor + '">' + giftConfig.name + '</div>' +
      '</div>' +
      (combo > 1 ? '<div class="gift-card-combo" style="--combo-color:' + giftConfig.rarityColor + '">x' + combo + '</div>' : '');

    card.style.opacity = '0';
    card.style.transform = 'translateX(120%) scale(0.8)';
    card.style.position = 'relative';
    container.appendChild(card);
    activeCards.push(card);

    gsap.to(card, {
      opacity: 1,
      x: 0,
      scale: 1,
      duration: 0.8,
      ease: 'back.out(1.4)',
      onComplete: function () {
        gsap.to(card, {
          y: -3, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: -1
        });
      }
    });

    var displayTime = giftConfig.displayTime || 3000;
    setTimeout(function () {
      gsap.to(card, {
        opacity: 0,
        x: 80,
        scale: 0.7,
        duration: 0.5,
        ease: 'power2.in',
        onComplete: function () {
          if (card.parentNode) card.parentNode.removeChild(card);
          var idx = activeCards.indexOf(card);
          if (idx !== -1) activeCards.splice(idx, 1);
          if (cb) cb();
        }
      });
    }, displayTime);

    if (combo > 1) {
      animateCombo(combo, giftConfig.rarityColor);
    }
  }

  function animateCombo(combo, color) {
    var existing = document.getElementById('giftComboDisplay');
    if (existing) existing.parentNode.removeChild(existing);

    var el = document.createElement('div');
    el.id = 'giftComboDisplay';
    el.className = 'gift-combo-display';
    el.style.cssText = '--combo-color:' + color + ';';
    el.textContent = 'x' + combo;
    document.body.appendChild(el);

    gsap.fromTo(el,
      { scale: 0.3, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2)' }
    );
    gsap.to(el, { scale: 1.1, duration: 0.3, ease: 'sine.inOut', yoyo: true, repeat: 2 });

    setTimeout(function () {
      gsap.to(el, { opacity: 0, scale: 1.5, duration: 0.5, ease: 'power2.in', onComplete: function () { if (el.parentNode) el.parentNode.removeChild(el); } });
    }, 2000);

    if (combo >= 10) {
      var label = combo >= 100 ? 'MEGA COMBO!' : combo >= 50 ? 'COMBO x50!' : combo >= 30 ? 'COMBO x30!' : 'COMBO x10!';
      showComboLabel(label, color);
    }
  }

  function showComboLabel(text, color) {
    var el = document.createElement('div');
    el.className = 'gift-combo-label';
    el.style.cssText = 'color:' + color + ';';
    el.textContent = text;
    document.body.appendChild(el);

    gsap.fromTo(el,
      { scale: 0, opacity: 0, y: 20 },
      { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'back.out(2)' }
    );
    setTimeout(function () {
      gsap.to(el, { opacity: 0, y: -30, duration: 0.6, ease: 'power2.in', onComplete: function () { if (el.parentNode) el.parentNode.removeChild(el); } });
    }, 2500);
  }

  function screenFlash(color, opacity, duration) {
    var flash = document.createElement('div');
    flash.className = 'gift-screen-flash';
    flash.style.background = 'radial-gradient(ellipse at center, ' + color + ' ' + opacity + ', transparent 70%)';
    document.body.appendChild(flash);

    gsap.fromTo(flash, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: 'power2.out' });
    gsap.to(flash, { opacity: 0, duration: (duration || 600) / 1000, ease: 'power2.in', delay: 0.15, onComplete: function () { if (flash.parentNode) flash.parentNode.removeChild(flash); } });
  }

  function screenShake(intensity, duration) {
    var el = document.body;
    var tl = gsap.timeline();
    var steps = Math.floor((duration || 500) / 40);
    for (var i = 0; i < steps; i++) {
      var x = (Math.random() - 0.5) * 2 * intensity;
      var y = (Math.random() - 0.5) * 2 * intensity;
      tl.to(el, { x: x, y: y, duration: 0.04, ease: 'none' });
    }
    tl.to(el, { x: 0, y: 0, duration: 0.1, ease: 'power2.out' });
  }

  function showBrightnessBoost(opacity, duration) {
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,' + (opacity || 0.08) + ');z-index:8999;pointer-events:none;';
    document.body.appendChild(el);
    gsap.to(el, { opacity: 0, duration: (duration || 3000) / 1000, ease: 'power2.in', onComplete: function () { if (el.parentNode) el.parentNode.removeChild(el); } });
  }

  function clearAll() {
    if (container) {
      while (container.firstChild) container.removeChild(container.firstChild);
    }
    activeCards = [];
    var combo = document.getElementById('giftComboDisplay');
    if (combo && combo.parentNode) combo.parentNode.removeChild(combo);
    document.querySelectorAll('.gift-combo-label, .gift-screen-flash, .gift-god-rays').forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  }

  function destroy() {
    clearAll();
    if (container && container.parentNode) container.parentNode.removeChild(container);
    container = null;
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  return {
    init: init,
    showGiftCard: showGiftCard,
    screenFlash: screenFlash,
    screenShake: screenShake,
    showBrightnessBoost: showBrightnessBoost,
    clearAll: clearAll,
    destroy: destroy
  };
})();
