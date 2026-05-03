var GiftParticleEngine = (function () {
  var MAX = GIFT_PARTICLE_MAX || 2000;
  var canvas, ctx;
  var pool = [];
  var active = false;
  var animId = null;
  var lastTime = 0;

  function P() {
    this.alive = false;
    this.x = 0; this.y = 0; this.z = 1;
    this.vx = 0; this.vy = 0;
    this.ay = 0; this.drag = 0.97;
    this.size = 4; this.startSize = 4; this.endSize = 0;
    this.r = 255; this.g = 255; this.b = 255;
    this.alpha = 1;
    this.life = 0; this.maxLife = 2;
    this.shape = 0;
  }

  for (var i = 0; i < MAX; i++) pool.push(new P());

  function init() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = 'giftParticleCanvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9001;pointer-events:none;';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function grab() {
    for (var i = 0; i < pool.length; i++) {
      if (!pool[i].alive) return pool[i];
    }
    var oldest = null, oldestLife = -1;
    for (var j = 0; j < pool.length; j++) {
      if (pool[j].alive && pool[j].life > oldestLife) { oldest = pool[j]; oldestLife = pool[j].life; }
    }
    if (oldest) { oldest.alive = false; return oldest; }
    return null;
  }

  function htr(hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 255, g: 255, b: 255 };
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function rng(a, b) { return a + Math.random() * (b - a); }

  function emit(o) {
    var p = grab();
    if (!p) return;
    p.alive = true;
    p.x = o.x != null ? o.x : canvas.width / 2;
    p.y = o.y != null ? o.y : canvas.height / 2;
    p.z = o.z || 1;
    p.vx = o.vx || 0;
    p.vy = o.vy || 0;
    p.ay = o.ay || 0;
    p.drag = o.drag != null ? o.drag : 0.97;
    p.size = o.size || 4;
    p.startSize = p.size;
    p.endSize = o.endSize != null ? o.endSize : 0;
    var c = o.color ? (typeof o.color === 'string' ? htr(o.color) : o.color) : { r: 255, g: 255, b: 255 };
    p.r = c.r; p.g = c.g; p.b = c.b;
    p.alpha = o.alpha != null ? o.alpha : 1;
    p.life = 0;
    p.maxLife = o.life || 2;
    p.shape = o.shape || 0;
    if (!active) {
      active = true;
      lastTime = performance.now();
      animId = requestAnimationFrame(loop);
    }
  }

  function loop(now) {
    if (!active) return;
    var dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';

    var any = false;
    for (var layer = 0; layer < 3; layer++) {
      for (var i = 0; i < pool.length; i++) {
        var p = pool[i];
        if (!p.alive || p.z !== layer) continue;
        any = true;
        p.life += dt;
        if (p.life >= p.maxLife) { p.alive = false; continue; }
        p.vy += p.ay * dt * 60;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;

        var t = p.life / p.maxLife;
        var sz = p.startSize + (p.endSize - p.startSize) * t;
        var a = p.alpha * (1 - t) * (t < 0.08 ? t / 0.08 : 1);
        if (a < 0.01 || sz < 0.2) { p.alive = false; continue; }

        var col = 'rgb(' + p.r + ',' + p.g + ',' + p.b + ')';

        if (sz > 3) {
          ctx.globalAlpha = a * 0.15;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(p.x, p.y, sz * 3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = a;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    if (any) {
      animId = requestAnimationFrame(loop);
    } else {
      active = false;
    }
  }

  function burst(x, y, count, o) {
    for (var i = 0; i < count; i++) {
      var angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
      var spd = (o.speed || 3) * (1 + (Math.random() - 0.5) * (o.speedVar || 0.5));
      emit({
        x: x + (Math.random() - 0.5) * (o.spread || 15),
        y: y + (Math.random() - 0.5) * (o.spread || 15),
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        ay: o.ay || 0.03,
        size: o.size || 4,
        endSize: o.endSize != null ? o.endSize : 0,
        color: o.colors ? pick(o.colors) : '#fff',
        alpha: o.alpha || 1,
        life: o.life || 2,
        drag: o.drag || 0.96,
        z: o.z || 2
      });
    }
  }

  function rain(count, o) {
    for (var i = 0; i < count; i++) {
      emit({
        x: Math.random() * (canvas ? canvas.width : window.innerWidth),
        y: -10 - Math.random() * 200,
        vx: o.vx || (Math.random() - 0.5) * 0.3,
        vy: o.vy || 2 + Math.random() * 4,
        ay: o.ay || 0.015,
        size: o.size || 3,
        endSize: o.endSize != null ? o.endSize : 1,
        color: o.colors ? pick(o.colors) : '#fff',
        alpha: o.alpha || 0.6,
        life: o.life || 3.5,
        drag: o.drag || 0.999,
        z: o.z || 0
      });
    }
  }

  function fountain(x, y, count, o) {
    for (var i = 0; i < count; i++) {
      var angle = -Math.PI / 2 + (Math.random() - 0.5) * (o.spread || 0.8);
      var spd = (o.speed || 5) * (0.5 + Math.random());
      emit({
        x: x + (Math.random() - 0.5) * 10,
        y: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        ay: o.ay || 0.06,
        size: o.size || 3,
        endSize: o.endSize != null ? o.endSize : 0,
        color: o.colors ? pick(o.colors) : '#fff',
        alpha: o.alpha || 1,
        life: o.life || 2,
        drag: o.drag || 0.97,
        z: o.z || 2
      });
    }
  }

  function firework(x, y, o) {
    burst(x, y, o.count || 60, {
      speed: o.speed || 5,
      speedVar: 0.6,
      spread: 5,
      size: o.size || 4,
      endSize: 0,
      colors: o.colors || ['#FF0000', '#FFD700', '#FFFFFF'],
      alpha: 1,
      life: o.life || 1.5,
      drag: 0.955,
      z: o.z || 2,
      ay: o.ay || 0.03
    });
  }

  function trail(x1, y1, x2, y2, count, o) {
    for (var i = 0; i < count; i++) {
      var t = i / count;
      emit({
        x: x1 + (x2 - x1) * t + (Math.random() - 0.5) * (o.spread || 10),
        y: y1 + (y2 - y1) * t + (Math.random() - 0.5) * (o.spread || 10),
        vx: (Math.random() - 0.5) * (o.speed || 1),
        vy: (Math.random() - 0.5) * (o.speed || 1),
        ay: o.ay || -0.01,
        size: o.size || 3,
        endSize: 0,
        color: o.colors ? pick(o.colors) : '#FFD700',
        alpha: o.alpha || 0.8,
        life: o.life || 1,
        drag: 0.96,
        z: o.z || 2
      });
    }
  }

  function clear() {
    for (var i = 0; i < pool.length; i++) pool[i].alive = false;
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    active = false;
    if (animId) { cancelAnimationFrame(animId); animId = null; }
  }

  function destroy() {
    clear();
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null; ctx = null;
  }

  function count() {
    var c = 0;
    for (var i = 0; i < pool.length; i++) if (pool[i].alive) c++;
    return c;
  }

  return {
    init: init, emit: emit, burst: burst, rain: rain,
    fountain: fountain, firework: firework, trail: trail,
    clear: clear, destroy: destroy, count: count,
    htr: htr, pick: pick, rng: rng
  };
})();
