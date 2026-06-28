import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import connectDB from '../lib/mongodb.js';
import User from '../models/User.js';
import { Expo } from 'expo-server-sdk';

const router = Router();

router.post('/subscribe-expo', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const { expoPushToken } = req.body;
    if (!expoPushToken || !Expo.isExpoPushToken(expoPushToken))
      return res.status(400).json({ error: 'Token Expo inválido' });

    await User.findByIdAndUpdate(req.user.id, { expoPushToken });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/notify-test', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const user = await User.findById(req.user.id);
    if (!user?.expoPushToken)
      return res.status(400).json({ error: 'Nenhum token registrado. Ative as notificações primeiro.' });

    const expo = new Expo();
    const result = await expo.sendPushNotificationsAsync([{
      to: user.expoPushToken,
      sound: 'default',
      title: '4Biz Notify — Teste',
      body: 'Notificações funcionando corretamente!',
      data: { type: 'test' },
    }]);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/vapid', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

export default router;
