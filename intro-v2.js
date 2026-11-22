// 拓维科技开场 —— Three.js(WebGL) + GLSL + Canvas 2D + WAAPI
// 无翻转、无圆盘、无粒子：方形 logo 淡入 + 轻微由远及近
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const container = document.getElementById('intro');
const canvas = document.createElement('canvas');
container.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 9);
camera.lookAt(0, 0, 0);

/* GLSL：只负责淡入和极轻微扫光，不画圆盘、不加金属高光 */
const uniforms = {
  uTexture: { value: null },
  uOpacity: { value: 0 },
  uTime: { value: 0 },
};
const logoMat = new THREE.ShaderMaterial({
  uniforms,
  transparent: true,
  depthWrite: false,
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D uTexture;
    uniform float uOpacity;
    uniform float uTime;
    varying vec2 vUv;
    void main(){
      vec4 tex = texture2D(uTexture, vUv);
      float sweep = 0.99 + 0.01 * sin(vUv.x * 6.0 - uTime);
      gl_FragColor = vec4(tex.rgb * sweep, tex.a * uOpacity);
    }
  `,
});

// 原始方形 logo（125×135），按原比例；相机固定不推近，所以是真的小
const logo = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.08), logoMat);
logo.position.y = 0.12;
scene.add(logo);

/* 「無限創新」：Canvas 2D 渐变连笔纹理 */
function makeTextTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 280;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  const grad = ctx.createLinearGradient(0, 0, c.width, 0);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.35, '#E5D8E8');
  grad.addColorStop(0.65, '#B79BB8');
  grad.addColorStop(1, '#ffffff');
  ctx.font = 'italic 500 150px "Zhi Mang Xing", "Ma Shan Zheng", cursive';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(165,142,164,0.7)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = grad;
  ctx.fillText('無限創新', 512, 140);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}
const textMat = new THREE.MeshBasicMaterial({
  map: makeTextTexture(), transparent: true, depthWrite: false, opacity: 0,
});
const text = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.52), textMat);
text.position.y = -0.82;
scene.add(text);

const clock = new THREE.Clock();
const DUR = 1.5;
const TOTAL = 2.6;
let done = false;

function animate() {
  const t = clock.getElapsedTime();
  uniforms.uTime.value = t;

  // 纯淡入 + 透视推进，完全不旋转
  if (t < DUR) {
    const p = t / DUR;
    const e = 1 - Math.pow(1 - p, 3);
    logo.position.z = (1 - e) * -2.4;
    logo.position.y = 0.12 - (1 - e) * 0.1;
    logo.scale.setScalar(0.9 + e * 0.1);
    uniforms.uOpacity.value = Math.min(p * 1.8, 1);
  } else {
    logo.position.z = 0;
    logo.position.y = 0.12 + Math.sin(t * 1.1) * 0.012;
    logo.scale.setScalar(1);
    uniforms.uOpacity.value = 1;
  }

  if (t > 0.55) {
    const q = Math.min((t - 0.55) / 0.8, 1);
    textMat.opacity = q;
    text.position.y = -0.82 - (1 - q) * 0.12;
  }

  renderer.render(scene, camera);

  if (!done && t > TOTAL) {
    done = true;
    fadeOut();
  } else {
    requestAnimationFrame(animate);
  }
}

/* WAAPI 淡出 */
function fadeOut() {
  const anim = container.animate(
    [{ opacity: 1 }, { opacity: 0 }],
    { duration: 600, easing: 'ease', fill: 'forwards' }
  );
  anim.onfinish = () => {
    container.style.display = 'none';
    renderer.dispose();
    logoMat.dispose();
    text.geometry.dispose();
    textMat.dispose();
  };
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

if (document.fonts && document.fonts.load) {
  document.fonts.load('italic 150px "Zhi Mang Xing"').then(() => {
    textMat.map = makeTextTexture();
    textMat.needsUpdate = true;
  }).catch(() => {});
}

let started = false;
function start() {
  if (started) return;
  started = true;
  clock.start();
  animate();
}
new THREE.TextureLoader().load('assets/logo.png', (t) => {
  t.minFilter = THREE.LinearFilter;
  uniforms.uTexture.value = t;
  start();
});
setTimeout(start, 1500);
