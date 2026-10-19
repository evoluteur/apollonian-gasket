/*
  Apollonian Gasket
  Circles packed into circles, forever: in every gap between three
  touching circles fits a fourth, given by Descartes' circle theorem.
  With the right first four, every curvature is a whole number.
  https://github.com/evoluteur/apollonian-gasket
  (c) 2026 Olivier Giulieri
*/

// root quadruples: the curvatures (1 / radius) of the outer circle (negative,
// it holds the others) and of the first three circles inside it
const PRESETS = {
  q1: { name: "−1, 2, 2, 3", q: [-1, 2, 2], text: "The classic: two circles of half the size, side by side. Every curvature is a whole number." },
  q2: { name: "−2, 3, 6, 7", q: [-2, 3, 6], text: "Two circles of a third and two thirds of the diameter." },
  q3: { name: "−3, 5, 8, 8", q: [-3, 5, 8], text: "An integral gasket with a twin: two circles of curvature 8." },
  q4: { name: "−4, 8, 9, 9", q: [-4, 8, 9] },
  q5: { name: "−6, 10, 15, 19", q: [-6, 10, 15] },
  q6: { name: "−6, 11, 14, 15", q: [-6, 11, 14] },
  q7: { name: "−10, 18, 23, 27", q: [-10, 18, 23] },
  q8: { name: "−12, 25, 25, 28", q: [-12, 25, 25] },
  free: { name: "Free", text: "Choose the sizes of the first two circles. The curvatures are no longer whole numbers." },
};

const PALETTES = {
  glass: { name: "Stained glass", bg: "#0e0e14", line: "#0e0e14", stops: ["#2b59c3", "#1f9e89", "#f2c14e", "#e4572e", "#a33ea1", "#2b59c3"] },
  ocean: { name: "Ocean", bg: "#04121f", line: "#04121f", stops: ["#0b3c5d", "#1d70a2", "#3fb0c9", "#a5e3e0", "#f5fbf7"] },
  sunset: { name: "Sunset", bg: "#1b1024", line: "#1b1024", stops: ["#6b2a9e", "#d6336c", "#ff7a59", "#ffd36e", "#fff3d6"] },
  ink: { name: "Ink on paper", bg: "#f3eee2", line: "#1c1b19", stops: ["#f3eee2", "#f3eee2"], outline: true },
  gold: { name: "Black and gold", bg: "#0d0d0d", line: "#d9b45a", stops: ["#0d0d0d", "#0d0d0d"], outline: true },
  blueprint: { name: "Blueprint", bg: "#1f4e8c", line: "#e6f0ff", stops: ["#1f4e8c", "#2a64ad"], outline: true },
};

const state = {
  preset: "q1",
  ra: 0.5, // free: the first circle's radius (the outer circle's is 1)
  rb: 0.5, // free: the second circle's radius, as a share of what is left
  detail: 1.5, // the smallest circle, in pixels
  palette: "glass",
  numbers: true,
  animate: true,
};

let canvas, ctx, circles = [], scale = 1, drawn = 0, anim = null;

// ------------------------------------------------------------ the circles

// a circle: curvature k, and k times its center (kx, ky), which add up linearly
const circle = (k, x, y) => ({ k, kx: k * x, ky: k * y });
const radius = (c) => 1 / Math.abs(c.k);
const center = (c) => [c.kx / c.k, c.ky / c.k];

// the first three: the outer circle, then two inside it, touching it and each other
const firstThree = () => {
  let ra, rb;
  const p = PRESETS[state.preset];
  if (p.q) {
    const [a, b, c] = p.q;
    scale = -a; // curvatures shown as the whole numbers of the preset
    ra = -a / b;
    rb = -a / c;
  } else {
    scale = 1;
    ra = state.ra;
    rb = state.rb * (1 - ra);
  }
  const dA = 1 - ra, dB = 1 - rb;
  // the second circle, by the law of cosines
  const cos = Math.max(-1, Math.min(1, (dA * dA + dB * dB - (ra + rb) ** 2) / (2 * dA * dB)));
  const t = Math.PI - Math.acos(cos);
  return [circle(-1, 0, 0), circle(1 / ra, -dA, 0), circle(1 / rb, dB * Math.cos(t), dB * Math.sin(t))];
};

