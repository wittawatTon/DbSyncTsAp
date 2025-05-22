import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

// Extend Express Request interface to include user property
declare module 'express-serve-static-core' {
  interface Request {
    user?: string | JwtPayload;
  }
}

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.header('x-auth-token');
  if (!token) {
    res.status(401).send('Access denied');
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).send('Invalid token');
  }
};

export default authMiddleware;