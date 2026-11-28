// 拓维织页 Web 版：Vue 3 + Canvas2D 图元 + WebGL 背景光晕，无其他前端框架
const { createApp, ref, computed, onMounted, watch, nextTick } = Vue;

const uid = () => Math.random().toString(36).slice(2, 10);
const TYPE_NAMES = ['记事', '天气', '提醒', '联系人', '文件', '票据', '清单'];

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

createApp({
  setup() {
    const views = [
      { id: 'canvas', label: '自由画布' },
      { id: 'timeline', label: '时序平铺' },
      { id: 'checklist', label: '清单聚合' }
    ];
    const view = ref('canvas');
    const theme = ref(localStorage.getItem('tw-theme') || 'dark');
    const effects = ref(localStorage.getItem('tw-fx') !== '0');
    const linkMode = ref(false);
    const linkStart = ref(null);
    const selected = ref(null);
    const canvasRef = ref(null);

    const nodes = ref([
      { id: uid(), x: 80, y: 90, w: 250, h: 132, title: '产品定位', type: '记事', body: '织元 + 织线 + 织板，不是备忘录。', color: '#79c6ff', done: false, updated: Date.now() },
      { id: uid(), x: 420, y: 40, w: 250, h: 132, title: '北京天气', type: '天气', body: '只存地点编码，不上传坐标。', color: '#9ad9ff', done: false, updated: Date.now() - 1000 },
      { id: uid(), x: 430, y: 250, w: 250, h: 132, title: '本地提醒', type: '提醒', body: '定时提醒在本机触发。', color: '#a9c8ff', done: false, updated: Date.now() - 2000 },
      { id: uid(), x: 90, y: 320, w: 250, h: 132, title: '文件引用', type: '文件', body: '只保存本地路径引用。', color: '#b7b6ff', done: false, updated: Date.now() - 3000 },
      { id: uid(), x: 680, y: 160, w: 250, h: 132, title: '演示清单', type: '清单', body: '三视图切换 / 贝塞尔织线 / 导出。', color: '#ffb9d6', done: true, updated: Date.now() - 4000 }
    ]);
    const links = ref([]);
    links.value = [
      { from: nodes.value[0].id, to: nodes.value[1].id },
      { from: nodes.value[0].id, to: nodes.value[2].id },
      { from: nodes.value[0].id, to: nodes.value[3].id },
      { from: nodes.value[2].id, to: nodes.value[4].id }
    ];

    let pan = { x: 40, y: 30 };
    let scale = 1;
    let drag = null;

    const sortedNodes = computed(() => [...nodes.value].sort((a, b) => b.updated - a.updated));

    function palette() {
      const dark = theme.value === 'dark';
      return dark
        ? { text: '#eaf5ff', muted: '#a8c6e6', border: 'rgba(165,220,255,.55)', grid: 'rgba(120,190,255,.10)', glow: 'rgba(110,190,255,.35)', top: '#24436e', bottom: '#122942' }
        : { text: '#17304d', muted: '#587491', border: 'rgba(50,120,195,.45)', grid: 'rgba(70,130,190,.12)', glow: 'rgba(70,140,220,.20)', top: '#ffffff', bottom: '#e4eefb' };
    }

    function screenToScene(e) {
      const r = canvasRef.value.getBoundingClientRect();
      return {
        x: (e.clientX - r.left - pan.x) / scale,
        y: (e.clientY - r.top - pan.y) / scale
      };
    }

    function hitNode(p) {
      for (let i = nodes.value.length - 1; i >= 0; i--) {
        const n = nodes.value[i];
        if (p.x >= n.x && p.x <= n.x + n.w && p.y >= n.y && p.y <= n.y + n.h) return n;
      }
      return null;
    }

    function draw() {
      const c = canvasRef.value;
      if (!c) return;
      const ctx = c.getContext('2d');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = c.clientWidth, h = c.clientHeight;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const p = palette();
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(scale, scale);

      ctx.strokeStyle = p.grid;
      ctx.lineWidth = 1;
      const step = 48;
      for (let x = -2000; x < 3000; x += step) {
        ctx.beginPath(); ctx.moveTo(x, -2000); ctx.lineTo(x, 3000); ctx.stroke();
      }
      for (let y = -2000; y < 3000; y += step) {
        ctx.beginPath(); ctx.moveTo(-2000, y); ctx.lineTo(3000, y); ctx.stroke();
      }

      links.value.forEach((l) => {
        const a = nodes.value.find(n => n.id === l.from);
        const b = nodes.value.find(n => n.id === l.to);
        if (!a || !b) return;
        const ax = a.x + a.w, ay = a.y + a.h / 2;
        const bx = b.x, by = b.y + b.h / 2;
        const t = Math.max(45, Math.abs(bx - ax) * .45);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.bezierCurveTo(ax + t, ay, bx - t, by, bx, by);
        if (effects.value) {
          ctx.strokeStyle = p.glow;
          ctx.lineWidth = 8;
          ctx.stroke();
        }
        ctx.strokeStyle = p.border;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      nodes.value.forEach((n) => {
        const isSel = selected.value && selected.value.id === n.id;
        if (effects.value) {
          ctx.save();
          ctx.shadowColor = n.color;
          ctx.shadowBlur = isSel ? 26 : 14;
          roundRect(ctx, n.x, n.y, n.w, n.h, 20);
          ctx.fillStyle = 'rgba(0,0,0,0.01)';
          ctx.fill();
          ctx.restore();
        }
        const g = ctx.createLinearGradient(n.x, n.y, n.x + n.w, n.y + n.h);
        g.addColorStop(0, p.top);
        g.addColorStop(1, p.bottom);
        roundRect(ctx, n.x, n.y, n.w, n.h, 20);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = isSel ? n.color : p.border;
        ctx.lineWidth = isSel ? 2.4 : 1.3;
        ctx.stroke();

        ctx.fillStyle = n.color;
        roundRect(ctx, n.x + 14, n.y + 14, 28, 26, 9);
        ctx.fill();
        ctx.fillStyle = theme.value === 'dark' ? '#0b1c31' : '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(TYPE_NAMES.includes(n.type) ? n.type[0] : '记', n.x + 28, n.y + 27);

        ctx.textAlign = 'left';
        ctx.fillStyle = p.text;
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(n.title, n.x + 52, n.y + 27, n.w - 66);
        ctx.fillStyle = p.muted;
        ctx.font = '12px sans-serif';
        ctx.fillText(n.body, n.x + 16, n.y + 62, n.w - 32);
        ctx.fillStyle = p.muted;
        ctx.font = '11px sans-serif';
        ctx.fillText(n.done ? '已完成' : '未完成', n.x + 16, n.y + n.h - 18);
      });
      ctx.restore();
    }

    function addNodeAt(p) {
      const type = TYPE_NAMES[Math.floor(Math.random() * TYPE_NAMES.length)];
      const n = {
        id: uid(), x: p.x - 125, y: p.y - 66, w: 250, h: 132,
        title: '新织元', type, body: '双击可修改标题。', color: '#79c6ff',
        done: false, updated: Date.now()
      };
      nodes.value.push(n);
      selected.value = n;
      draw();
    }

    function addNode() {
      const c = canvasRef.value;
      const center = { x: (c.clientWidth / 2 - pan.x) / scale, y: (c.clientHeight / 2 - pan.y) / scale };
      const title = window.prompt('织元标题', '新织元');
      if (title === null) return;
      addNodeAt(center);
      const n = nodes.value[nodes.value.length - 1];
      n.title = title || '新织元';
      draw();
    }

    function toggleLinkMode() {
      linkMode.value = !linkMode.value;
      linkStart.value = null;
    }

    function onDown(e) {
      const p = screenToScene(e);
      if (linkMode.value) {
        const n = hitNode(p);
        if (!n) return;
        if (!linkStart.value) { linkStart.value = n; return; }
        if (linkStart.value.id !== n.id) links.value.push({ from: linkStart.value.id, to: n.id });
        linkStart.value = null;
        linkMode.value = false;
        draw();
        return;
      }
      const n = hitNode(p);
      if (n) {
        selected.value = n;
        drag = { type: 'node', id: n.id, dx: p.x - n.x, dy: p.y - n.y };
      } else {
        selected.value = null;
        drag = { type: 'pan', sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
      }
      draw();
    }

    function onMove(e) {
      if (!drag) return;
      if (drag.type === 'node') {
        const n = nodes.value.find(x => x.id === drag.id);
        if (n) {
          const p = screenToScene(e);
          n.x = p.x - drag.dx;
          n.y = p.y - drag.dy;
        }
      } else {
        pan.x = drag.px + (e.clientX - drag.sx);
        pan.y = drag.py + (e.clientY - drag.sy);
      }
      draw();
    }

    function onUp() { drag = null; }

    function onWheel(e) {
      const r = canvasRef.value.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const sx = (mx - pan.x) / scale, sy = (my - pan.y) / scale;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      scale = Math.min(2.6, Math.max(0.4, scale * factor));
      pan.x = mx - sx * scale;
      pan.y = my - sy * scale;
      draw();
    }

    function zoom(f) {
      const c = canvasRef.value;
      const mx = c.clientWidth / 2, my = c.clientHeight / 2;
      const sx = (mx - pan.x) / scale, sy = (my - pan.y) / scale;
      scale = Math.min(2.6, Math.max(0.4, scale * f));
      pan.x = mx - sx * scale;
      pan.y = my - sy * scale;
      draw();
    }

    function onDblClick(e) {
      if (hitNode(screenToScene(e))) return;
      addNodeAt(screenToScene(e));
    }

    function focusNode(n) {
      view.value = 'canvas';
      selected.value = n;
      const c = canvasRef.value;
      pan.x = c.clientWidth / 2 - (n.x + n.w / 2) * scale;
      pan.y = c.clientHeight / 2 - (n.y + n.h / 2) * scale;
      nextTick(draw);
    }

    function setTheme(t) {
      theme.value = t;
      document.body.dataset.theme = t;
      localStorage.setItem('tw-theme', t);
      initGL();
      draw();
    }

    let glStarted = false;
    function initGL() {
      if (glStarted) return;
      const glCanvas = document.getElementById('glbg');
      const gl = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');
      if (!gl) return;
      glStarted = true;
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}');
      gl.compileShader(vs);
      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, `
        precision mediump float;
        uniform vec2 u_res;
        uniform float u_time;
        uniform float u_light;
        void main(){
          vec2 p = gl_FragCoord.xy / u_res;
          float wave = 0.5 + 0.5 * sin(p.x * 4.0 + u_time * 0.25) * cos(p.y * 3.0 - u_time * 0.18);
          vec3 darkA = vec3(0.05,0.13,0.25);
          vec3 darkB = vec3(0.10,0.24,0.43);
          vec3 lightA = vec3(0.86,0.92,0.99);
          vec3 lightB = vec3(0.72,0.82,0.95);
          vec3 a = mix(darkA, lightA, u_light);
          vec3 b = mix(darkB, lightB, u_light);
          vec3 col = mix(a, b, wave * 0.55 + p.x * 0.25);
          col = mix(col, vec3(0.90,0.94,0.99), u_light * 0.10);
          gl_FragColor = vec4(col, 1.0);
        }`);
      gl.compileShader(fs);
      const prog = gl.createProgram();
      gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const res = gl.getUniformLocation(prog, 'u_res');
      const time = gl.getUniformLocation(prog, 'u_time');
      const lightLoc = gl.getUniformLocation(prog, 'u_light');
      function frame(t) {
        if (glCanvas.width !== window.innerWidth || glCanvas.height !== window.innerHeight) {
          glCanvas.width = window.innerWidth;
          glCanvas.height = window.innerHeight;
        }
        gl.viewport(0, 0, glCanvas.width, glCanvas.height);
        gl.uniform2f(res, glCanvas.width, glCanvas.height);
        gl.uniform1f(time, t / 1000);
        gl.uniform1f(lightLoc, theme.value === 'light' ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    onMounted(() => {
      document.body.dataset.theme = theme.value;
      initGL();
      nextTick(draw);
      window.addEventListener('resize', draw);
    });

    watch(effects, (v) => { localStorage.setItem('tw-fx', v ? '1' : '0'); draw(); });

    return {
      views, view, theme, effects, linkMode, selected, canvasRef, nodes, links,
      sortedNodes, addNode, toggleLinkMode, onDown, onMove, onUp, onWheel,
      onDblClick, zoom, focusNode, setTheme
    };
  }
}).mount('#app');
