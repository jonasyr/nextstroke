'use strict';
const STORE = 'ns-probe-results';
const RUNNING = 'ns-probe-cycle-running';
const $ = id => document.getElementById(id);
let results = {};
try { results = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) { results = {}; }

function record(key, status, detail) {
  results[key] = { status, detail, at: new Date().toISOString() };
  try { localStorage.setItem(STORE, JSON.stringify(results)); } catch (e) { /* private mode */ }
  render();
}

function render() {
  const body = $('results');
  body.innerHTML = '';
  for (const [key, r] of Object.entries(results)) {
    const tr = document.createElement('tr');
    const detail = typeof r.detail === 'string' ? r.detail : JSON.stringify(r.detail);
    tr.innerHTML = `<td>${key}</td><td class="${r.status}">${r.status}</td><td></td>`;
    tr.lastChild.textContent = detail;
    body.append(tr);
  }
  $('json').value = JSON.stringify({ userAgent: navigator.userAgent, results }, null, 2);
}

async function environment() {
  const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  record('environment', 'info', {
    standalone,
    crossOriginIsolated: self.crossOriginIsolated === true,
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    devicePixelRatio: devicePixelRatio,
    screen: `${screen.width}x${screen.height}`,
  });
}

async function headers() {
  const response = await fetch(location.pathname, { cache: 'no-store' });
  const list = {};
  response.headers.forEach((value, name) => { if (name !== 'set-cookie') list[name] = value; });
  const coop = list['cross-origin-opener-policy'] || null;
  record('response_headers', 'info', list);
  record('coop_coep', coop ? 'pass' : 'info', { coop, coep: list['cross-origin-embedder-policy'] || null });
}

async function wasm() {
  const response = await fetch('tiny.wasm', { cache: 'no-store' });
  const type = response.headers.get('content-type');
  let streaming = false;
  try { await WebAssembly.instantiateStreaming(fetch('tiny.wasm', { cache: 'no-store' })); streaming = true; } catch (e) { /* MIME */ }
  let fallback = false;
  try { await WebAssembly.instantiate(await response.arrayBuffer()); fallback = true; } catch (e) { /* none */ }
  record('wasm_mime', type === 'application/wasm' ? 'pass' : 'fail', { type, streaming, fallback });
  record('wasm_loadable', fallback ? 'pass' : 'fail', { streaming, fallback });
}

async function manifest() {
  const response = await fetch('manifest.webmanifest', { cache: 'no-store' });
  record('manifest', response.ok ? 'pass' : 'fail', { status: response.status, type: response.headers.get('content-type') });
}

async function serviceWorker() {
  if (!('serviceWorker' in navigator)) { record('service_worker', 'fail', 'not supported'); return; }
  try {
    await navigator.serviceWorker.register('sw.js');
    await navigator.serviceWorker.ready;
    const controlled = !!navigator.serviceWorker.controller;
    record('service_worker', 'pass', { registered: true, controllingThisLoad: controlled, online: navigator.onLine });
    if (!navigator.onLine) record('offline_load', controlled ? 'pass' : 'fail', 'page loaded while offline');
  } catch (error) {
    record('service_worker', 'fail', String(error));
  }
}

async function storage() {
  const estimate = navigator.storage?.estimate ? await navigator.storage.estimate() : null;
  const persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : null;
  record('storage', 'info', { persisted, quotaMB: estimate ? Math.round(estimate.quota / 1e6) : null });
}

function canvasLimits() {
  const out = {};
  for (const [w, h] of [[4096, 4096], [4097, 4097], [5000, 4000]]) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    let ok = false;
    try {
      const x = c.getContext('2d');
      x.fillStyle = '#123456'; x.fillRect(w - 2, h - 2, 1, 1);
      ok = x.getImageData(w - 2, h - 2, 1, 1).data[2] === 0x56;
    } catch (e) { ok = false; }
    out[`${w}x${h}`] = ok;
    c.width = c.height = 0;
  }
  record('canvas_limits', out['4096x4096'] ? 'pass' : 'fail', out);
}

function hashRoute() {
  if (location.hash === '#/route-test') {
    record('hash_route_reload', 'pass', 'reloaded on #/route-test');
    history.replaceState(null, '', location.pathname);
  }
}

