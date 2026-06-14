#!/usr/bin/env node
/**
 * WDLC browser installer - temporary /installation endpoint.
 *
 *   node deploy/install-server.js            # listens on :3000
 *   node deploy/install-server.js --port 8080
 *
 * Serves a one-page setup form at /installation, protected by a one-time key
 * printed to the terminal. On submit it writes the env files, installs
 * dependencies, migrates + seeds the database, builds all four apps, and
 * smoke-tests the backend - streaming progress to the browser.
 *
 * After a SUCCESSFUL install it:
 *   - writes deploy/.installed (the installer refuses to ever run again)
 *   - optionally starts the apps with pm2
 *   - DELETES itself plus deploy/setup.sh and deploy/generate-env.sh
 *   - exits, freeing the port for the real web app
 *
 * Zero npm dependencies - plain Node http/crypto/fs/child_process.
 */
'use strict';

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TPL = path.join(__dirname, 'env');
const MARKER = path.join(__dirname, '.installed');
const SELF_DELETE = [__filename, path.join(__dirname, 'setup.sh'), path.join(__dirname, 'generate-env.sh')];

const argPort = process.argv.indexOf('--port');
const PORT = argPort > -1 ? parseInt(process.argv[argPort + 1], 10) : parseInt(process.env.PORT || '3000', 10);
const KEY = crypto.randomBytes(16).toString('hex');

if (fs.existsSync(MARKER)) {
  console.error('\nThis server is already installed (deploy/.installed exists).');
  console.error('Delete that file only if you intentionally want to reinstall.\n');
  process.exit(1);
}

// ── helpers ──────────────────────────────────────────────────────────────────
const hex32 = () => crypto.randomBytes(32).toString('hex');

function keyOk(url) {
  const got = url.searchParams.get('key') || '';
  const a = crypto.createHash('sha256').update(got).digest();
  const b = crypto.createHash('sha256').update(KEY).digest();
  return crypto.timingSafeEqual(a, b);
}

function origin(u) {
  try { const x = new URL(u); return x.origin; } catch { return u; }
}

function renderTemplate(file, vars) {
  let text = fs.readFileSync(path.join(TPL, file), 'utf8');
  for (const [k, v] of Object.entries(vars)) text = text.split(`@@${k}@@`).join(v);
  return text;
}

function writeEnvFiles(v) {
  const out = [
    ['backend.env.template', path.join(ROOT, 'backend/.env')],
    ['web.env.template', path.join(ROOT, 'apps/web/.env.local')],
    ['portal.env.template', path.join(ROOT, 'apps/portal/.env.local')],
    ['admin.env.template', path.join(ROOT, 'apps/admin/.env.local')],
  ];
  for (const [tpl, dest] of out) {
    fs.writeFileSync(dest, renderTemplate(tpl, v), { mode: 0o600 });
  }
}

