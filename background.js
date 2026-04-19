(function(skipIntro) {
    var canvas = document.getElementById('cyberCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W, H;
    var GRID = 60;
    var startTime = skipIntro ? Date.now() - 10000 : Date.now();

    var verts = [];
    var hEdges = [];
    var vEdges = [];

    function buildGrid() {
      var cols = Math.ceil(W / GRID) + 2;
      var rows = Math.ceil(H / GRID) + 2;
      var cx = W / 2;
      var cy = H / 2;
      var maxDist = Math.sqrt(cx * cx + cy * cy);

      verts = [];
      hEdges = [];
      vEdges = [];

      for (var r = 0; r <= rows; r++) {
        for (var c = 0; c <= cols; c++) {
          var x = c * GRID;
          var y = r * GRID;
          var dx = x - cx;
          var dy = y - cy;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var norm = dist / maxDist;
          verts.push({ x: x, y: y, dist: norm, brightness: 0 });
        }
      }

      for (var r = 0; r <= rows; r++) {
        for (var c = 0; c < cols; c++) {
          var x1 = c * GRID;
          var x2 = (c + 1) * GRID;
          var y = r * GRID;
          var mx = (x1 + x2) / 2;
          var dist = Math.sqrt((mx - cx) * (mx - cx) + (y - cy) * (y - cy)) / maxDist;
          hEdges.push({ x1: x1, y: y, x2: x2, dist: dist, brightness: 0 });
        }
      }

      for (var c = 0; c <= cols; c++) {
        for (var r = 0; r < rows; r++) {
          var x = c * GRID;
          var y1 = r * GRID;
          var y2 = (r + 1) * GRID;
          var my = (y1 + y2) / 2;
          var dist = Math.sqrt((x - cx) * (x - cx) + (my - cy) * (my - cy)) / maxDist;
          vEdges.push({ x: x, y1: y1, y2: y2, dist: dist, brightness: 0 });
        }
      }
    }

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      buildGrid();
    }
    resize();
    window.addEventListener('resize', resize);

    var twinkleIdx = Math.floor(Math.random() * verts.length);
    var nextTwinkle = 4000;

    var rings = [];
    var nextRing = 1500;

    function spawnRing() {
      var v = verts[Math.floor(Math.random() * verts.length)];
      rings.push({ x: v.x, y: v.y, t: 0, speed: 0.006 });
      nextRing = 1500 + Math.random() * 2500;
    }

    var GLYPH_SIZE = 40;
    var GLYPH_GAP = 55;
    var GLYPH_ARM = 22;
    var glyphFadeStart = 4000;

    function drawGlyph(cx, cy, angle, opacity) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.strokeStyle = 'rgba(0,255,255,' + opacity + ')';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(-GLYPH_SIZE, -GLYPH_SIZE);
      ctx.lineTo(-GLYPH_SIZE, -GLYPH_SIZE + GLYPH_ARM);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-GLYPH_SIZE, -GLYPH_SIZE);
      ctx.lineTo(-GLYPH_SIZE + GLYPH_ARM, -GLYPH_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(GLYPH_SIZE, -GLYPH_SIZE);
      ctx.lineTo(GLYPH_SIZE, -GLYPH_SIZE + GLYPH_ARM);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(GLYPH_SIZE, -GLYPH_SIZE);
      ctx.lineTo(GLYPH_SIZE - GLYPH_ARM, -GLYPH_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-GLYPH_SIZE, GLYPH_SIZE);
      ctx.lineTo(-GLYPH_SIZE, GLYPH_SIZE - GLYPH_ARM);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-GLYPH_SIZE, GLYPH_SIZE);
      ctx.lineTo(-GLYPH_SIZE + GLYPH_ARM, GLYPH_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(GLYPH_SIZE, GLYPH_SIZE);
      ctx.lineTo(GLYPH_SIZE, GLYPH_SIZE - GLYPH_ARM);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(GLYPH_SIZE, GLYPH_SIZE);
      ctx.lineTo(GLYPH_SIZE - GLYPH_ARM, GLYPH_SIZE);
      ctx.stroke();

      ctx.restore();
    }

    var animId = null;
    var paused = false;

    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        paused = true;
        if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
      } else {
        paused = false;
        if (!animId) {
          animId = requestAnimationFrame(draw);
        }
      }
    });

    function draw() {
      if (paused) return;
      var elapsed = Date.now() - startTime;
      ctx.clearRect(0, 0, W, H);

      var DRAW_PHASE = 2500;
      var PULSE_START = 2500;
      var PULSE_DURATION = 600;
      var IDLE_START = PULSE_START + PULSE_DURATION;

      if (elapsed < DRAW_PHASE) {
        var progress = elapsed / DRAW_PHASE;
        var waveFront = progress * 1.3;

        for (var i = 0; i < hEdges.length; i++) {
          var e = hEdges[i];
          if (e.dist < waveFront) {
            var edgeProgress = Math.min((waveFront - e.dist) / 0.15, 1);
            e.brightness = edgeProgress * 0.8;
          }
        }
        for (var i = 0; i < vEdges.length; i++) {
          var e = vEdges[i];
          if (e.dist < waveFront) {
            var edgeProgress = Math.min((waveFront - e.dist) / 0.15, 1);
            e.brightness = edgeProgress * 0.8;
          }
        }
        for (var i = 0; i < verts.length; i++) {
          var v = verts[i];
          if (v.dist < waveFront) {
            v.brightness = Math.min((waveFront - v.dist) / 0.1, 1) * 1.0;
          }
        }
      } else if (elapsed < IDLE_START) {
        var pulseT = (elapsed - PULSE_START) / PULSE_DURATION;
        var pulseRadius = pulseT * 1.4;
        var pulseBright = (1 - pulseT) * 1.0;

        for (var i = 0; i < hEdges.length; i++) {
          var e = hEdges[i];
          var d = Math.abs(e.dist - pulseRadius);
          var boost = d < 0.15 ? (1 - d / 0.15) * pulseBright : 0;
          e.brightness = 0.8 + boost;
        }
        for (var i = 0; i < vEdges.length; i++) {
          var e = vEdges[i];
          var d = Math.abs(e.dist - pulseRadius);
          var boost = d < 0.15 ? (1 - d / 0.15) * pulseBright : 0;
          e.brightness = 0.8 + boost;
        }
        for (var i = 0; i < verts.length; i++) {
          var v = verts[i];
          var d = Math.abs(v.dist - pulseRadius);
          var boost = d < 0.15 ? (1 - d / 0.15) * pulseBright : 0;
          v.brightness = 1.0 + boost * 0.5;
        }
      } else {
        var settleT = Math.min((elapsed - IDLE_START) / 1500, 1);
        var idleBase = 0.15 * settleT;

        nextTwinkle -= 16;
        if (nextTwinkle <= 0) {
          twinkleIdx = Math.floor(Math.random() * verts.length);
          nextTwinkle = 800 + Math.random() * 2000;
        }

        for (var i = 0; i < hEdges.length; i++) {
          hEdges[i].brightness = idleBase;
        }
        for (var i = 0; i < vEdges.length; i++) {
          vEdges[i].brightness = idleBase;
        }
        for (var i = 0; i < verts.length; i++) {
          verts[i].brightness = idleBase * 1.5;
        }

        var twinkle = verts[twinkleIdx];
        if (twinkle) {
          var twinkleLife = nextTwinkle / (800 + 2000);
          var twinklePeak = Math.sin(twinkleLife * Math.PI) * 1.0;
          twinkle.brightness = idleBase * 1.5 + twinklePeak;
        }

        if (rings.length < 2) {
          nextRing -= 16;
          if (nextRing <= 0) spawnRing();
        }
      }

      ctx.lineWidth = 1.5;
      for (var i = 0; i < hEdges.length; i++) {
        var e = hEdges[i];
        if (e.brightness < 0.005) continue;
        ctx.strokeStyle = 'rgba(0,255,255,' + e.brightness + ')';
        ctx.beginPath();
        ctx.moveTo(e.x1, e.y);
        ctx.lineTo(e.x2, e.y);
        ctx.stroke();
      }
      for (var i = 0; i < vEdges.length; i++) {
        var e = vEdges[i];
        if (e.brightness < 0.005) continue;
        ctx.strokeStyle = 'rgba(0,255,255,' + e.brightness + ')';
        ctx.beginPath();
        ctx.moveTo(e.x, e.y1);
        ctx.lineTo(e.x, e.y2);
        ctx.stroke();
      }

      for (var i = 0; i < verts.length; i++) {
        var v = verts[i];
        if (v.brightness < 0.01) continue;
        ctx.fillStyle = 'rgba(0,255,255,' + v.brightness + ')';
        ctx.beginPath();
        ctx.arc(v.x, v.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      for (var i = rings.length - 1; i >= 0; i--) {
        var rn = rings[i];
        rn.t += rn.speed;
        if (rn.t >= 1) { rings.splice(i, 1); continue; }

        var radius = 2 + rn.t * 50;
        var alpha = (1 - rn.t) * 0.8;

        ctx.strokeStyle = 'rgba(0,255,255,' + alpha + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rn.x, rn.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        if (radius > 10) {
          ctx.strokeStyle = 'rgba(0,255,255,' + (alpha * 0.4) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(rn.x, rn.y, radius * 0.6, 0, Math.PI * 2);
          ctx.stroke();
        }

        var ringGlow = ctx.createRadialGradient(rn.x, rn.y, radius * 0.5, rn.x, rn.y, radius + 15);
        ringGlow.addColorStop(0, 'rgba(0,255,255,0)');
        ringGlow.addColorStop(0.7, 'rgba(0,255,255,' + (alpha * 0.2) + ')');
        ringGlow.addColorStop(1, 'rgba(0,255,255,0)');
        ctx.fillStyle = ringGlow;
        ctx.beginPath();
        ctx.arc(rn.x, rn.y, radius + 15, 0, Math.PI * 2);
        ctx.fill();
      }

      if (elapsed > glyphFadeStart) {
        var glyphAge = elapsed - glyphFadeStart;
        var glyphAlpha = Math.min(glyphAge / 2000, 1) * (0.6 + 0.25 * Math.sin(elapsed / 4000));
        var glyphAngle = (elapsed / 30000) * Math.PI * 2;

        drawGlyph(GLYPH_GAP, GLYPH_GAP, glyphAngle, glyphAlpha);
        drawGlyph(W - GLYPH_GAP, GLYPH_GAP, glyphAngle, glyphAlpha);
        drawGlyph(GLYPH_GAP, H - GLYPH_GAP, glyphAngle, glyphAlpha);
        drawGlyph(W - GLYPH_GAP, H - GLYPH_GAP, glyphAngle, glyphAlpha);
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);
})(window.HYPERGRID_SKIP_INTRO || false);