// Descartes' theorem, with complex centers: the fourth circle touching three
const fourth = (c1, c2, c3) => {
  const k = c1.k + c2.k + c3.k + 2 * Math.sqrt(Math.max(0, c1.k * c2.k + c2.k * c3.k + c3.k * c1.k));
  // (k4 z4) = k1z1 + k2z2 + k3z3 ± 2 sqrt(k1k2 z1z2 + k2k3 z2z3 + k1k3 z1z3); try both signs
  const z = [c1, c2, c3].map((c) => center(c));
  const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const ks = [c1.k, c2.k, c3.k];
  let s = [0, 0];
  for (const [i, j] of [[0, 1], [1, 2], [0, 2]]) {
    const m = mul(z[i], z[j]);
    s[0] += ks[i] * ks[j] * m[0];
    s[1] += ks[i] * ks[j] * m[1];
  }
  const r = Math.sqrt(Math.hypot(s[0], s[1])), a = Math.atan2(s[1], s[0]) / 2;
  const root = [r * Math.cos(a), r * Math.sin(a)];
  const base = [c1.kx + c2.kx + c3.kx, c1.ky + c2.ky + c3.ky];
  let best = null, err = Infinity;
  for (const sg of [1, -1]) {
    const c4 = { k, kx: base[0] + 2 * sg * root[0], ky: base[1] + 2 * sg * root[1] };
    const [x, y] = center(c4);
    let e = 0;
    for (const c of [c1, c2, c3]) {
      const [cx, cy] = center(c);
      const d = Math.hypot(x - cx, y - cy);
      e += Math.abs(d - (c.k < 0 ? radius(c) - radius(c4) : radius(c) + radius(c4)));
    }
    if (e < err) {
      err = e;
      best = c4;
    }
  }
  return best;
};

// the other circle touching three of a quadruple: reflect the fourth
const swap = (a, b, c, d) => ({ k: 2 * (a.k + b.k + c.k) - d.k, kx: 2 * (a.kx + b.kx + c.kx) - d.kx, ky: 2 * (a.ky + b.ky + c.ky) - d.ky });

const build = (w) => {
  const R = w * 0.48; // the outer circle, in pixels
  const minK = R / state.detail; // circles smaller than detail pixels are left out
  const [o, a, b] = firstThree();
  const c = fourth(o, a, b), d = swap(o, a, b, c);
  circles = [o, a, b, c];
  if (d.k < minK) circles.push(d);
  let budget = 60000;
  const rec = (q1, q2, q3, n) => {
    for (const [old, x, y] of [[q1, q2, q3], [q2, q1, q3], [q3, q1, q2]]) {
      const m = swap(x, y, n, old);
      if (m.k > minK || m.k <= 0 || --budget < 0) continue;
      circles.push(m);
      rec(x, y, n, m);
    }
  };
  rec(o, a, b, c);
  if (d.k < minK) rec(o, a, b, d);
  // biggest first, so they appear by size
  circles.sort((p, q) => (p.k < 0 ? -1 : q.k < 0 ? 1 : p.k - q.k));
};

// ------------------------------------------------------------ drawing

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const colorFor = (c) => {
  const pal = PALETTES[state.palette];
  const s = pal.stops.map(hex);
  // by curvature, on a log scale, cycling through the colors
  const t = (Math.log2(Math.abs(c.k) * scale + 1) / 2.2) % 1;
  const u = t * (s.length - 1), k = Math.min(s.length - 2, Math.floor(u)), f = u - k;
  const col = s[k].map((v, j) => Math.round(v + (s[k + 1][j] - v) * f));
  return `rgb(${col[0]},${col[1]},${col[2]})`;
};

const isWhole = () => !!PRESETS[state.preset].q;

