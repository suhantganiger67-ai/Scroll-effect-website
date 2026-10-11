import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function createScene(canvas) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0815, 0.008);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    700
  );
  camera.position.set(0, 0, 10);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x0a0815);

  // Cinematic tone mapping
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // -------------------------------------------------------------------
  // LIGHTING — real asteroid look needs 3 lights:
  // 1. Key light (warm sun)
  // 2. Fill light (cool bounce)
  // 3. Ambient (very dim, space is dark)
  // -------------------------------------------------------------------
  const ambient = new THREE.AmbientLight(0x223344, 0.35);
  scene.add(ambient);

  // Warm sun from upper right
  const sun = new THREE.DirectionalLight(0xffe6c4, 2.4);
  sun.position.set(20, 15, 10);
  scene.add(sun);

  // Cool fill from opposite side
  const fill = new THREE.DirectionalLight(0x5566aa, 0.6);
  fill.position.set(-15, -8, -10);
  scene.add(fill);

  // Very subtle rim light (edge highlights — makes asteroids pop from bg)
  const rim = new THREE.DirectionalLight(0x8877ff, 0.4);
  rim.position.set(-5, 8, 15);
  scene.add(rim);

  // Colored accent lights (deep in scene for atmosphere, not for lighting rocks)
  const purple = new THREE.PointLight(0x9944ff, 1.2, 60, 2);
  purple.position.set(-15, 6, -40);
  scene.add(purple);

  const cyan = new THREE.PointLight(0x00ddff, 1.2, 60, 2);
  cyan.position.set(15, -6, -90);
  scene.add(cyan);

  // -------------------------------------------------------------------
  // POST-PROCESSING
  // -------------------------------------------------------------------
  const isMobile = window.innerWidth <= 768;

  const composer = new EffectComposer(renderer);
  composer.setSize(window.innerWidth, window.innerHeight);
  composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.addPass(new RenderPass(scene, camera));

  // Bloom — VERY subtle now. Asteroids shouldn't glow.
  // This only makes bright specular highlights on asteroid edges bleed slightly.
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.15,   // very low strength
    0.4,    // tighter radius
    0.95    // high threshold — only the very brightest pixels bloom
  );
  composer.addPass(bloom);

  // Depth of field (desktop only)
  let bokeh = null;
  if (!isMobile) {
    bokeh = new BokehPass(scene, camera, {
      focus: 20,
      aperture: 0.00008,
      maxblur: 0.006,
    });
    composer.addPass(bokeh);
  }

  composer.addPass(new OutputPass());

  // Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, composer, bloom, bokeh };
}