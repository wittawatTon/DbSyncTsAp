import 'module-alias/register';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import helmet from 'helmet';
import morgan from 'morgan';
import pino, { Logger } from 'pino';
import fs from 'fs';
import path from 'path';
import { multistream } from 'pino-multi-stream';

// Logger Setup
const logLevel: string = process.env.LOG_LEVEL || 'info';
const logFilePath: string = path.join(__dirname, 'logs', 'app.log');

if (!fs.existsSync(path.dirname(logFilePath))) {
  fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
}

const fileStream = fs.createWriteStream(logFilePath, { flags: 'a' });

const consoleStream = {
  stream: pino.transport({
    target: 'pino-pretty',
    options: {
      translateTime: 'yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
    },
  }),
};

const logger: Logger = pino(
  { level: logLevel, timestamp: pino.stdTimeFunctions.isoTime },
  multistream([
    { stream: consoleStream.stream },
    { stream: fileStream },
  ])
);

const loggerHttp = pinoHttp({ logger });

const app: Application = express();

// Middleware
// 1. Security Middleware (CORS, Helmet) ควรวางไว้ก่อนเพื่อรักษาความปลอดภัย
app.use(cors());               // ตั้งค่า CORS ให้อนุญาตการเข้าถึง API จากแหล่งที่มาต่างๆ
app.use(helmet());             // ปรับ security headers ให้เหมาะสม

// 2. Logging Middleware (Morgan, Pino) วางหลังจาก security middleware
app.use(morgan('combined'));  // ใช้ morgan เพื่อ log ข้อมูลการร้องขอ HTTP
app.use(loggerHttp);           // ใช้ Pino สำหรับการ logging ผ่าน HTTP request lifecycle

// 3. Request Body Parsing (Express.json)
app.use(express.json());       // แปลง JSON ที่มาจาก request body เป็น JavaScript object

// 4. Cache Control Middleware
// Set no-cache headers globally for all responses
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// 5. Routing (App Routes) หรือการใช้งาน routes
// API Input/Output Logger
app.use((req: Request, res: Response, next: NextFunction) => {
  // @ts-ignore
  req.log?.info({ body: req.body }, `API Input: ${req.method} ${req.originalUrl}`);

  const oldSend = res.send.bind(res);
  res.send = function (body?: any): Response {
    // @ts-ignore
    req.log?.info({ body }, `API Output: ${req.method} ${req.originalUrl}`);
    return oldSend(body);
  };

  next();
});

// Routes
import authRoutes from '@routes/authRoutes';
import databaseRoutes from '@routes/databaseRoutes';
import syncTaskRoutes from '@api/routes/syncTaskRoutes';
import dashboardRoutes from '@api/routes/dashboardRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/db', databaseRoutes);
app.use('/api/sync-tasks', syncTaskRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(err, 'Unexpected Error');
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});


// Serve static files from the 'dist' folder (the build output)
app.use(express.static(
  path.join(__dirname, '../../replicator-easy-setup/dist'),
  {
    maxAge: 0, // Disable caching completely
    etag: false, // Disable ETag
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store');
    }
  }
));

// Catch-all route to serve the index.html for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../replicator-easy-setup/dist', 'index.html'), {
    headers: {
      'Cache-Control': 'no-store'
    }
  });
});
export default app;