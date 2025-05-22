
import 'module-alias/register';
import 'tsconfig-paths/register';
import dotenv from 'dotenv';
import moduleAlias from 'module-alias';
import path from 'path';
// Load environment variables before importing other modules
dotenv.config();

import { connectDatabase } from '@core/database';
import app from './app';
moduleAlias.addAliases({
  '@api': path.join(__dirname, 'api'),
  '@app': path.join(__dirname, 'app'),
  '@controllers': path.join(__dirname, 'api/controllers'),
  '@routes': path.join(__dirname, 'api/routes'),
  '@middleware': path.join(__dirname, 'api/middleware'),
  '@models': path.join(__dirname, 'api/models'),
  '@apiServices': path.join(__dirname, 'api/services'),
  '@core': path.join(__dirname, 'core'),
  '@coreServices': path.join(__dirname, 'core/services'),
  '@kafka': path.join(__dirname, 'kafka'),
  '@config': path.join(__dirname, 'config'),
  '@utils': path.join(__dirname, 'core/utils'),
});
const port: number = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  try {
    await connectDatabase();
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Server is running on port ${port}`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }
}

startServer();
