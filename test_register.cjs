const { register } = require('esbuild-register/dist/node');
register({
  target: 'node20',
  tsconfigRaw: {
    compilerOptions: {
      baseUrl: '.',
      paths: {
        '@shared/*': ['./shared/*']
      }
    }
  }
});

const { registerRoutes } = require('./server/routes.ts');
const { createServer } = require('http');
const express = require('express');

(async () => {
  const app = express();
  const server = createServer(app);
  try {
    console.log('Testing registerRoutes...');
    await registerRoutes(server, app);
    console.log('registerRoutes success!');
    process.exit(0);
  } catch (e) {
    console.error('registerRoutes FAILED:', e);
    process.exit(1);
  }
})();