const drawCircle = (c, w) => {
  const pal = PALETTES[state.palette];
  const R = w * 0.48, cx = w / 2, cy = w / 2;
  const [x, y] = center(c), r = radius(c) * R;
  const X = cx + x * R, Y = cy + y * R;
  ctx.beginPath();
  ctx.arc(X, Y, Math.max(0.3, r - (c.k < 0 ? 0 : 0.5)), 0, Math.PI * 2);
  if (c.k > 0) {
    ctx.fillStyle = colorFor(c);
    if (!pal.outline) ctx.fill();
  }
  ctx.strokeStyle = pal.line;
  ctx.lineWidth = pal.outline ? Math.max(0.5, Math.min(2, r / 30)) : Math.max(0.4, Math.min(3, r / 25));
  ctx.stroke();
  // the curvature, when it fits
  if (state.numbers && isWhole() && r > 7) {
    const n = Math.round(c.k * scale);
    const txt = String(n);
    const fs = Math.min(r * 0.9, (r * 1.5) / txt.length, w / 18);
    if (fs < 6) return;
    ctx.font = `${fs}px Overpass, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = pal.outline ? pal.line : "rgba(255,255,255,0.85)";
    if (c.k < 0) return; // the outer circle's (negative) curvature is in the list
    ctx.fillText(txt, X, Y + fs * 0.06);
  }
};

const clear = (w) => {
  ctx.fillStyle = PALETTES[state.palette].bg;
  ctx.fillRect(0, 0, w, w);
};

const redraw = () => {
  const w = canvas.width;
  if (!w) return;
  anim = null;
  clear(w);
  for (const c of circles) drawCircle(c, w);
  drawn = circles.length;
};

const play = () => {
  anim = { start: performance.now() };
  drawn = 0;
  clear(canvas.width);
};

const loop = (now) => {
  if (anim) {
    // the circles appear by size, faster and faster
    const t = Math.min(1, (now - anim.start) / 3500);
    const to = Math.round(Math.pow(t, 2.2) * circles.length);
    for (; drawn < to; drawn++) drawCircle(circles[drawn], canvas.width);
    if (t >= 1) anim = null;
  }
  requestAnimationFrame(loop);
};

const update = (animate) => {
  build(canvas.width);
  $("v-count").textContent = circles.length.toLocaleString("en-US");
  saveHash();
  if (animate && state.animate) play();
  else redraw();
};

// ------------------------------------------------------------ export

const download = (blob, name) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

const exportSVG = () => {
  const W = 1000, R = W * 0.48, pal = PALETTES[state.palette];
  let body = "";
  for (const c of circles) {
    const [x, y] = center(c), r = radius(c) * R;
    if (r < 0.2) continue;
    const fill = c.k > 0 && !pal.outline ? colorFor(c) : "none";
    body += `<circle cx="${(W / 2 + x * R).toFixed(2)}" cy="${(W / 2 + y * R).toFixed(2)}" r="${r.toFixed(2)}" fill="${fill}"/>\n`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}" width="${W}" height="${W}">
<rect width="${W}" height="${W}" fill="${pal.bg}"/>
<g stroke="${pal.line}" stroke-width="${pal.outline ? 1 : 1.2}">
${body}</g>
</svg>`;
  download(new Blob([svg], { type: "image/svg+xml" }), `apollonian-gasket.svg`);
};

// ------------------------------------------------------------ controls

const $ = (id) => document.getElementById(id);

let hashTimer;
const saveHash = () => {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => {
    const q = new URLSearchParams({ p: state.preset, c: state.palette });
    if (state.preset === "free") {
      q.set("a", state.ra);
      q.set("b", state.rb);
    }
    if (state.detail !== 1.5) q.set("d", state.detail);
    if (!state.numbers) q.set("n", 0);
    history.replaceState(null, "", "#" + q.toString());
  }, 300);
};

const readHash = () => {
  const q = new URLSearchParams(location.hash.slice(1));
  if (PRESETS[q.get("p")]) state.preset = q.get("p");
  if (PALETTES[q.get("c")]) state.palette = q.get("c");
  const a = parseFloat(q.get("a")), b = parseFloat(q.get("b")), d = parseFloat(q.get("d"));
  if (a >= 0.05 && a <= 0.95) state.ra = a;
  if (b >= 0.05 && b <= 1) state.rb = b;
  if (d >= 0.5 && d <= 40) state.detail = d;
  if (q.get("n") === "0") state.numbers = false;
};

const showValues = () => {
  const p = PRESETS[state.preset];
  $("preset-text").textContent = p.text || "Another gasket where every curvature is a whole number.";
  $("free-box").hidden = state.preset !== "free";
  $("numbers-box").hidden = state.preset === "free";
  $("v-ra").textContent = Math.round(state.ra * 100) + "%";
  $("v-rb").textContent = Math.round(state.rb * 100) + "%";
  $("v-detail").textContent = state.detail + " px";
};

const options = (o) => Object.entries(o).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join("");

const initGasket = () => {
  canvas = $("gasket");
  ctx = canvas.getContext("2d");
  readHash();
  $("preset").innerHTML = options(PRESETS);
  $("palette").innerHTML = options(PALETTES);
  $("preset").value = state.preset;
  $("palette").value = state.palette;
  $("ra").value = state.ra;
  $("rb").value = state.rb;
  $("detail").value = state.detail;
  $("numbers").checked = state.numbers;
  $("animate").checked = state.animate;
  showValues();
  const fit = (first) => {
    const r = canvas.getBoundingClientRect();
    const w = Math.round(r.width * Math.min(2, window.devicePixelRatio || 1));
    if (w && canvas.width !== w) {
      canvas.width = canvas.height = w;
      update(first === true);
    }
  };
  fit(true);
  window.addEventListener("resize", fit);

  $("preset").addEventListener("change", (e) => {
    state.preset = e.target.value;
    showValues();
    update(true);
  });
  for (const id of ["ra", "rb"])
    $(id).addEventListener("input", (e) => {
      state[id] = +e.target.value;
      showValues();
      update(false);
    });
  $("detail").addEventListener("input", (e) => {
    state.detail = +e.target.value;
    showValues();
    update(false);
  });
  $("palette").addEventListener("change", (e) => {
    state.palette = e.target.value;
    saveHash();
    redraw();
  });
  $("numbers").addEventListener("change", (e) => {
    state.numbers = e.target.checked;
    saveHash();
    redraw();
  });
  $("animate").addEventListener("change", (e) => (state.animate = e.target.checked));
  $("btn-play").addEventListener("click", play);
  $("btn-png").addEventListener("click", () => {
    redraw();
    canvas.toBlob((b) => download(b, `apollonian-gasket.png`));
  });
  $("btn-svg").addEventListener("click", exportSVG);
  requestAnimationFrame(loop);
};
