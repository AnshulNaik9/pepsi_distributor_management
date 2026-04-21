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

require('./server/index.ts');
console.log('Server starting wrapper...');
