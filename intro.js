// 拓维科技 3D 开场动画 —— Three.js(WebGL) + GLSL 着色器 + Canvas 2D + WAAPI
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

/* ---------- 圆形 Logo 圆盘：自定义 GLSL 着色器（菲涅尔光晕 + 流光扫描） ---------- */
const logoUniforms = {
  uTexture: { value: null },
  uTime: { value: 0 },
  uGlow: { value: new THREE.Color('#A58EA4') },
};
const logoMaterial = new THREE.ShaderMaterial({
  uniforms: logoUniforms,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main(){
      vUv = uv;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vViewDir = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D uTexture;
    uniform float uTime;
    uniform vec3 uGlow;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main(){
      vec4 tex = texture2D(uTexture, vUv);
      float ndv = abs(dot(normalize(vNormal), normalize(vViewDir)));
      float fresnel = pow(1.0 - ndv, 2.6);
      vec3 glow = uGlow * fresnel * 1.6;
      float scan = 0.9 + 0.12 * sin(vUv.x * 12.0 - uTime * 2.4);
      vec3 col = tex.rgb * scan + glow;
      gl_FragColor = vec4(col, tex.a + fresnel * 0.7);
    }
  `,
});

const logo = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), logoMaterial);
scene.add(logo);

new THREE.TextureLoader().load('assets/logo-round.png', (t) => {
  t.minFilter = THREE.LinearFilter;
  logoUniforms.uTexture.value = t;
});

/* ---------- 粒子光环 ---------- */
const pCount = 1400;
const pPos = new Float32Array(pCount * 3);
for (let i = 0; i < pCount; i++) {
  const r = 1.8 + Math.random() * 1.1;
  const a = Math.random() * Math.PI * 2;
  const y = (Math.random() - 0.5) * 0.6;
  pPos[i * 3] = Math.cos(a) * r;
  pPos[i * 3 + 1] = y;
  pPos[i * 3 + 2] = Math.sin(a) * r;
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const pMat = new THREE.PointsMaterial({
  color: 0xB79BB8, size: 0.022, transparent: true, opacity: 0.8,
  blending: THREE.AdditiveBlending, depthWrite: false,
});
const particles = new THREE.Points(pGeo, pMat);
particles.rotation.x = 0.4;
scene.add(particles);

/* ---------- 「無限創新」文字：Canvas 2D 渐变连笔纹理 ---------- */
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
const text = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.98), textMat);
text.position.y = -1.55;
scene.add(text);

/* ---------- 动画循环 ---------- */
const clock = new THREE.Clock();
let done = false;

function animate() {
  const t = clock.getElapsedTime();
  logoUniforms.uTime.value = t;

  // 相机推近 + 轻微视差
  const zoom = 1 - Math.min(t / 3.4, 1) * 0.35;
  camera.position.z = 9 * zoom;
  camera.position.x = Math.sin(t * 0.4) * 0.4;
  camera.lookAt(0, 0, 0);

  // logo 旋转飞入
  if (t < 1.8) {
    const p = t / 1.8;
    const ease = 1 - Math.pow(1 - p, 4);
    logo.rotation.y = (1 - ease) * Math.PI * 2.5;
    logo.scale.setScalar(0.3 + ease * 0.7);
  } else {
    logo.rotation.y = Math.sin(t * 0.5) * 0.06;
    logo.scale.setScalar(1);
  }

  // 粒子旋转
  particles.rotation.y = t * 0.25;
  particles.rotation.z = Math.sin(t * 0.18) * 0.15;

  // 文字淡入
  if (t > 1.1) {
    textMat.opacity = Math.min((t - 1.1) / 0.9, 1);
    text.position.y = -2.2 + (1 - Math.min((t - 1.1) / 0.9, 1)) * 0.4;
  }

  renderer.render(scene, camera);

  if (!done && t > 3.9) {
    done = true;
    fadeOut();
  } else {
    requestAnimationFrame(animate);
  }
}

/* ---------- WAAPI 淡出整个开场层 ---------- */
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

// 等字体加载后重绘文字纹理，确保连笔字体生效
if (document.fonts && document.fonts.load) {
  document.fonts.load('italic 150px "Zhi Mang Xing"').then(() => {
    textMat.map = makeTextTexture();
    textMat.needsUpdate = true;
  }).catch(() => {});
}

animate();
