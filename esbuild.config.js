// esbuild.config.js
import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const aliasPlugin = {
  name: 'alias',
  setup(build) {
    build.onResolve({ filter: /^@core\// }, args => ({
      path: path.resolve(__dirname, 'src/core', args.path.replace(/^@core\//, '') + '.ts')
    }));

    build.onResolve({ filter: /^@routes\// }, args => ({
      path: path.resolve(__dirname, 'src/api/routes', args.path.replace(/^@routes\//, '') + '.ts')
    }));

    build.onResolve({ filter: /^@api\// }, args => ({
      path: path.resolve(__dirname, 'src/api', args.path.replace(/^@api\//, '') + '.ts')
    }));
  },
};

esbuild.build({
  entryPoints: ['src/app.ts'],
  bundle: true,
  platform: 'node',
  target: ['node18'],
  format: 'esm',
  outdir: 'dist',
  sourcemap: true,
  plugins: [aliasPlugin],
  external: [
    'oci-common',
    'oci-objectstorage',
    'oci-secrets',
    '@azure/keyvault-secrets',
    '@azure/app-configuration',
  ],
}).catch(() => process.exit(1));
