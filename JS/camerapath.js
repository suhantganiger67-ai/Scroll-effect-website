const { gsap } = window;
gsap.registerPlugin(window.ScrollTrigger);

const keyframes = [
  // Stage 0 — Start
  { pos: { x: 0,  y: 0,  z: 10   }, look: { x: 0,  y: 0,  z: -10  } },

  // Stage 1 — Drift left, tilt down
  { pos: { x: -6, y: 2,  z: -20  }, look: { x: 4,  y: -1, z: -40  } },

  // Stage 2 — Sweep right and up
  { pos: { x: 8,  y: 5,  z: -60  }, look: { x: -3, y: 0,  z: -90  } },

  // Stage 3 — Dive down, recenter
  { pos: { x: 0,  y: -4, z: -100 }, look: { x: 0,  y: 2,  z: -140 } },

  // Stage 4 — Final approach
  { pos: { x: 0,  y: 0,  z: -170 }, look: { x: 0,  y: 0,  z: -200 } },
];

const camState = {
  px: keyframes[0].pos.x, py: keyframes[0].pos.y, pz: keyframes[0].pos.z,
  lx: keyframes[0].look.x, ly: keyframes[0].look.y, lz: keyframes[0].look.z,
};

export function setupCameraPath() {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#scroll-container',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.2,
    },
  });

  keyframes.forEach((frame, i) => {
    if (i === 0) return;

    tl.to(camState, {
      px: frame.pos.x,
      py: frame.pos.y,
      pz: frame.pos.z,
      lx: frame.look.x,
      ly: frame.look.y,
      lz: frame.look.z,
      duration: 1,
      ease: 'power2.inOut',
    }, i - 1);
  });

  return camState;
}