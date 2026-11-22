// 拓维科技 3D 开场动画 —— Three.js(WebGL) + GLSL + Canvas 2D + WAAPI
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

/* ---------- 方形 Logo：GLSL 只做轻微扫光与淡入，不再画圆盘/银光 ---------- */
const logoUniforms = {
  uTexture: { value: null },
  uTime: { value: 0 },
  uOpacity: { value: 0 },
};
const logoMaterial = new THREE.ShaderMaterial({
  uniforms: logoUniforms,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D uTexture;
    uniform float uTime;
    uniform float uOpacity;
    varying vec2 vUv;
    void main(){
      vec4 tex = texture2D(uTexture, vUv);
      float sweep = 0.98 + 0.02 * sin(vUv.x * 6.0 - uTime * 1.2);
      gl_FragColor = vec4(tex.rgb * sweep, tex.a * uOpacity);
    }
  `,
});

// 原图 125×135，按原始比例做方形（长方形）平面；相机不推近，所以是真的小
const logo = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.404), logoMaterial);
scene.add(logo);

/* ---------- 粒子光环：收敛范围，不再铺满整屏 ---------- */
const pCount = 700;
const pPos = new Float32Array(pCount * 3);
for (let i = 0; i < pCount; i++) {
  const r = 1.15 + Math.random() * 0.75;
  const a = Math.random() * Math.PI * 2;
  const y = (Math.random() - 0.5) * 0.45;
  pPos[i * 3] = Math.cos(a) * r;
  pPos[i * 3 + 1] = y;
  pPos[i * 3 + 2] = Math.sin(a) * r;
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const pMat = new THREE.PointsMaterial({
  color: 0xB79BB8, size: 0.018, transparent: true, opacity: 0.65,
  blending: THREE.AdditiveBlending, depthWrite: false,
});
const particles = new THREE.Points(pGeo, pMat);
particles.rotation.x = 0.35;
scene.add(particles);

/* ---------- 「無限創新」：Canvas 2D 渐变连笔纹理 ---------- */
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
  ctx.shadowColor = 'rgba(165,142,164,0.85)';
  ctx.shadowBlur = 40;
  ctx.fillStyle = grad;
  ctx.fillText('無限創新', 512, 140);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}
const textMat = new THREE.MeshBasicMaterial({
  map: makeTextTexture(), transparent: true, depthWrite: false, opacity: 0,
});
const text = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.68), textMat);
text.position.y = -1.05;
scene.add(text);

/* ---------- 动画 ---------- */
const clock = new THREE.Clock();
let done = false;
const FLIP = 2.4;   // 单次翻转时长
const TOTAL = 3.9;  // 总时长

function animate() {
  const t = clock.getElapsedTime();
  logoUniforms.uTime.value = t;

  // 一次干净的 3D 翻转飞入：远处 -90°/50° → 正面，带轻微回弹，不再空转多圈
  if (t < FLIP) {
    const p = t / FLIP;
    const e = 1 - Math.pow(1 - p, 4);
    const overshoot = p > 0.72 ? Math.sin((p - 0.72) / 0.28 * Math.PI) * 0.06 : 0;
    logo.rotation.x = (1 - e) * (-Math.PI / 2);
    logo.rotation.y = (1 - e) * (50 * Math.PI / 180);
    logo.position.z = (1 - e) * -6;
    logo.scale.setScalar(0.25 + e * 0.75 + overshoot);
    logoUniforms.uOpacity.value = Math.min(p * 2.4, 1);
  } else {
    logo.rotation.x = 0;
    logo.rotation.y = Math.sin(t * 0.45) * 0.035;
    logo.position.z = 0;
    logo.position.y = Math.sin(t * 1.2) * 0.025;
    logo.scale.setScalar(1);
    logoUniforms.uOpacity.value = 1;
  }

  particles.rotation.y = t * 0.22;
  particles.rotation.z = Math.sin(t * 0.18) * 0.12;

  if (t > 1.15) {
    const q = Math.min((t - 1.15) / 0.9, 1);
    textMat.opacity = q;
    text.position.y = -1.05 - (1 - q) * 0.25;
  }

  renderer.render(scene, camera);

  if (!done && t > TOTAL) {
    done = true;
    fadeOut();
  } else {
    requestAnimationFrame(animate);
  }
}

/* ---------- WAAPI 淡出 ---------- */
function fadeOut() {
  const anim = container.animate(
    [{ opacity: 1 }, { opacity: 0 }],
    { duration: 800, easing: 'ease', fill: 'forwards' }
  );
  anim.onfinish = () => {
    container.style.display = 'none';
    renderer.dispose();
    logoMaterial.dispose();
    pGeo.dispose();
    pMat.dispose();
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
  logoUniforms.uTexture.value = t;
  start();
});
setTimeout(start, 1500); // 图片加载慢时的兜底
