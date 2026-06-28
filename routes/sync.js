import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import connectDB from '../lib/mongodb.js';
import User from '../models/User.js';
import { syncUserTickets } from '../lib/sync.js';

const router = Router();

router.get('/stream', requireAuth, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    await connectDB();
    const stats = await syncUserTickets(req.user.id, (progress) => {
      send({ type: 'progress', ...progress });
    });
    send({ type: 'complete', stats });
    await User.findByIdAndUpdate(req.user.id, { lastAutoSync: new Date() });
  } catch (err) {
    send({ type: 'error', message: 'Erro na sincronização. Verifique as credenciais.' });
  } finally {
    res.end();
  }
});

router.get('/status', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const user = await User.findById(req.user.id).select('lastAutoSync autoSyncEnabled autoSyncIntervalMinutes');
    res.json({
      lastAutoSync: user?.lastAutoSync || null,
      autoSyncEnabled: user?.autoSyncEnabled || false,
      autoSyncIntervalMinutes: user?.autoSyncIntervalMinutes || 5,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
