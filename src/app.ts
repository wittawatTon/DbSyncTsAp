//import 'module-alias/register';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as pinoHttpModule from 'pino-http';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as pinoModule from 'pino';

const pino = (pinoModule as any).default ?? pinoModule;

const pinoHttp = (pinoHttpModule as any).default ?? pinoHttpModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Logger setup
const logLevel: string = process.env.LOG_LEVEL || 'info';
const fileStream = pino.destination('logs/app.log');

// Use top-level await to set up the async transport
const setupLogger = async () => {
  const consoleStream = await pino.transport({
    target: 'pino-pretty',
    options: {
      translateTime: 'yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
      colorize: true,
    },
  });

  const streams = [
    { stream: fileStream },
    { stream: consoleStream },
  ];

  return pino(
    { level: logLevel, timestamp: pino.stdTimeFunctions.isoTime },
    pino.multistream(streams)
  );
};

const app = express();

const bootstrap = async () => {
  const logger = await setupLogger();
  const loggerHttp = pinoHttp({ logger });

  // Middleware
  app.use(cors());
  app.use(helmet());
  app.use(morgan('combined'));
  app.use(loggerHttp);
  app.use(express.json());

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  // API Input/Output Logger
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.log?.info({ body: req.body }, `API Input: ${req.method} ${req.originalUrl}`);

    const oldSend = res.send.bind(res);
    res.send = function (body?: any): Response {
      req.log?.info({ body }, `API Output: ${req.method} ${req.originalUrl}`);
      return oldSend(body);
    };

    next();
  });

  // Routes
  const authRoutes = (await import('@routes/authRoutes.js')).default;
  const databaseRoutes = (await import('@routes/databaseRoutes.js')).default;
  const syncTaskRoutes = (await import('@api/routes/syncTaskRoutes.js')).default;
  const dashboardRoutes = (await import('@api/routes/dashboardRoutes.js')).default;
  const pipelineRoutes = (await import('@api/routes/pipelineRoutes.js')).default;

  app.use('/api/auth', authRoutes);
  app.use('/api/db', databaseRoutes);
  app.use('/api/sync-tasks', syncTaskRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/pipelines', pipelineRoutes);

  // Error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error(err, 'Unexpected Error');
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  // Serve frontend
  app.use(express.static(
    path.join(__dirname, '../../replicator-easy-setup/dist'),
    {
      maxAge: 0,
      etag: false,
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store');
      }
    }
  ));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../replicator-easy-setup/dist', 'index.html'), {
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  });
};

await bootstrap();

export default app;
