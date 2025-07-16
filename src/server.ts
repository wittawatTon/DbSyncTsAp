import dotenv from 'dotenv';
dotenv.config();

import path from 'path';

import { connectDatabase } from '@core/database.js';
import app from './app.js';
import { fileURLToPath } from 'url';
import { PipelineLastSuccessUpdater } from '@kafka/monitor/PipelineLastSuccessUpdater.js';

const __filename = fileURLToPath(import.meta.url);



const port: number = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  try {
    await connectDatabase();

      const updater = new PipelineLastSuccessUpdater(process.env.PROMETHEUS_URL || 'http://192.168.1.51:9090');

    // เรียก update ครั้งแรก
    await updater.updateAll();

    setInterval(() => {
      updater.updateAll().catch(err => {
        console.error('Error during periodic updateAll:', err);
      });
    }, 5 * 60 * 1000);

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }
}

startServer();
