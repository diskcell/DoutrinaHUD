import { Router } from 'express';
import { authService } from '../auth/authService.js';

const router = Router();
const COOKIE_NAME = 'doutrinahud_auth';

function readCookie(header: string | undefined) {
  return header?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
}

function sendUser(res: any, user: any) {
  return res.json({ user: user && { id: user.id, email: user.email, displayName: user.display_name || user.displayName, workspaceId: user.workspace_id || user.workspaceId, workspaceName: user.workspace_name || user.workspaceName } });
}

router.post('/register', (req, res) => {
  const { email, displayName, password } = req.body || {};
  if (!/^\S+@\S+\.\S+$/.test(String(email || '')) || String(displayName || '').trim().length < 2 || String(password || '').length < 8) return res.status(400).json({ error: 'Informe nome, email valido e senha com ao menos 8 caracteres.' });
  try {
    const user = authService.register(email, displayName, password);
    const token = authService.createSession(user.id);
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
    return sendUser(res, user);
  } catch (error: any) {
    return res.status(error?.message?.includes('UNIQUE') ? 409 : 500).json({ error: 'Nao foi possivel criar a conta.' });
  }
});

router.post('/login', (req, res) => {
  const user = authService.login(String(req.body?.email || ''), String(req.body?.password || ''));
  if (!user) return res.status(401).json({ error: 'Email ou senha invalidos.' });
  const token = authService.createSession(user.id);
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  return sendUser(res, user);
});

router.get('/me', (req, res) => sendUser(res, authService.getUserByToken(readCookie(req.headers.cookie))));
router.post('/logout', (req, res) => { authService.logout(readCookie(req.headers.cookie)); res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`); return res.status(204).send(); });

export default router;
