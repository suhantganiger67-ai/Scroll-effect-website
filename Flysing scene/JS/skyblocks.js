import * as THREE from 'three';

// Procedural nebula skybox using a big inward-facing sphere with a custom shader
export function createSkybox(scene) {
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
    uniforms: {
      uTime: { value: 0 },
    },
    side: THREE.BackSide,
    depthWrite: false,
  });

  const skybox = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skybox);

  return skybox;
}