function run(cmd, cwd, res, label) {
  return new Promise((resolve, reject) => {
    res.write(`\n$ ${label || cmd}\n`);
    const child = spawn('bash', ['-c', cmd], { cwd: cwd || ROOT, env: { ...process.env } });
    child.stdout.on('data', (d) => res.write(d));
    child.stderr.on('data', (d) => res.write(d));
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${label || cmd} exited with code ${code}`))));
  });
}

function httpOk(url, timeoutMs) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (r) => {
      r.resume();
      resolve(r.statusCode === 200);
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });
}

async function smokeTest(res) {
  const health = 'http://127.0.0.1:4000/api/health/ready';
  if (await httpOk(health, 2000)) { res.write('\nBackend already running and healthy.\n'); return; }
  res.write('\nTest-starting the backend to verify the database connection…\n');
  // start:prod runs `node dist/main.js`; tolerate either compiled layout.
  const candidates = ['dist/main.js', 'dist/src/main.js'];
  const entry = candidates.find((c) => fs.existsSync(path.join(ROOT, 'backend', c)));
  if (!entry) {
    throw new Error('Backend build produced no main.js under dist/ - the build step failed; scroll up for the compiler error.');
  }
  const child = spawn('node', [entry], {
    cwd: path.join(ROOT, 'backend'),
    env: { ...process.env, NODE_ENV: 'production' },
  });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  let ready = false;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await httpOk(health, 2000)) { ready = true; break; }
    if (child.exitCode !== null) break;
  }
  child.kill();
  if (!ready) {
    res.write('\nBackend failed to start. Its output was:\n' + log.slice(-3000) + '\n');
    throw new Error('Backend smoke test failed - see the output above (often the database password/host, or a missing build).');
  }
  res.write('Backend boots and reaches the database. ✔\n');
}

function localIPs() {
  const out = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces || []) if (i.family === 'IPv4' && !i.internal) out.push(i.address);
  }
  return out;
}

// ── form HTML ────────────────────────────────────────────────────────────────
function pageHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>WDLC installation</title>
<style>
 body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:2rem}
 .card{max-width:680px;margin:0 auto;background:#1e293b;border-radius:12px;padding:2rem}
 h1{margin-top:0;font-size:1.4rem} h2{font-size:1rem;color:#7dd3fc;margin:1.6rem 0 .4rem}
 label{display:block;margin:.7rem 0 .2rem;font-size:.9rem;color:#94a3b8}
 input,select{width:100%;box-sizing:border-box;padding:.55rem;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#e2e8f0}
 small{color:#64748b} button{margin-top:1.4rem;width:100%;padding:.8rem;border:0;border-radius:8px;background:#0ea5e9;color:#fff;font-size:1rem;cursor:pointer}
 button:disabled{background:#334155} pre{background:#020617;border-radius:8px;padding:1rem;white-space:pre-wrap;max-height:50vh;overflow:auto;font-size:.8rem;display:none}
 .row{display:flex;gap:.8rem}.row>div{flex:1}
 .ok{color:#4ade80}.err{color:#f87171}
</style></head><body><div class="card">
<h1>WDLC installation</h1>
<p>Fill this in once. When it finishes, this page <b>deletes itself</b> and your real website takes over this address.</p>
<form id="f">
 <h2>1 - Website addresses</h2>
 <label>Main domain</label><input name="base" id="base" value="worlddirectlink.com">
 <label>Public website</label><input name="web" id="web">
 <label>Agent portal</label><input name="portal" id="portal">
 <label>Admin panel</label><input name="admin" id="admin">
 <small>Suggestions update as you type the main domain - edit any of them.</small>

 <h2>2 - Database (PostgreSQL)</h2>
 <div class="row"><div><label>Host</label><input name="dbhost" value="localhost"></div>
 <div><label>Port</label><input name="dbport" value="5432"></div></div>
 <div class="row"><div><label>Database name</label><input name="dbname" value="wdlc"></div>
 <div><label>Username</label><input name="dbuser" value="postgres"></div></div>
 <label>Password</label><input name="dbpass" type="password">

 <h2>3 - Your admin account</h2>
 <label>Email</label><input name="adminemail" value="info@worlddirectlink.com">
 <label>Password (leave empty = generate a strong one)</label><input name="adminpass" type="password">

 <label style="margin-top:1rem"><input type="checkbox" name="pm2" checked style="width:auto"> Start the apps with pm2 when done (if pm2 is installed)</label>
 <button id="go">Install</button>
</form>
<pre id="log"></pre>
</div>
<script>
const $=id=>document.getElementById(id);
function sync(){const b=$('base').value.trim();$('web').value='https://'+b;$('portal').value='https://portal.'+b;$('admin').value='https://secure.'+b;}
$('base').addEventListener('input',sync);sync();
$('f').addEventListener('submit',async e=>{
 e.preventDefault();$('go').disabled=true;const log=$('log');log.style.display='block';
 const body=new URLSearchParams(new FormData($('f')));
 try{
  const r=await fetch(location.pathname+'/run'+location.search,{method:'POST',body});
  const rd=r.body.getReader();const dec=new TextDecoder();
  for(;;){const{done,value}=await rd.read();if(done)break;log.textContent+=dec.decode(value);log.scrollTop=log.scrollHeight;}
 }catch(err){log.textContent+='\\n[connection ended] '+err+'\\n';}
});
</script></body></html>`;
}

// ── install procedure ────────────────────────────────────────────────────────
let running = false;

async function install(form, res) {
  const get = (k, d = '') => (form.get(k) || d).toString().trim();
  const web = get('web'), portal = get('portal'), admin = get('admin');
  if (!web || !portal || !admin) throw new Error('All three website addresses are required.');
  if (!get('dbname') || !get('dbuser')) throw new Error('Database name and username are required.');

  const adminPass = get('adminpass') || hex32().slice(0, 20) + '!Aa1';
  const generatedPw = !get('adminpass');
  const dbUrl = `postgresql://${encodeURIComponent(get('dbuser'))}:${encodeURIComponent(get('dbpass'))}` +
    `@${get('dbhost', 'localhost')}:${get('dbport', '5432')}/${get('dbname')}?schema=public`;

  const vars = {
    DATABASE_URL: dbUrl,
    ADMIN_JWT_SECRET: hex32(), AGENT_JWT_SECRET: hex32(), JWT_SECRET: hex32(),
    HUMAN_VERIFICATION_SECRET: hex32(), REVALIDATE_SECRET: hex32(),
    CORS_ORIGIN: [origin(web), origin(portal), origin(admin)].join(','),
    INTERNAL_API_URL: 'http://127.0.0.1:4000/api',
    PUBLIC_API_URL: '/api',
    PUBLIC_WEB_URL: web, PUBLIC_PORTAL_URL: portal, PUBLIC_ADMIN_URL: admin,
    SEED_ADMIN_EMAIL: get('adminemail', 'info@worlddirectlink.com'),
    SEED_ADMIN_PASSWORD: adminPass,
  };

  res.write('Step 1/6 - Writing configuration files (security keys generated)…\n');
  writeEnvFiles(vars);
  res.write('  done ✔\n');

  res.write('\nStep 2/6 - Installing dependencies (slowest step, please wait)…\n');
  await run('npm install', ROOT, res, 'npm install (apps)');
  await run('npm install --prefix backend', ROOT, res, 'npm install (backend)');

  res.write('\nStep 3/6 - Preparing the database…\n');
  await run('npx prisma generate && npx prisma migrate deploy', path.join(ROOT, 'backend'), res, 'database migrations');
  await run('npm run db:seed', path.join(ROOT, 'backend'), res, 'create admin account + starter content');

  res.write('\nStep 4/6 - Building the four apps for production…\n');
  await run('npm run --prefix backend build', ROOT, res, 'build backend');
  await run('npm run --workspace=apps/web build', ROOT, res, 'build public website');
  await run('npm run --workspace=apps/portal build', ROOT, res, 'build agent portal');
  await run('npm run --workspace=apps/admin build', ROOT, res, 'build admin panel');

  res.write('\nStep 5/6 - Verifying everything is connected…\n');
  await smokeTest(res);

  res.write('\nStep 6/6 - Cleaning up: removing the installer…\n');
  fs.writeFileSync(MARKER, new Date().toISOString() + '\n');

  res.write('\n══════════════════════════════════════════\n');
  res.write('  INSTALLATION COMPLETE ✔\n');
  res.write('══════════════════════════════════════════\n');
  res.write(`  Admin login:    ${vars.SEED_ADMIN_EMAIL}\n`);
  if (generatedPw) {
    res.write(`  Admin password: ${adminPass}\n`);
    res.write('  ↑ SAVE THIS NOW - it is shown only this once.\n');
  }
  res.write(`  Admin panel:    ${admin}\n`);

  const wantPm2 = form.has('pm2');
  let havePm2 = false;
  if (wantPm2) {
    havePm2 = await new Promise((r) => {
      const c = spawn('bash', ['-c', 'command -v pm2']);
      c.on('close', (code) => r(code === 0));
    });
    if (!havePm2) res.write('\n  (pm2 not found - start the apps manually, see deploy/DEPLOYMENT.md)\n');
  }
  if (havePm2) {
    res.write('\n  Starting your apps with pm2 in 5 seconds…\n');
    res.write('  This installer is shutting down. REFRESH THIS PAGE in ~20 seconds\n');
    res.write('  and your real website will be here instead.\n');
  } else {
    res.write('\n  This installer has removed itself. Start the apps with pm2\n');
    res.write('  (commands in deploy/DEPLOYMENT.md) and the site goes live.\n');
  }
  res.end();

  // Out of the response: free the port, optionally start pm2, self-delete, exit.
  server.close();
  setTimeout(() => {
    try {
      if (havePm2) {
        const cmds = [
          `pm2 start "npm run start:prod" --name wdlc-backend --cwd ${ROOT}/backend`,
          `pm2 start "npm run start" --name wdlc-web --cwd ${ROOT}/apps/web`,
          `pm2 start "npm run start" --name wdlc-portal --cwd ${ROOT}/apps/portal`,
          `pm2 start "npm run start" --name wdlc-admin --cwd ${ROOT}/apps/admin`,
          'pm2 save',
        ].join(' && ');
        spawn('bash', ['-c', cmds], { detached: true, stdio: 'ignore' }).unref();
      }
    } finally {
      for (const f of SELF_DELETE) { try { fs.unlinkSync(f); } catch { /* already gone */ } }
      console.log('\nInstaller finished and removed itself. Goodbye.');
      setTimeout(() => process.exit(0), 1000);
    }
  }, 5000);
}

// ── server ───────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (!url.pathname.startsWith('/installation')) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Installer running. Open /installation?key=<key printed in the server terminal>\n');
  }
  if (!keyOk(url)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Wrong or missing key. The key was printed in the terminal where the installer started.\n');
  }
  if (req.method === 'GET' && url.pathname === '/installation') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(pageHtml());
  }
  if (req.method === 'POST' && url.pathname === '/installation/run') {
    if (running) { res.writeHead(409); return res.end('An installation is already running.\n'); }
    running = true;
    let body = '';
    req.on('data', (d) => { body += d; if (body.length > 1e5) req.destroy(); });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' });
      install(new URLSearchParams(body), res).catch((err) => {
        res.write(`\n✘ FAILED: ${err.message}\n`);
        res.write('Fix the problem and submit the form again - progress so far is kept.\n');
        res.end();
        running = false;
      });
    });
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n  WDLC browser installer is running.\n');
  console.log('  Open ONE of these in your browser:');
  console.log(`    https://<your-web-domain>/installation?key=${KEY}   (if nginx already points here)`);
  for (const ip of localIPs()) console.log(`    http://${ip}:${PORT}/installation?key=${KEY}`);
  console.log('\n  The ?key= part is required - it stops strangers from finding this page.');
  console.log('  After a successful install this program deletes itself.\n');
});
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is busy (is the web app already running? stop it first,`);
    console.error(`or run with another port: node deploy/install-server.js --port 8080)\n`);
    process.exit(1);
  }
  throw e;
});
