import type { NextFunction, Request, Response } from 'express';
import { authService } from './authService.js';

declare global {
  namespace Express {
    interface Request {
      authUser?: { id: string; email: string; display_name: string; workspace_id: string; workspace_name: string };
    }
  }
}

function readAuthCookie(header: string | undefined) {
  return header
    ?.split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith('doutrinahud_auth='))
    ?.slice('doutrinahud_auth='.length);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = authService.getUserByToken(readAuthCookie(req.headers.cookie));
  if (!user) return res.status(401).json({ error: 'Faca login para acessar este recurso.' });
  req.authUser = user;
  return next();
}
