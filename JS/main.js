import * as THREE from 'three';
import { createScene } from './scene.js';
import { buildWorld } from './world.js';
import { setupCameraPath } from './cameraPath.js';

// ===================================================================
// SKYBOX (inlined — no separate file needed)
// ===================================================================
function createSkybox(scene) {
  const vertexShader = `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    varying vec3 vWorldPosition;

    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }

    float noise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
            mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
            mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
        f.z
      );
    }

    float fbm(vec3 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec3 dir = normalize(vWorldPosition);
      vec3 col = vec3(0.02, 0.02, 0.06);

      float n1 = fbm(dir * 2.0 + vec3(uTime * 0.01, 0.0, 0.0));
      float n2 = fbm(dir * 3.5 - vec3(0.0, uTime * 0.008, 0.0));
      float nebula = smoothstep(0.4, 0.9, n1 * 0.6 + n2 * 0.4);

      vec3 purple = vec3(0.35, 0.15, 0.55);
      vec3 cyan = vec3(0.10, 0.35, 0.55);
      vec3 nebulaColor = mix(purple, cyan, n2);

      col += nebula * nebulaColor * 0.9;

      float starSeed = hash(floor(dir * 250.0));
      float stars = step(0.9975, starSeed);
      col += vec3(stars) * 1.5;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const skyGeo = new THREE.SphereGeometry(400, 64, 64);
  const skyMat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { uTime: { value: 0 } },
    side: THREE.BackSide,
    depthWrite: false,
  });

  const skybox = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skybox);
  return skybox;
}

// ===================================================================
// 1. SMOOTH SCROLL (Lenis)
// ===================================================================
const lenis = new window.Lenis({
  duration: 1.2,
  smoothWheel: true,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

window.ScrollTrigger.addEventListener('refresh', () => lenis.resize());

// ===================================================================
// 2. SCROLL VELOCITY TRACKER
// ===================================================================
let scrollVelocity = 0;
lenis.on('scroll', (e) => {
  scrollVelocity = e.velocity;
});

// ===================================================================
// 3. MOUSE PARALLAX
// ===================================================================
const mouse = { x: 0, y: 0 };
const mouseSmooth = { x: 0, y: 0 };

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// ===================================================================
// 4. THREE.JS SETUP
// ===================================================================
const canvas = document.querySelector('#webgl');
const { scene, camera, renderer, composer, bokeh } = createScene(canvas);
const skybox = createSkybox(scene);
const { objects, particles } = buildWorld(scene);
const camState = setupCameraPath();

// ===================================================================
// 5. TEXT REVEALS
// ===================================================================
window.gsap.utils.toArray('.panel').forEach((panel) => {
  window.gsap.fromTo(panel,
    { opacity: 0, y: 80 },
    {
      opacity: 1,
      y: 0,
      scrollTrigger: {
        trigger: panel,
        start: 'top 85%',
        end: 'top 40%',
        scrub: 1,
      },
    }
  );

  window.gsap.to(panel, {
    opacity: 0,
    y: -60,
    scrollTrigger: {
      trigger: panel,
      start: 'bottom 60%',
      end: 'bottom 20%',
      scrub: 1,
    },
  });
});

// ===================================================================
// 6. ANIMATION LOOP
// ===================================================================
const clock = new THREE.Clock();

function animate() {
  const t = clock.getElapsedTime();

  // Smooth mouse
  mouseSmooth.x += (mouse.x - mouseSmooth.x) * 0.06;
  mouseSmooth.y += (mouse.y - mouseSmooth.y) * 0.06;

  // Camera from scroll path
  camera.position.set(camState.px, camState.py, camState.pz);
  camera.lookAt(camState.lx, camState.ly, camState.lz);

  // Mouse parallax
  camera.position.x += mouseSmooth.x * 1.8;
  camera.position.y += mouseSmooth.y * 1.8;
  camera.rotation.z += mouseSmooth.x * 0.03;
  camera.rotation.x += mouseSmooth.y * 0.02;

  // Idle drift
  camera.position.x += Math.sin(t * 0.5) * 0.02;
  camera.position.y += Math.cos(t * 0.4) * 0.02;

  // Scroll shake
  const shakeAmount = Math.min(Math.abs(scrollVelocity) * 0.03, 0.5);
  camera.position.x += (Math.random() - 0.5) * shakeAmount;
  camera.position.y += (Math.random() - 0.5) * shakeAmount;
  camera.rotation.z += (Math.random() - 0.5) * shakeAmount * 0.05;
  scrollVelocity *= 0.92;

  // Depth of field focus
  if (bokeh) {
    bokeh.uniforms.focus.value = 15 + Math.abs(camera.position.z) * 0.05;
  }

  // Tumble asteroids
  for (const obj of objects) {
    obj.rotation.x += obj.userData.spin.x;
    obj.rotation.y += obj.userData.spin.y;
    if (obj.userData.spin.z) obj.rotation.z += obj.userData.spin.z;
  }

  // Particle drift
  particles.rotation.z = t * 0.02;

  // Skybox shader time
  skybox.material.uniforms.uTime.value = t;

  // Render
  composer.render();
  requestAnimationFrame(animate);
}

animate();