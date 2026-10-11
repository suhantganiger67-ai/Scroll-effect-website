import * as THREE from 'three';

// -------------------------------------------------------------------
// High-detail procedural asteroid geometry
// Uses multi-octave noise for realistic crater-y surfaces
// -------------------------------------------------------------------
function createAsteroidGeometry(radius = 1.5, detail = 5) {
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const len = v.length();
    const nx = v.x / len;
    const ny = v.y / len;
    const nz = v.z / len;

    // Multi-octave noise — big lumps + medium bumps + fine grit
    const big =
      Math.sin(nx * 1.7) * Math.cos(ny * 1.9) * Math.sin(nz * 2.1) * 0.4;
    const mid =
      Math.sin(nx * 4.3) * Math.cos(ny * 5.1) * Math.sin(nz * 4.7) * 0.18;
    const fine =
      Math.sin(nx * 11.7) * Math.cos(ny * 13.3) * Math.sin(nz * 12.1) * 0.08;
    const micro =
      Math.sin(nx * 27.0) * Math.cos(ny * 31.0) * Math.sin(nz * 29.0) * 0.03;

    // Craters: negative dents in random spots
    const crater =
      Math.max(0, 1.0 - Math.abs(Math.sin(nx * 3.0 + nz * 2.0))) * 0.12;

    const displacement = big + mid + fine + micro - crater;

    v.multiplyScalar(1 + displacement);
    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geo.computeVertexNormals();
  return geo;
}

// -------------------------------------------------------------------
// Generate a rock surface texture + normal map + roughness map
// All on canvas — no external files needed
// -------------------------------------------------------------------
function createAsteroidTextures() {
  const size = 1024;

  // ---- Base color map ----
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = colorCanvas.height = size;
  const cctx = colorCanvas.getContext('2d');

  // Base: dark slate gray (not brown — real asteroids are grayish)
  cctx.fillStyle = '#3a3530';
  cctx.fillRect(0, 0, size, size);

  // Layered noise for mottled rock surface
  for (let layer = 0; layer < 5; layer++) {
    const density = [8000, 5000, 3000, 1500, 800][layer];
    const radius = [60, 30, 12, 5, 2][layer];
    const alpha = [0.08, 0.12, 0.15, 0.2, 0.25][layer];

    for (let i = 0; i < density; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * radius + 1;

      // Vary between dark and light rock tones
      const tone = Math.random();
      let color;
      if (tone < 0.5) {
        // Darker patches
        const g = Math.floor(30 + Math.random() * 40);
        color = `rgba(${g}, ${g - 5}, ${g - 10}, ${alpha})`;
      } else {
        // Lighter patches
        const g = Math.floor(90 + Math.random() * 60);
        color = `rgba(${g}, ${g - 5}, ${g - 15}, ${alpha})`;
      }

      cctx.fillStyle = color;
      cctx.beginPath();
      cctx.arc(x, y, r, 0, Math.PI * 2);
      cctx.fill();
    }
  }

  // Sharp crater marks
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 35 + 5;

    // Dark center
    const grad = cctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(15, 12, 10, 0.95)');
    grad.addColorStop(0.6, 'rgba(40, 35, 30, 0.6)');
    grad.addColorStop(1, 'rgba(80, 70, 60, 0)');
    cctx.fillStyle = grad;
    cctx.beginPath();
    cctx.arc(x, y, r, 0, Math.PI * 2);
    cctx.fill();

    // Bright rim (impact ejecta)
    cctx.strokeStyle = 'rgba(140, 130, 115, 0.4)';
    cctx.lineWidth = 1.5;
    cctx.beginPath();
    cctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
    cctx.stroke();
  }

  // ---- Normal map (fake bumps for realistic lighting) ----
  // We derive it from a grayscale version of the noise
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = normalCanvas.height = size;
  const nctx = normalCanvas.getContext('2d');

  // Base normal = flat (128, 128, 255)
  nctx.fillStyle = 'rgb(128, 128, 255)';
  nctx.fillRect(0, 0, size, size);

  // Perturb normals based on crater positions — a rough approximation
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 40 + 8;

    const grad = nctx.createRadialGradient(x, y, 0, x, y, r);
    // Random normal tilt in a random direction
    const dx = Math.floor(128 + (Math.random() - 0.5) * 160);
    const dy = Math.floor(128 + (Math.random() - 0.5) * 160);
    grad.addColorStop(0, `rgb(${dx}, ${dy}, 255)`);
    grad.addColorStop(1, 'rgba(128, 128, 255, 0)');
    nctx.fillStyle = grad;
    nctx.beginPath();
    nctx.arc(x, y, r, 0, Math.PI * 2);
    nctx.fill();
  }

  // ---- Roughness map (varied surface roughness) ----
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = roughCanvas.height = size;
  const rctx = roughCanvas.getContext('2d');

  rctx.fillStyle = '#c8c8c8'; // base roughness ~0.78
  rctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 15 + 2;
    const v = Math.floor(150 + Math.random() * 105);
    rctx.fillStyle = `rgba(${v}, ${v}, ${v}, 0.5)`;
    rctx.beginPath();
    rctx.arc(x, y, r, 0, Math.PI * 2);
    rctx.fill();
  }

  const colorTex = new THREE.CanvasTexture(colorCanvas);
  const normalTex = new THREE.CanvasTexture(normalCanvas);
  const roughTex = new THREE.CanvasTexture(roughCanvas);

  [colorTex, normalTex, roughTex].forEach((t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
  });

  return { colorTex, normalTex, roughTex };
}

