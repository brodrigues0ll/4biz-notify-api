import cron from 'node-cron';
import connectDB from './mongodb.js';
import User from '../models/User.js';
import { syncUserTickets } from './sync.js';

let initialized = false;

export function initAutoSyncCron() {
  if (initialized) return;
  initialized = true;
  console.log('[Cron] Auto-sync iniciado — verificação a cada minuto');

  cron.schedule('* * * * *', async () => {
    const now = new Date();
    try {
      await connectDB();
      const users = await User.find({
        autoSyncEnabled: true,
        fourBizSessionCookie: { $exists: true, $ne: '' },
        fourBizAuthToken: { $exists: true, $ne: '' },
      });

      for (const user of users) {
        const lastSync = user.lastAutoSync || new Date(0);
        const intervalMs = (user.autoSyncIntervalMinutes || 5) * 60 * 1000;
        if (now - lastSync < intervalMs) continue;

        try {
          await syncUserTickets(user._id.toString());
          await User.findByIdAndUpdate(user._id, { lastAutoSync: now });
          console.log(`[Cron] ✅ ${user.email} sincronizado`);
        } catch (err) {
          console.error(`[Cron] ❌ ${user.email}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[Cron] Erro geral:', err.message);
    }
  });
}
