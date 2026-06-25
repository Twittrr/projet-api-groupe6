/**
 * @file auth.routes.js
 * @brief Routes du service Auth (`/api/auth/*`).
 */
import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/authenticate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { ah } from '../utils/response.js';
import { registerSchema, loginSchema, adminCreateUserSchema, googleSchema } from '../validators/auth.schema.js';

const router = Router();

// Sonde de santé
router.get('/health', (_req, res) => res.json({ data: { status: 'ok', service: 'auth' }, error: null }));

// Routes publiques (rate-limit strict)
router.post('/register', authLimiter, validate(registerSchema), ah(ctrl.register));
router.post('/login', authLimiter, validate(loginSchema), ah(ctrl.login));
router.post('/google', authLimiter, validate(googleSchema), ah(ctrl.googleAuth));
router.post('/refresh', authLimiter, ah(ctrl.refresh)); // rate-limit : protège du token stuffing
router.post('/logout', ah(ctrl.logout));

// Routes authentifiées
router.get('/me', authenticate, ah(ctrl.me));

// Administration (RBAC)
router.post('/users', authenticate, requireRole('admin'), validate(adminCreateUserSchema), ah(ctrl.adminCreateUser));

export default router;
