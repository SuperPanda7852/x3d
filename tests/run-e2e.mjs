import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { resolve } from 'node:path';

// Node launches both processes directly so this works in Windows shells too.
// --strictPort prevents accidentally running against someone else's dev server.
const port = 4175;
const origin = process.env.X3D_BASE_URL || `http://127.0.0.1:${port}`;
let server;
let serverExited = false;
let serverOutput = '';
let smoke;

function stopChildren() {
  smoke?.kill();
  server?.kill();
}
process.once('SIGINT', () => { stopChildren(); process.exitCode = 130; });
process.once('SIGTERM', () => { stopChildren(); process.exitCode = 143; });

try {
  if (!process.env.X3D_BASE_URL) {
    server = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
    server.on('exit', () => { serverExited = true; });
    server.on('error', error => { serverExited = true; serverOutput += error.message; });
    server.stdout.on('data', chunk => { serverOutput += chunk; });
    server.stderr.on('data', chunk => { serverOutput += chunk; });
    let ready = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      if (serverExited) throw new Error(`Preview server could not start. Run npm run build first.\n${serverOutput}`);
      try { if ((await fetch(origin, { signal: AbortSignal.timeout(800) })).ok) { ready = true; break; } } catch {}
      await delay(250);
    }
    if (!ready) throw new Error(`Preview did not become ready.\n${serverOutput}`);
    console.log(`Testing production build at ${origin}`);
  }

  smoke = spawn(process.execPath, [resolve('tests/smoke.mjs')], { stdio: 'inherit', env: { ...process.env, X3D_BASE_URL: origin } });
  process.exitCode = await new Promise((resolveCode, reject) => {
    smoke.once('error', reject);
    smoke.once('exit', code => resolveCode(code ?? 1));
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  stopChildren();
}
