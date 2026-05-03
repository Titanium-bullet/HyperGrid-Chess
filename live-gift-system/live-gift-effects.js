var GiftEffectOrchestrator = (function () {
  var timers = [];

  function clearAllTimers() {
    for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
    timers = [];
  }

  function addTimer(fn, delay) {
    var id = setTimeout(fn, delay);
    timers.push(id);
    return id;
  }

  function playEffect(giftConfig, combo) {
    clearAllTimers();
    var W = window.innerWidth;
    var H = window.innerHeight;
    var cx = W / 2;
    var cy = H / 2;
    var colors = giftConfig.colors;
    var count = giftConfig.particleCount;
    var dur = giftConfig.duration;

    if (combo >= 50) count = Math.floor(count * 1.5);
    if (combo >= 100) count = Math.floor(count * 2);

    if (giftConfig.rarity === 'epic') playEpic(cx, cy, colors, count, dur, combo, giftConfig);
    else if (giftConfig.rarity === 'legendary') playLegendary(cx, cy, colors, count, dur, combo, giftConfig);
    else if (giftConfig.rarity === 'mythic') playMythic(cx, cy, colors, count, dur, combo, giftConfig);
  }

  function playEpic(cx, cy, colors, count, dur, combo, cfg) {
    GiftParticleEngine.init();

    GiftParticleEngine.burst(cx, cy, Math.floor(count * 0.6), {
      speed: 5, speedVar: 0.7, spread: 30,
      size: 5, endSize: 0, colors: colors,
      alpha: 1, life: 2.5, drag: 0.955, z: 2, ay: 0.02
    });

    GiftParticleEngine.burst(cx, cy, Math.floor(count * 0.3), {
      speed: 8, speedVar: 0.5, spread: 5,
      size: 3, endSize: 0, colors: colors,
      alpha: 0.8, life: 1.5, drag: 0.94, z: 1, ay: 0.04
    });

    GiftParticleEngine.fountain(cx, cy + 50, Math.floor(count * 0.1), {
      speed: 7, spread: 1.0,
      size: 6, endSize: 0, colors: ['#FFD700', '#FFFFFF'],
      alpha: 1, life: 2, drag: 0.96, z: 2, ay: 0.05
    });

    addTimer(function () {
      GiftParticleEngine.burst(cx + (Math.random() - 0.5) * 200, cy + (Math.random() - 0.5) * 100,
        Math.floor(count * 0.3), {
          speed: 4, speedVar: 0.6, spread: 20,
          size: 4, endSize: 0, colors: colors,
          alpha: 0.9, life: 2, drag: 0.96, z: 2, ay: 0.03
        });
    }, 800);

    addTimer(function () {
      GiftParticleEngine.fountain(cx, cy, Math.floor(count * 0.15), {
        speed: 6, spread: 0.6,
        size: 5, endSize: 0, colors: ['#FF8C00', '#FFD700'],
        alpha: 1, life: 1.8, drag: 0.95, z: 2, ay: 0.06
      });
    }, 1500);

    if (cfg.has3DModel) {
      GiftModelFactory.showModel(cfg.modelType, dur, function () {});
    }

    if (typeof confetti === 'function') {
      confetti({ particleCount: 80, spread: 80, origin: { x: 0.5, y: 0.6 }, colors: colors.map(function (c) { return c; }) });
      addTimer(function () {
        confetti({ particleCount: 50, spread: 60, origin: { x: 0.3, y: 0.5 }, colors: colors });
      }, 600);
    }

    playGiftSound('epic', combo);
  }

  function playLegendary(cx, cy, colors, count, dur, combo, cfg) {
    GiftParticleEngine.init();

    GiftParticleEngine.rain(Math.floor(count * 0.35), {
      colors: colors, vy: 3, ay: 0.01,
      size: 4, endSize: 2, alpha: 0.6,
      life: 4, z: 0
    });

    GiftParticleEngine.burst(cx, cy, Math.floor(count * 0.3), {
      speed: 4, speedVar: 0.5, spread: 40,
      size: 6, endSize: 1, colors: colors,
      alpha: 1, life: 3, drag: 0.97, z: 2, ay: 0.01
    });

    GiftParticleEngine.fountain(cx, cy + 80, Math.floor(count * 0.15), {
      speed: 6, spread: 0.5,
      size: 5, endSize: 0, colors: ['#FFFFFF', '#87CEEB'],
      alpha: 1, life: 2.5, drag: 0.96, z: 2, ay: 0.04
    });

    addTimer(function () {
      GiftParticleEngine.firework(cx - 150, cy - 100, {
        count: 60, speed: 5, colors: ['#00BFFF', '#FFFFFF', '#87CEEB'],
        life: 1.8, size: 4, z: 2
      });
    }, 1000);

    addTimer(function () {
      GiftParticleEngine.firework(cx + 120, cy - 80, {
        count: 50, speed: 4.5, colors: ['#1E90FF', '#00CED1', '#FFFFFF'],
        life: 1.5, size: 3.5, z: 2
      });
    }, 2000);

    addTimer(function () {
      GiftParticleEngine.firework(cx, cy - 120, {
        count: 70, speed: 6, colors: colors,
        life: 2, size: 5, z: 2
      });
    }, 3200);

    addTimer(function () {
      GiftParticleEngine.rain(Math.floor(count * 0.2), {
        colors: colors, vy: 2.5, ay: 0.008,
        size: 3, endSize: 1, alpha: 0.5,
        life: 3.5, z: 0
      });
    }, 2500);

    if (cfg.has3DModel) {
      GiftModelFactory.showModel(cfg.modelType, dur, function () {});
    }

    if (typeof confetti === 'function') {
      confetti({ particleCount: 100, spread: 100, origin: { x: 0.5, y: 0.5 }, colors: colors });
      addTimer(function () {
        confetti({ particleCount: 60, spread: 70, origin: { x: 0.7, y: 0.4 }, colors: colors, angle: 120 });
      }, 1200);
      addTimer(function () {
        confetti({ particleCount: 60, spread: 70, origin: { x: 0.3, y: 0.4 }, colors: colors, angle: 60 });
      }, 2400);
    }

    playGiftSound('legendary', combo);
  }

  function playMythic(cx, cy, colors, count, dur, combo, cfg) {
    GiftParticleEngine.init();

    GiftParticleEngine.rain(Math.floor(count * 0.15), {
      colors: ['#00FF7F', '#7CFC00', '#FFD700'], vy: 1.5, ay: 0.005,
      size: 8, endSize: 3, alpha: 0.3, life: 5, z: 0
    });

    GiftParticleEngine.rain(Math.floor(count * 0.2), {
      colors: ['#FFFFFF', '#FFD1DC', '#87CEFA'], vy: 2, ay: 0.008,
      size: 5, endSize: 2, alpha: 0.5, life: 4, z: 1
    });

    GiftParticleEngine.burst(cx, cy, Math.floor(count * 0.2), {
      speed: 5, speedVar: 0.6, spread: 50,
      size: 7, endSize: 1, colors: colors,
      alpha: 1, life: 3.5, drag: 0.975, z: 2, ay: 0.008
    });

    GiftParticleEngine.fountain(cx, cy + 100, Math.floor(count * 0.1), {
      speed: 8, spread: 1.2,
      size: 6, endSize: 0, colors: ['#FFD700', '#FF69B4', '#FFFFFF'],
      alpha: 1, life: 2.5, drag: 0.96, z: 2, ay: 0.04
    });

    var fwDelays = [600, 1400, 2400, 3600, 5000];
    var fwColors = [
      ['#FF4500', '#FFD700', '#FF69B4'],
      ['#00BFFF', '#FFFFFF', '#9370DB'],
      ['#00FF7F', '#7CFC00', '#FFD700'],
      ['#FF69B4', '#FFD1DC', '#FFFFFF'],
      ['#FFD700', '#FF8C00', '#FFFFFF']
    ];
    var fwX = [-200, 180, -100, 150, 0];
    var fwY = [-150, -120, -180, -100, -200];
    for (var i = 0; i < fwDelays.length; i++) {
      (function (idx) {
        addTimer(function () {
          GiftParticleEngine.firework(cx + fwX[idx], cy + fwY[idx], {
            count: 80, speed: 6, colors: fwColors[idx],
            life: 2, size: 5, z: 2
          });
        }, fwDelays[idx]);
      })(i);
    }

    addTimer(function () {
      GiftParticleEngine.rain(Math.floor(count * 0.1), {
        colors: colors, vy: 3, ay: 0.01,
        size: 4, endSize: 1, alpha: 0.4, life: 3, z: 2
      });
    }, 3000);

    addTimer(function () {
      GiftParticleEngine.fountain(cx - 100, cy + 60, 40, {
        speed: 6, spread: 0.8,
        size: 5, endSize: 0, colors: ['#FF69B4', '#FFD700'],
        alpha: 1, life: 2, drag: 0.95, z: 2, ay: 0.05
      });
    }, 2000);

    addTimer(function () {
      GiftParticleEngine.fountain(cx + 100, cy + 60, 40, {
        speed: 6, spread: 0.8,
        size: 5, endSize: 0, colors: ['#00BFFF', '#FFFFFF'],
        alpha: 1, life: 2, drag: 0.95, z: 2, ay: 0.05
      });
    }, 2200);

    if (cfg.has3DModel) {
      addTimer(function () {
        GiftModelFactory.showModel(cfg.modelType, dur - 2000, function () {});
      }, 500);
    }

    if (typeof confetti === 'function') {
      confetti({ particleCount: 150, spread: 120, origin: { x: 0.5, y: 0.5 }, colors: colors, startVelocity: 35 });
      addTimer(function () { confetti({ particleCount: 80, spread: 90, origin: { x: 0.2, y: 0.5 }, colors: colors }); }, 1500);
      addTimer(function () { confetti({ particleCount: 80, spread: 90, origin: { x: 0.8, y: 0.5 }, colors: colors }); }, 2000);
      addTimer(function () { confetti({ particleCount: 100, spread: 100, origin: { x: 0.5, y: 0.3 }, colors: colors, startVelocity: 40 }); }, 3500);
      addTimer(function () { confetti({ particleCount: 60, spread: 80, origin: { x: 0.4, y: 0.4 }, colors: colors }); }, 5500);
    }

    showGodRays(cx, cy, colors, dur);
    playGiftSound('mythic', combo);
  }

  function showGodRays(cx, cy, colors, dur) {
    var raysContainer = document.createElement('div');
    raysContainer.className = 'gift-god-rays';
    raysContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9000;pointer-events:none;overflow:hidden;';

    var rayCount = 8;
    for (var i = 0; i < rayCount; i++) {
      var ray = document.createElement('div');
      var angle = (360 / rayCount) * i;
      var c = colors[i % colors.length] || '#FFD700';
      var rgb = GiftParticleEngine.htr(c);
      ray.style.cssText =
        'position:absolute;top:-50%;left:' + (10 + (80 / rayCount) * i) + '%;' +
        'width:' + (20 + Math.random() * 40) + 'px;height:200%;' +
        'background:linear-gradient(180deg,rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.3) 0%,rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0) 100%);' +
        'transform:rotate(' + (angle * 0.1 - 5 + Math.random() * 10) + 'deg);' +
        'opacity:0;filter:blur(15px);';
      raysContainer.appendChild(ray);
    }
    document.body.appendChild(raysContainer);

    gsap.to(raysContainer.children, { opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power2.out' });
    addTimer(function () {
      gsap.to(raysContainer, { opacity: 0, duration: 1.5, ease: 'power2.in', onComplete: function () { if (raysContainer.parentNode) raysContainer.parentNode.removeChild(raysContainer); } });
    }, dur - 2000);
  }

  function playComboEffect(combo, rarityColor) {
    if (!combo || combo < 10) return;
    GiftParticleEngine.init();
    var cx = window.innerWidth / 2;
    var cy = window.innerHeight / 2;

    if (combo >= 100) {
      GiftParticleEngine.burst(cx, cy, 120, {
        speed: 7, speedVar: 0.6, spread: 10,
        size: 6, endSize: 0, colors: ['#FFD700', '#FF69B4', '#FFFFFF', '#00BFFF', '#FF4500'],
        alpha: 1, life: 2, drag: 0.95, z: 2, ay: 0.02
      });
    } else if (combo >= 50) {
      GiftParticleEngine.burst(cx, cy, 80, {
        speed: 6, spread: 10,
        size: 5, endSize: 0, colors: ['#FFD700', '#FF69B4', '#FFFFFF'],
        alpha: 1, life: 1.8, drag: 0.95, z: 2
      });
    } else if (combo >= 30) {
      GiftParticleEngine.burst(cx, cy, 50, {
        speed: 5, spread: 15,
        size: 4, endSize: 0, colors: ['#FFD700', '#FF4500'],
        alpha: 0.9, life: 1.5, drag: 0.96, z: 2
      });
    } else if (combo >= 10) {
      GiftParticleEngine.burst(cx, cy, 25, {
        speed: 4, spread: 20,
        size: 3, endSize: 0, colors: ['#FFD700'],
        alpha: 0.8, life: 1.2, drag: 0.96, z: 2
      });
    }
  }

  function playGiftSound(rarity, combo) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!window._giftAudioCtx) window._giftAudioCtx = new AC();
      var ctx = window._giftAudioCtx;
      if (ctx.state === 'suspended') ctx.resume();

      var now = ctx.currentTime;
      if (rarity === 'epic') {
        var notes = [523, 659, 784, 1047];
        notes.forEach(function (f, i) {
          var o = ctx.createOscillator();
          var g = ctx.createGain();
          o.type = 'triangle';
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value = f;
          g.gain.setValueAtTime(0.1, now + i * 0.1);
          g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
          o.start(now + i * 0.1);
          o.stop(now + i * 0.1 + 0.3);
        });
      } else if (rarity === 'legendary') {
        var notes2 = [392, 523, 659, 784, 1047, 1319];
        notes2.forEach(function (f, i) {
          var o = ctx.createOscillator();
          var g = ctx.createGain();
          o.type = 'sine';
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value = f;
          g.gain.setValueAtTime(0.08, now + i * 0.08);
          g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.35);
          o.start(now + i * 0.08);
          o.stop(now + i * 0.08 + 0.35);
        });
      } else if (rarity === 'mythic') {
        var chords = [[523, 659, 784], [587, 740, 880], [659, 831, 988], [784, 988, 1175], [1047, 1319, 1568]];
        chords.forEach(function (chord, ci) {
          chord.forEach(function (f) {
            var o = ctx.createOscillator();
            var g = ctx.createGain();
            o.type = 'triangle';
            o.connect(g); g.connect(ctx.destination);
            o.frequency.value = f;
            g.gain.setValueAtTime(0.06, now + ci * 0.2);
            g.gain.exponentialRampToValueAtTime(0.01, now + ci * 0.2 + 0.6);
            o.start(now + ci * 0.2);
            o.stop(now + ci * 0.2 + 0.6);
          });
        });
        var shimmer = ctx.createOscillator();
        var sg = ctx.createGain();
        shimmer.type = 'sine';
        shimmer.connect(sg); sg.connect(ctx.destination);
        shimmer.frequency.value = 2637;
        sg.gain.setValueAtTime(0.04, now + 1.2);
        sg.gain.exponentialRampToValueAtTime(0.01, now + 2);
        shimmer.start(now + 1.2);
        shimmer.stop(now + 2);
      }

      if (combo >= 10) {
        var comboO = ctx.createOscillator();
        var comboG = ctx.createGain();
        comboO.type = 'square';
        comboO.connect(comboG); comboG.connect(ctx.destination);
        comboO.frequency.value = 880;
        comboG.gain.setValueAtTime(0.05, now + 0.5);
        comboG.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
        comboO.start(now + 0.5);
        comboO.stop(now + 0.7);
      }
    } catch (e) {}
  }

  function cleanup() {
    clearAllTimers();
    GiftParticleEngine.clear();
    var rays = document.querySelector('.gift-god-rays');
    if (rays && rays.parentNode) rays.parentNode.removeChild(rays);
  }

  return { playEffect: playEffect, playComboEffect: playComboEffect, cleanup: cleanup, playGiftSound: playGiftSound };
})();
