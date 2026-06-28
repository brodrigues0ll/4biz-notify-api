import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import connectDB from '../lib/mongodb.js';
import Ticket from '../models/Ticket.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const tickets = await Ticket.find({
      userId: req.user.id,
      situacao: { $nin: ['Cancelada', 'Resolvida', 'Fechada'] },
    }).sort({ updatedAt: -1 });
    res.json({ tickets, total: tickets.length });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar chamados' });
  }
});

export default router;
