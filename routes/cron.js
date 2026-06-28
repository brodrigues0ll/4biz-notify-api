import { Router } from "express";
import connectDB from "../lib/mongodb.js";
import User from "../models/User.js";
import { syncUserTickets } from "../lib/sync.js";

const router = Router();

// Protegido pelo ENCRYPTION_KEY — só a Vercel consegue chamar
router.get("/auto-sync", async (req, res) => {
  const secret = process.env.ENCRYPTION_KEY;
  const authHeader = req.headers.authorization;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  const now = new Date();
  const results = { synced: 0, skipped: 0, errors: 0 };

  try {
    await connectDB();
    const users = await User.find({
      autoSyncEnabled: true,
      fourBizSessionCookie: { $exists: true, $ne: "" },
      fourBizAuthToken: { $exists: true, $ne: "" },
    });

    for (const user of users) {
      const lastSync = user.lastAutoSync || new Date(0);
      const intervalMs = (user.autoSyncIntervalMinutes || 5) * 60 * 1000;

      if (now - lastSync < intervalMs) {
        results.skipped++;
        continue;
      }

      try {
        await syncUserTickets(user._id.toString());
        await User.findByIdAndUpdate(user._id, { lastAutoSync: now });
        results.synced++;
      } catch (err) {
        console.error(`[Cron] Erro ao sincronizar ${user.email}:`, err.message);
        results.errors++;
      }
    }

    res.json({ ok: true, ts: now.toISOString(), results });
  } catch (err) {
    console.error("[Cron] Erro geral:", err.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
