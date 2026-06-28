import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import connectDB from '../lib/mongodb.js';
import User from '../models/User.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const user = await User.findById(req.user.id).select('autoSyncEnabled autoSyncIntervalMinutes');
    res.json({
      autoSyncEnabled: user?.autoSyncEnabled || false,
      autoSyncIntervalMinutes: user?.autoSyncIntervalMinutes || 5,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const { autoSyncEnabled, autoSyncIntervalMinutes } = req.body;
    await User.findByIdAndUpdate(req.user.id, {
      autoSyncEnabled: Boolean(autoSyncEnabled),
      autoSyncIntervalMinutes: Math.max(1, parseInt(autoSyncIntervalMinutes) || 5),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
