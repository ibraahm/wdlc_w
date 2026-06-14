// PM2 process definitions for the WDLC stack.
// Deterministic "fresh restart" from the repo root:
//
//   pm2 delete all 2>/dev/null; pm2 start ecosystem.config.js && pm2 save
//
// Paths are resolved relative to this file, so it works regardless of where the
// repo is checked out (e.g. /var/www/wdlc). Each app reads its own env file:
//   backend/.env, apps/<app>/.env.local
const path = require('path');
const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'wdlc-api',
      cwd: path.join(root, 'backend'),
      script: 'dist/main.js',
      env: { NODE_ENV: 'production', PORT: '4000' },
      max_restarts: 10,
      autorestart: true,
    },
    {
      name: 'wdlc-web',
      cwd: path.join(root, 'apps/web'),
      script: 'npm',
      args: 'run start',
      env: { NODE_ENV: 'production' },
      autorestart: true,
    },
    {
      name: 'wdlc-portal',
      cwd: path.join(root, 'apps/portal'),
      script: 'npm',
      args: 'run start',
      env: { NODE_ENV: 'production' },
      autorestart: true,
    },
    {
      name: 'wdlc-admin',
      cwd: path.join(root, 'apps/admin'),
      script: 'npm',
      args: 'run start',
      env: { NODE_ENV: 'production' },
      autorestart: true,
    },
  ],
};