export function buildWorld(scene) {
  const objects = [];

  const { colorTex, normalTex, roughTex } = createAsteroidTextures();

  // Varied asteroid shapes — different sizes and detail levels
  const asteroidGeos = [
    createAsteroidGeometry(2.2, 5),
    createAsteroidGeometry(1.4, 5),
    createAsteroidGeometry(3.0, 5),
    createAsteroidGeometry(0.8, 4),
    createAsteroidGeometry(1.8, 5),
    createAsteroidGeometry(1.1, 4),
    createAsteroidGeometry(2.6, 5),
  ];

  // Shared rock material — real asteroids are uniformly gray/rocky
  // Small color tint variations give subtle variety without being cartoonish
  const makeRockMaterial = (tint) => new THREE.MeshStandardMaterial({
    map: colorTex,
    normalMap: normalTex,
    normalScale: new THREE.Vector2(1.5, 1.5),
    roughnessMap: roughTex,
    color: tint,
    roughness: 0.95,
    metalness: 0.02,
  });

  const asteroidMats = [
    makeRockMaterial(0x8a8078),
    makeRockMaterial(0x7a7068),
    makeRockMaterial(0x9a9088),
    makeRockMaterial(0x6a6258),
    makeRockMaterial(0x858078),
  ];

  // ---- Place asteroids ----
  // Denser near the path (foreground) and sparse far away (background)
  for (let i = 0; i < 45; i++) {
    const geo = asteroidGeos[i % asteroidGeos.length];
    const mat = asteroidMats[i % asteroidMats.length];
    const mesh = new THREE.Mesh(geo, mat);

    // Some asteroids close to the path (big detail), some far away (silhouette)
    const isFar = Math.random() < 0.4;
    const angle = Math.random() * Math.PI * 2;
    const radius = isFar ? 15 + Math.random() * 20 : 3 + Math.random() * 6;
    const z = -10 - Math.random() * 220;

    mesh.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * 0.7,
      z
    );

    // Random size scaling for variety
    const s = 0.6 + Math.random() * 0.9;
    mesh.scale.set(s, s * (0.8 + Math.random() * 0.4), s);

    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    // Slow tumbling — real asteroids rotate slowly in space
    const speed = 0.001 + Math.random() * 0.003;
    mesh.userData.spin = {
      x: (Math.random() - 0.5) * speed,
      y: (Math.random() - 0.5) * speed,
      z: (Math.random() - 0.5) * speed * 0.5,
    };

    scene.add(mesh);
    objects.push(mesh);
  }

  // ---- Starfield (kept, but slightly smaller/dimmer for realism) ----
  const particleCount = 2500;
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 200;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
    positions[i * 3 + 2] = -Math.random() * 300;
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const particleMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.08,
    transparent: true,
    opacity: 0.7,
    sizeAttenuation: true,
  });

  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  return { objects, particles };
}