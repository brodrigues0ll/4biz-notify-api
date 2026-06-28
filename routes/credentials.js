import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import connectDB from '../lib/mongodb.js';
import User from '../models/User.js';
import { encrypt, decrypt } from '../lib/crypto.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const user = await User.findById(req.user.id);
    const hasCookies = !!(user?.fourBizSessionCookie && user?.fourBizAuthToken);
    const sessionValid = hasCookies && user.fourBizSessionExpiry
      ? new Date() < new Date(user.fourBizSessionExpiry)
      : hasCookies;
    res.json({ hasCookies, sessionValid });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar credenciais' });
  }
});

router.post('/cookies', requireAuth, async (req, res) => {
  const { sessionCookie, authToken } = req.body || {};
  if (!sessionCookie || !authToken)
    return res.status(400).json({ error: 'sessionCookie e authToken são obrigatórios' });
  if (typeof sessionCookie !== 'string' || typeof authToken !== 'string')
    return res.status(400).json({ error: 'Formato inválido' });
  if (sessionCookie.length > 4096 || authToken.length > 4096)
    return res.status(400).json({ error: 'Valor muito longo' });

  try {
    await connectDB();
    const encSession = await encrypt(sessionCookie);
    const encToken = await encrypt(authToken);
    await User.findByIdAndUpdate(req.user.id, {
      fourBizSessionCookie: encSession,
      fourBizAuthToken: encToken,
      fourBizSessionExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erro ao salvar credenciais' });
  }
});

router.delete('/', requireAuth, async (req, res) => {
  try {
    await connectDB();
    await User.findByIdAndUpdate(req.user.id, {
      fourBizSessionCookie: '',
      fourBizAuthToken: '',
      fourBizSessionExpiry: null,
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erro ao remover credenciais' });
  }
});

export default router;
