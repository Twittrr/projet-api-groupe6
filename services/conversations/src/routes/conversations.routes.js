/**
 * @file conversations.routes.js
 * @brief Définition des routes du service Conversations.
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  listConversations,
  createConversation,
  getConversation,
  listMessages,
  sendMessage,
  addMembers,
  removeMember,
} from '../controllers/conversations.controller.js';

/** @brief Async handler : capture les rejets de promesse et les transmet à next(). */
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

router.get('/', ah(listConversations));
router.post('/', ah(createConversation));
router.get('/:id', ah(getConversation));
router.get('/:id/messages', ah(listMessages));
router.post('/:id/messages', ah(sendMessage));
router.post('/:id/members', ah(addMembers));
router.delete('/:id/members/:userId', ah(removeMember));

export default router;
