/**
 * @file users.routes.js
 * @brief Routes du service Users (`/api/users/*`).
 */
import { Router } from 'express';
import * as ctrl from '../controllers/users.controller.js';
import { authenticate, optionalAuth, requireRole, requireInternal, validate, ah } from '../middleware/common.js';
import { updateProfileSchema, moderateStatusSchema, updateLanguageSchema, updateThemeSchema } from '../validators/users.schema.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ data: { status: 'ok', service: 'users' }, error: null }));

// Recherche & suggestions
router.get('/search', optionalAuth, ah(ctrl.searchUsers));
router.get('/suggestions', authenticate, ah(ctrl.suggestions));

// Profil courant
router.patch('/me', authenticate, validate(updateProfileSchema), ah(ctrl.updateMe));
router.patch('/me/language', authenticate, validate(updateLanguageSchema), ah(ctrl.updateLanguage));
router.patch('/me/theme', authenticate, validate(updateThemeSchema), ah(ctrl.updateTheme));

// Endpoints internes (avant les routes paramétrées génériques)
router.get('/internal/:id/following-ids', requireInternal, ah(ctrl.internalFollowingIds));
router.get('/internal/batch', requireInternal, ah(ctrl.internalBatchUsers));

// Graphe social
router.post('/:id/follow', authenticate, ah(ctrl.follow));
router.delete('/:id/follow', authenticate, ah(ctrl.unfollow));
router.get('/:id/followers', ah(ctrl.listFollowers));
router.get('/:id/following', ah(ctrl.listFollowing));

// Modération (Fx21)
router.patch('/:id/status', authenticate, requireRole('moderator', 'admin'), validate(moderateStatusSchema), ah(ctrl.moderateStatus));

// Profil public par username (en dernier : route la plus générique)
router.get('/:username', optionalAuth, ah(ctrl.getProfile));

export default router;
