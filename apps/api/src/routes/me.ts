import { Router } from 'express';

export function meRouter(): Router {
  const r = Router();
  r.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  r.get('/me', (req, res) => {
    const u = req.user;
    res.json({ user: u ? { id: u.id, username: u.username, role: u.role } : null });
  });
  return r;
}
