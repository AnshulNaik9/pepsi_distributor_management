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

try {
  console.log('Importing schema...');
  require('./shared/schema.ts');
  console.log('Importing routes...');
  require('./shared/routes.ts');
  console.log('Importing storage...');
  require('./server/storage.ts');
  console.log('Importing server routes...');
  require('./server/routes.ts');
  console.log('All imports successful');
} catch (e) {
  console.error('Import failed:', e);
  process.exit(1);
}
