import * as THREE from 'three';

const createMotionTrail = (offset, color, opacity) => {
  const points = [];

  for (let index = 0; index < 36; index += 1) {
    const progress = index / 35;
    const angle = (progress * Math.PI * 3.2) + offset;
    points.push(new THREE.Vector3(
      Math.sin(angle) * (1.2 + (progress * 0.9)),
      (progress - 0.5) * 5.8,
      Math.cos(angle) * 0.7,
    ));
  }

  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, 64, 0.018, 4, false);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
  return new THREE.Mesh(geometry, material);
};

export const startAmbientScene = (canvas) => {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch (error) {
    canvas.hidden = true;
    return () => {};
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
  const group = new THREE.Group();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointerTarget = new THREE.Vector2(0, 0);
  const pointerCurrent = new THREE.Vector2(0, 0);
  const clock = new THREE.Clock();
  let animationFrame = null;
  let lastRenderAt = 0;

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(1);
  camera.position.set(0, 0, 7.5);

  const trailOne = createMotionTrail(0, 0xa855f7, 0.2);
  const trailTwo = createMotionTrail(Math.PI, 0xc084fc, 0.14);
  const trailThree = createMotionTrail(Math.PI / 2, 0xf5a623, 0.1);
  trailTwo.rotation.z = Math.PI;
  trailThree.scale.setScalar(0.78);
  trailThree.position.x = 1.8;
  group.add(trailOne, trailTwo, trailThree);

  const nodeEdges = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.82, 1));
  const nodeMaterial = new THREE.LineBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.13 });
  const node = new THREE.LineSegments(nodeEdges, nodeMaterial);
  node.position.set(-2.5, 1.3, -1.2);
  group.add(node);

  const haloMaterial = new THREE.MeshBasicMaterial({
    color: 0xa855f7,
    transparent: true,
    opacity: 0.12,
    wireframe: true,
  });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.035, 4, 48), haloMaterial);
  halo.position.set(-2.5, 1.3, -1.15);
  halo.rotation.set(0.7, 0.2, 0.4);
  group.add(halo);

  const secondaryHaloMaterial = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.1 });
  const secondaryHalo = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.018, 4, 40), secondaryHaloMaterial);
  secondaryHalo.position.set(2.35, -1.5, -0.8);
  secondaryHalo.rotation.set(1.1, -0.4, 0.2);
  group.add(secondaryHalo);

  const energyOrbGeometry = new THREE.IcosahedronGeometry(0.07, 1);
  const energyOrbMaterial = new THREE.MeshBasicMaterial({ color: 0xf5a623, transparent: true, opacity: 0.24 });
  const energyOrbs = new THREE.Group();
  [
    [-1.1, -1.8, 0.2],
    [0.2, 2.1, -0.4],
    [1.6, 0.8, 0.15],
    [2.7, -0.6, -0.7],
    [-2.1, -0.4, -0.2],
  ].forEach(([x, y, z], index) => {
    const orb = new THREE.Mesh(energyOrbGeometry, energyOrbMaterial);
    orb.position.set(x, y, z);
    orb.userData.baseY = y;
    orb.scale.setScalar(0.75 + (index * 0.12));
    energyOrbs.add(orb);
  });
  group.add(energyOrbs);

  const particleCount = 48;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let index = 0; index < particleCount; index += 1) {
    particlePositions[index * 3] = (Math.random() - 0.5) * 12;
    particlePositions[(index * 3) + 1] = (Math.random() - 0.5) * 8;
    particlePositions[(index * 3) + 2] = (Math.random() - 0.5) * 5;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    color: 0xd8b4fe,
    size: 0.025,
    transparent: true,
    opacity: 0.22,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  group.add(particles);

  group.rotation.z = -0.28;
  group.position.x = 2.7;
  scene.add(group);

  const render = () => renderer.render(scene, camera);
  const syncTheme = () => {
    const lightMode = document.documentElement.classList.contains('light');
    trailOne.material.opacity = lightMode ? 0.14 : 0.2;
    trailTwo.material.opacity = lightMode ? 0.1 : 0.14;
    trailThree.material.opacity = lightMode ? 0.08 : 0.1;
    nodeMaterial.opacity = lightMode ? 0.09 : 0.13;
    haloMaterial.opacity = lightMode ? 0.1 : 0.14;
    secondaryHaloMaterial.opacity = lightMode ? 0.07 : 0.1;
    energyOrbMaterial.opacity = lightMode ? 0.18 : 0.26;
    particleMaterial.opacity = lightMode ? 0.14 : 0.22;
    if (reduceMotion) render();
  };

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    if (reduceMotion) render();
  };

  const handlePointerMove = (event) => {
    pointerTarget.set(
      ((event.clientX / window.innerWidth) - 0.5) * 0.32,
      ((event.clientY / window.innerHeight) - 0.5) * 0.18,
    );
  };

  const renderFrame = (timestamp) => {
    animationFrame = window.requestAnimationFrame(renderFrame);
    if (document.hidden || timestamp - lastRenderAt < 40) return;
    lastRenderAt = timestamp;

    const elapsed = clock.getElapsedTime();
    pointerCurrent.lerp(pointerTarget, 0.055);
    group.rotation.y = (elapsed * 0.035) + pointerCurrent.x;
    group.rotation.x = (Math.sin(elapsed * 0.22) * 0.045) + pointerCurrent.y;
    node.rotation.x = elapsed * 0.08;
    node.rotation.y = elapsed * 0.11;
    halo.rotation.x = 0.7 + (elapsed * 0.04);
    halo.rotation.z = 0.4 + (elapsed * -0.06);
    secondaryHalo.rotation.y = -0.4 + (elapsed * 0.07);
    secondaryHalo.rotation.z = 0.2 + (elapsed * 0.035);
    energyOrbs.rotation.z = elapsed * 0.035;
    energyOrbs.children.forEach((orb, index) => {
      orb.position.y = orb.userData.baseY + (Math.sin((elapsed * 0.7) + index) * 0.07);
      orb.rotation.x = elapsed * (0.15 + (index * 0.02));
      orb.rotation.y = elapsed * (0.12 + (index * 0.018));
    });
    particles.rotation.y = elapsed * -0.012;
    render();
  };

  const themeObserver = new MutationObserver(syncTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  resize();
  syncTheme();

  if (reduceMotion) render();
  else animationFrame = window.requestAnimationFrame(renderFrame);

  return () => {
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', handlePointerMove);
    themeObserver.disconnect();
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    renderer.dispose();
  };
};
