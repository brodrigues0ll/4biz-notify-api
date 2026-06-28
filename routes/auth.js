import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '../lib/mongodb.js';
import User from '../models/User.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegister({ name, email, password }) {
  if (!name || !email || !password) return 'Campos obrigatórios ausentes';
  if (typeof name !== 'string' || name.trim().length < 2) return 'Nome deve ter ao menos 2 caracteres';
  if (!EMAIL_RE.test(email)) return 'Email inválido';
  if (password.length < 6) return 'Senha deve ter ao menos 6 caracteres';
  if (password.length > 128) return 'Senha muito longa';
  return null;
}

router.post('/register', async (req, res) => {
  const err = validateRegister(req.body);
  if (err) return res.status(400).json({ error: err });

  try {
    await connectDB();
    const { name, email, password } = req.body;

    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(400).json({ error: 'Usuário já existe' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name.trim(), email: email.toLowerCase(), password: hashed });
    res.status(201).json({ message: 'Conta criada', user: { id: user._id, name: user.name, email: user.email } });
  } catch {
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });

  try {
    await connectDB();
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user || !(await bcrypt.compare(String(password), user.password)))
      return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch {
    res.status(500).json({ error: 'Erro ao autenticar' });
  }
});

router.get('/session', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.json({ user: null });
  try {
    const payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    res.json({ user: { id: payload.id, name: payload.name, email: payload.email } });
  } catch {
    res.json({ user: null });
  }
});

export default router;