function injectedScripts() {
  const own = new Set(['probe.js']);
  const foreign = [...document.scripts].map(s => s.src || '(inline)')
    .filter(src => src === '(inline)' ? false : !own.has(new URL(src).pathname.split('/').pop()));
  record('injected_scripts', foreign.length ? 'info' : 'pass', foreign);
}

function interruptedCycles() {
  const running = sessionStorage.getItem(RUNNING);
  if (running) {
    record('reload_during_cycles', 'fail', `page reloaded during cycle ${running}`);
    sessionStorage.removeItem(RUNNING);
  }
}

function watchdog() {
  let last = performance.now(), worst = 0, over = 0;
  const timer = setInterval(() => {
    const now = performance.now(), gap = now - last - 50;
    if (gap > worst) worst = gap;
    if (gap > 100) over += 1;
    last = now;
  }, 50);
  return () => { clearInterval(timer); return { worstBlockMs: Math.round(worst), blocksOver100ms: over }; };
}

async function cycles(files) {
  const canvas = $('work');
  let backgrounds = 0;
  const onVisibility = () => { if (document.visibilityState === 'hidden') backgrounds += 1; };
  document.addEventListener('visibilitychange', onVisibility);
  const stop = watchdog();
  const timings = [];
  const decoded = new Map();
  try {
    for (let i = 1; i <= 10; i += 1) {
      sessionStorage.setItem(RUNNING, String(i));
      const t0 = performance.now();
      const file = files[(i - 1) % files.length];
      const bitmap = await createImageBitmap(file);
      decoded.set(file, { width: bitmap.width, height: bitmap.height, megapixels: Math.round(bitmap.width * bitmap.height / 1e5) / 10, type: file.type || 'unknown' });
      const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      ctx.globalAlpha = 0.9; ctx.lineWidth = 3; ctx.strokeStyle = '#000';
      ctx.beginPath(); ctx.moveTo(canvas.width * 0.6, canvas.height * 0.2);
      ctx.lineTo(canvas.width * 0.9, canvas.height * 0.4); ctx.stroke(); ctx.globalAlpha = 1;
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error(`export returned no blob in cycle ${i}`);
      timings.push(Math.round(performance.now() - t0));
      record('cycles_progress', 'info', `${i}/10`);
    }
    sessionStorage.removeItem(RUNNING);
    const images = [...decoded.values()];
    const maxMegapixels = Math.max(...images.map(d => d.megapixels));
    record('ten_cycles', 'pass', { timingsMs: timings, images, maxMegapixels, backgrounds, ...stop() });
    if (maxMegapixels < 12) record('cycles_stress', 'info', 'no image of 12 MP or more: add a full-resolution camera photo');
    if (!backgrounds) record('cycles_background', 'info', 'app was not sent to the background during the cycles');
  } catch (error) {
    sessionStorage.removeItem(RUNNING);
    record('ten_cycles', 'fail', { error: String(error), completed: timings.length, images: [...decoded.values()], ...stop() });
  } finally {
    canvas.width = canvas.height = 0;
    document.removeEventListener('visibilitychange', onVisibility);
  }
}

$('reloadHash').onclick = () => { location.hash = '#/route-test'; location.reload(); };
$('persist').onclick = async () => {
  const granted = navigator.storage?.persist ? await navigator.storage.persist() : null;
  record('persist_request', granted ? 'pass' : 'info', { granted });
};
$('opencv').onclick = () => {
  record('opencv', 'info', 'loading…');
  const worker = new Worker('worker.js');
  worker.onmessage = event => { record('opencv', event.data.ok ? 'pass' : 'fail', event.data); worker.terminate(); };
  worker.onerror = event => { record('opencv', 'fail', String(event.message)); worker.terminate(); };
  worker.postMessage('start');
};
$('photo').onchange = event => { const files = [...event.target.files]; if (files.length) cycles(files); };
$('share').onclick = async () => {
  const text = $('json').value;
  try { if (navigator.share) { await navigator.share({ title: 'NextStroke Hosting-Test', text }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text); record('share', 'info', 'copied to clipboard'); } catch (e) { $('json').select(); }
};

render();
interruptedCycles();
hashRoute();
injectedScripts();
canvasLimits();
Promise.allSettled([environment(), headers(), wasm(), manifest(), serviceWorker(), storage()]);
