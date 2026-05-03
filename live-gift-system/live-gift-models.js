var GiftModelFactory = (function () {
  var scene, camera, renderer, animId;
  var currentModel = null;
  var active = false;
  var clock = null;

  function init() {
    if (typeof THREE === 'undefined') return false;
    if (renderer) return true;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 12);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9002;pointer-events:none;';
    renderer.domElement.id = 'giftModelCanvas';
    document.body.appendChild(renderer.domElement);

    var amb = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(amb);
    var dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(5, 10, 7);
    scene.add(dir);
    var point = new THREE.PointLight(0xffd700, 0.8, 30);
    point.position.set(-3, 5, 5);
    scene.add(point);

    clock = new THREE.Clock();
    window.addEventListener('resize', onResize);
    return true;
  }

  function onResize() {
    if (!renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function createCar() {
    var g = new THREE.Group();
    var bodyMat = new THREE.MeshPhongMaterial({ color: 0xffd700, shininess: 120, specular: 0xffffff });
    var body = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 2), bodyMat);
    body.position.y = 0.8;
    g.add(body);

    var cabin = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 1.8), new THREE.MeshPhongMaterial({ color: 0x1a1a3e, shininess: 200, specular: 0x4488ff, transparent: true, opacity: 0.7 }));
    cabin.position.set(-0.2, 1.7, 0);
    g.add(cabin);

    var wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
    var wheelMat = new THREE.MeshPhongMaterial({ color: 0x222222, shininess: 30 });
    [[-1.2, 0.4, 1.1], [-1.2, 0.4, -1.1], [1.2, 0.4, 1.1], [1.2, 0.4, -1.1]].forEach(function (pos) {
      var w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.x = Math.PI / 2;
      w.position.set(pos[0], pos[1], pos[2]);
      g.add(w);
    });

    var hlGeo = new THREE.SphereGeometry(0.18, 8, 8);
    var hlMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xffffaa, emissiveIntensity: 2 });
    [0.7, -0.7].forEach(function (z) {
      var hl = new THREE.Mesh(hlGeo, hlMat);
      hl.position.set(2, 0.8, z);
      g.add(hl);
    });

    var tlMat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.5 });
    [0.7, -0.7].forEach(function (z) {
      var tl = new THREE.Mesh(hlGeo, tlMat);
      tl.position.set(-2, 0.8, z);
      g.add(tl);
    });

    g.position.set(15, -2, 0);
    return g;
  }

  function createCruise() {
    var g = new THREE.Group();
    var hullMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 80 });
    var hull = new THREE.Mesh(new THREE.BoxGeometry(6, 1.5, 2.5), hullMat);
    hull.position.y = 0;
    g.add(hull);

    var hullBottom = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.6, 2.2), new THREE.MeshPhongMaterial({ color: 0x1a3a5c }));
    hullBottom.position.y = -0.6;
    g.add(hullBottom);

    var deckMat = new THREE.MeshPhongMaterial({ color: 0xeeeeee, shininess: 40 });
    var deck1 = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 2), deckMat);
    deck1.position.set(0, 1.3, 0);
    g.add(deck1);

    var deck2 = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.0, 1.6), deckMat);
    deck2.position.set(0.5, 2.4, 0);
    g.add(deck2);

    var funnelMat = new THREE.MeshPhongMaterial({ color: 0xcc0000 });
    var funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.2, 12), funnelMat);
    funnel.position.set(-1, 3.3, 0);
    g.add(funnel);

    var funnelStripe = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.2, 12), new THREE.MeshPhongMaterial({ color: 0x222222 }));
    funnelStripe.position.set(-1, 3.5, 0);
    g.add(funnelStripe);

    var winMat = new THREE.MeshPhongMaterial({ color: 0x88ccff, emissive: 0x4488cc, emissiveIntensity: 0.5 });
    for (var i = 0; i < 6; i++) {
      var win = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.2), winMat);
      win.position.set(-2.2 + i * 0.8, 1.3, 1.01);
      g.add(win);
      var win2 = win.clone();
      win2.position.z = -1.01;
      win2.rotation.y = Math.PI;
      g.add(win2);
    }

    g.position.set(0, -8, 0);
    return g;
  }

  function createIsland() {
    var g = new THREE.Group();

    var waterMat = new THREE.MeshPhongMaterial({ color: 0x1a7acc, transparent: true, opacity: 0.7, shininess: 120 });
    var water = new THREE.Mesh(new THREE.CircleGeometry(5, 32), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.1;
    g.add(water);

    var terrainMat = new THREE.MeshPhongMaterial({ color: 0x44aa44, shininess: 20 });
    var terrain = new THREE.Mesh(new THREE.SphereGeometry(2.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), terrainMat);
    terrain.position.y = -0.5;
    terrain.scale.set(1, 0.4, 1);
    g.add(terrain);

    var beachMat = new THREE.MeshPhongMaterial({ color: 0xf4d03f });
    var beach = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.8, 24), beachMat);
    beach.rotation.x = -Math.PI / 2;
    beach.position.y = 0.02;
    g.add(beach);

    var trunkMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.5, 8), trunkMat);
    trunk.position.set(0.5, 1.3, 0.3);
    g.add(trunk);

    var leafMat = new THREE.MeshPhongMaterial({ color: 0x228B22, side: THREE.DoubleSide });
    var leafGeo = new THREE.ConeGeometry(0.8, 0.6, 8);
    var leaves = new THREE.Mesh(leafGeo, leafMat);
    leaves.position.set(0.5, 2.2, 0.3);
    leaves.rotation.z = 0.2;
    g.add(leaves);

    var leaf2 = new THREE.Mesh(leafGeo, leafMat);
    leaf2.position.set(0.5, 2.1, 0.3);
    leaf2.rotation.z = -0.3;
    leaf2.scale.set(0.8, 0.8, 0.8);
    g.add(leaf2);

    var trunk2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.2, 8), trunkMat);
    trunk2.position.set(-0.8, 1.0, -0.5);
    g.add(trunk2);
    var leaves2 = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.5, 8), leafMat);
    leaves2.position.set(-0.8, 1.8, -0.5);
    g.add(leaves2);

    var hutBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.7), new THREE.MeshPhongMaterial({ color: 0xDEB887 }));
    hutBody.position.set(-0.3, 0.8, 0.8);
    g.add(hutBody);
    var roof = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.5, 4), new THREE.MeshPhongMaterial({ color: 0xCD853F }));
    roof.position.set(-0.3, 1.35, 0.8);
    roof.rotation.y = Math.PI / 4;
    g.add(roof);

    var cloudMat = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    [[2, 4, 1, 0.6], [-1.5, 3.5, -1, 0.4], [0, 4.5, -2, 0.5]].forEach(function (c) {
      var cloud = new THREE.Mesh(new THREE.SphereGeometry(c[3], 8, 8), cloudMat);
      cloud.position.set(c[0], c[1], c[2]);
      cloud.scale.set(2, 0.8, 1.2);
      g.add(cloud);
    });

    g.position.set(0, -10, 0);
    g.scale.set(0.8, 0.8, 0.8);
    return g;
  }

  function showModel(type, duration, cb) {
    if (!init()) { if (cb) cb(); return; }
    removeModel();

    var model;
    if (type === 'car') model = createCar();
    else if (type === 'cruise') model = createCruise();
    else if (type === 'island') model = createIsland();
    else { if (cb) cb(); return; }

    currentModel = model;
    scene.add(model);

    var tl = gsap.timeline({ onComplete: function () { removeModel(); if (cb) cb(); } });

    if (type === 'car') {
      camera.position.set(2, 4, 10);
      camera.lookAt(0, 1, 0);
      tl.to(model.position, { x: 0, y: 0, z: 0, duration: 1.2, ease: 'power2.out' })
        .to(model.rotation, { y: Math.PI * 2, duration: 2, ease: 'power1.inOut' })
        .to(model.position, { x: -15, duration: 0.8, ease: 'power2.in' }, '+=0.3');
    } else if (type === 'cruise') {
      camera.position.set(3, 5, 10);
      camera.lookAt(0, 1.5, 0);
      tl.to(model.position, { y: 0, z: 0, duration: 1.5, ease: 'power2.out' })
        .to(model.rotation, { y: Math.PI * 0.3, duration: 1.5, ease: 'sine.inOut' })
        .to(model.rotation, { y: -Math.PI * 0.3, duration: 1.5, ease: 'sine.inOut', yoyo: true, repeat: 1 })
        .to(model.position, { y: -8, duration: 1, ease: 'power2.in' });
    } else if (type === 'island') {
      camera.position.set(4, 6, 10);
      camera.lookAt(0, 1, 0);
      tl.to(model.position, { y: 0, z: 0, duration: 1.8, ease: 'power2.out' })
        .to(model.rotation, { y: Math.PI * 2, duration: 4, ease: 'none' }, '+=0.2')
        .to(model.position, { y: -10, duration: 1, ease: 'power2.in' });
    }

    if (!active) {
      active = true;
      renderLoop();
    }

    var totalDur = tl.duration();
    setTimeout(function () {
      active = false;
    }, (totalDur + 0.5) * 1000);
  }

  function renderLoop() {
    if (!active || !renderer) return;
    animId = requestAnimationFrame(renderLoop);
    if (currentModel) {
      var t = clock.getElapsedTime();
      if (currentModel.userData.type !== 'noFloat') {
        currentModel.position.y += Math.sin(t * 2) * 0.001;
      }
    }
    renderer.render(scene, camera);
  }

  function removeModel() {
    if (currentModel) {
      scene.remove(currentModel);
      currentModel.traverse(function (obj) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(function (m) { m.dispose(); });
          else obj.material.dispose();
        }
      });
      currentModel = null;
    }
  }

  function destroy() {
    removeModel();
    active = false;
    if (animId) cancelAnimationFrame(animId);
    if (renderer) {
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      renderer = null;
    }
    scene = null; camera = null;
  }

  return { init: init, showModel: showModel, destroy: destroy };
})();
