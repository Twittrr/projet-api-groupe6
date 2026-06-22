/**
 * @file index.js
 * @brief Service Notifications complet : app Express, middlewares, routes et démarrage.
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { z } from 'zod';
import { env } from './config.js';
import { Notification } from './model.js';

// ---- Helpers réponse ----
const ok   = (res, data, meta = null, status = 200) => res.status(status).json({ data, error: null, meta });
const fail = (res, status, code, message) => res.status(status).json({ data: null, error: { code, message }, meta: null });
const ah   = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---- Schéma Zod pour l'endpoint interne ----
const internalNotifSchema = z.object({
  userId:  z.string().min(1),
  type:    z.enum(['like', 'comment', 'follow', 'mention', 'message']),
  actor:   z.object({ id: z.string().min(1), username: z.string().min(1) }),
  payload: z.record(z.unknown()).default({}),
});

// ---- Middlewares ----
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return fail(res, 401, 'UNAUTHENTICATED', "Jeton d'accès manquant.");
  try {
    const p = jwt.verify(token, env.jwt.accessSecret, { issuer: 'breezy-auth' });
    req.user = { id: p.sub, username: p.username, role: p.role };
    next();
  } catch {
    return fail(res, 401, 'INVALID_TOKEN', 'Jeton invalide ou expiré.');
  }
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-key'] !== env.internalKey) {
    return fail(res, 403, 'FORBIDDEN', 'Accès interne refusé.');
  }
  next();
}

function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '32kb' }));
  app.use(rateLimit({ windowMs: 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));

  const r = express.Router();

  r.get('/health', (_req, res) => res.json({ data: { status: 'ok', service: 'notifications' }, error: null }));

  // Suppression interne des notifications message d'une conversation (quand l'utilisateur la lit)
  r.delete('/internal/clear-conversation', requireInternal, ah(async (req, res) => {
    const { userId, conversationId } = req.body;
    if (!userId || !conversationId) return fail(res, 422, 'VALIDATION_ERROR', 'userId et conversationId requis.');
    await Notification.deleteMany({ userId, type: 'message', 'payload.conversationId': conversationId });
    return ok(res, { cleared: true });
  }));

  // Création interne — validée via Zod (payload type-safe)
  r.post('/internal', requireInternal, ah(async (req, res) => {
    const parsed = internalNotifSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Données invalides.';
      return fail(res, 422, 'VALIDATION_ERROR', msg);
    }
    const { userId, type, actor, payload } = parsed.data;
    const notif = await Notification.create({ userId, type, actor, payload });
    return ok(res, { notification: notif }, null, 201);
  }));

  // Liste des notifications (50 dernières, paginées par `page`)
  r.get('/', authenticate, ah(async (req, res) => {
    const page  = Math.max(1, Number.parseInt(req.query.page) || 1);
    const limit = 50;
    const skip  = (page - 1) * limit;
    const [notifs, total] = await Promise.all([
      Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments({ userId: req.user.id }),
    ]);
    return ok(res, { notifications: notifs }, { page, limit, total, pages: Math.ceil(total / limit) });
  }));

  // Compteur de non-lues (badge)
  r.get('/unread-count', authenticate, ah(async (req, res) => {
    const count = await Notification.countDocuments({ userId: req.user.id, read: false });
    return ok(res, { count });
  }));

  // Marquer une notification comme lue
  r.patch('/:id/read', authenticate, ah(async (req, res) => {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );
    if (!n) return fail(res, 404, 'NOT_FOUND', 'Notification introuvable.');
    return ok(res, { notification: n });
  }));

  // Tout marquer comme lu
  r.post('/read-all', authenticate, ah(async (req, res) => {
    await Notification.updateMany({ userId: req.user.id, read: false }, { read: true });
    return ok(res, { read: true });
  }));

  app.use('/api/notifications', r);

  app.use((req, res) => fail(res, 404, 'NOT_FOUND', `Route introuvable : ${req.method} ${req.originalUrl}`));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.name === 'CastError') return fail(res, 400, 'BAD_ID', 'Identifiant invalide.');
    console.error('[notifications] Erreur :', err);
    return fail(res, 500, 'INTERNAL_ERROR', 'Une erreur interne est survenue.');
  });
  return app;
}

async function connectWithRetry(retries = 10, delayMs = 3000) {
  mongoose.set('strictQuery', true);
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
      return;
    } catch (err) {
      console.warn(`[notifications] MongoDB indisponible (${attempt}/${retries}): ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

try {
  await connectWithRetry();
  createApp().listen(env.port, () => console.log(`[notifications] démarré sur le port ${env.port}`));
} catch (err) {
  console.error('[notifications] Échec du démarrage :', err);
  process.exit(1);
}
