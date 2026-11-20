// take-screenshots.mjs — renders the four entry screenshots with
// headless Chromium over CDP: serves app/ with the kit's serve.ts,
// loads each ?shot= scene from shots.json at its exact pixel size,
// waits for window.__shotReady, and saves a JPEG into screenshots/.
// If a shot exceeds the 256 KiB cap it is re-captured at lower quality.
//
// Run:  node tools/take-screenshots.mjs
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const CHROME = join(homedir(), '.cache/ms-playwright/chromium-1254/chrome-linux64/chrome');
const APP_URL = 'http://127.0.0.1:8080';
const DEBUG_PORT = 9223;
const MAX_BYTES = 262144;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch { /* not up yet */ }
    await sleep(500);
  }
  throw new Error(`timed out waiting for ${url}`);
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
        console.log('  [page]', msg.params.type, text.slice(0, 300));
      } else if (msg.method === 'Runtime.exceptionThrown') {
        console.log('  [page exception]', JSON.stringify(msg.params.exceptionDetails).slice(0, 400));
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function main() {
  const shots = JSON.parse(readFileSync(join(repo, 'shots.json'), 'utf8'));
  const server = spawn('node', ['serve.ts'], { cwd: repo, stdio: 'ignore' });
  const browser = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    `--remote-debugging-port=${DEBUG_PORT}`, '--window-size=1280,800', 'about:blank',
  ], { stdio: 'ignore' });
  try {
    await waitFor(`${APP_URL}/`);
    await waitFor(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
    const page = targets.find((t) => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    const cdp = new Cdp(ws);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    for (const shot of shots) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: shot.w, height: shot.h, deviceScaleFactor: 1, mobile: false,
      });
      await cdp.send('Page.navigate', { url: `${APP_URL}/${shot.query}` });
      let ready = false;
      for (let i = 0; i < 60 && !ready; i++) {
        const res = await cdp.send('Runtime.evaluate', {
          expression: 'window.__shotReady === true', returnByValue: true,
        });
        ready = res.result && res.result.value === true;
        if (!ready) await sleep(500);
      }
      if (!ready) throw new Error(`${shot.name}: scene never became ready`);
      await sleep(250);
      let quality = 88;
      let data = null;
      while (quality >= 55) {
        const shotRes = await cdp.send('Page.captureScreenshot', {
          format: 'jpeg', quality, fromSurface: true,
          clip: { x: 0, y: 0, width: shot.w, height: shot.h, scale: 1 },
          captureBeyondViewport: true,
        });
        data = Buffer.from(shotRes.data, 'base64');
        if (data.length <= MAX_BYTES) break;
        quality -= 11;
      }
      writeFileSync(join(repo, 'screenshots', shot.name), data);
      console.log(`${shot.name}: ${shot.w}x${shot.h}, ${data.length} bytes (jpeg q${quality})`);
    }
    ws.close();
  } finally {
    browser.kill('SIGKILL');
    server.kill('SIGKILL');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
