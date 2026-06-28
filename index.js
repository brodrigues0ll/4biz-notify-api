import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { initAutoSyncCron } from "./lib/cron.js";

import authRoutes from "./routes/auth.js";
import ticketRoutes from "./routes/tickets.js";
import syncRoutes from "./routes/sync.js";
import credentialsRoutes from "./routes/credentials.js";
import autoSyncRoutes from "./routes/autoSync.js";
import pushRoutes from "./routes/push.js";
import cronRoutes from "./routes/cron.js";

const app = express();

// Necessário para ler o IP real atrás de proxies (Vercel, Nginx, etc.)
app.set("trust proxy", 1);

// Segurança: headers HTTP
app.use(helmet());

// CORS: aceita apenas origens explicitamente permitidas
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Permite requisições sem origin (mobile nativo, curl, Postman)
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error("Origem não permitida pelo CORS"));
      }
    },
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body limit: evita payloads gigantes
app.use(express.json({ limit: "50kb" }));

// Rate limiting global
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas requisições. Tente novamente em alguns minutos." },
  })
);

// Rate limiting restrito para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Muitas tentativas de login. Tente novamente em 15 minutos." },
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/fourbiz-credentials", credentialsRoutes);
app.use("/api/auto-sync-config", autoSyncRoutes);
app.use("/api", pushRoutes);
app.use("/api/cron", cronRoutes);

app.get("/api/health", (_, res) =>
  res.json({ status: "ok", ts: new Date().toISOString() })
);

// Handler global de erros
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const message = status < 500 ? err.message : "Erro interno do servidor";
  if (status >= 500) console.error("[ERROR]", err);
  res.status(status).json({ error: message });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`\n🚀 4biz-notify server rodando na porta ${PORT}`);
  initAutoSyncCron();
});
