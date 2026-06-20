/**
 * @file conversations.controller.js
 * @brief Contrôleurs métier du service Conversations (CRUD conversations + messages).
 */
import { z } from 'zod';
import { Conversation } from '../models/conversation.model.js';
import { Message }      from '../models/message.model.js';
import { env }          from '../config/env.js';

const ok   = (res, data, meta = null, status = 200) => res.status(status).json({ data, error: null, meta });
const fail = (res, status, code, message) => res.status(status).json({ data: null, error: { code, message }, meta: null });

// ---- Schémas Zod ----
const createConvSchema = z.object({
  participantIds: z.array(z.string().min(1)).min(1).max(50),
  name:           z.string().max(60).optional(),
});

const sendMsgSchema = z.object({
  content: z.string().min(1, 'Le contenu est requis.').max(2000, 'Maximum 2000 caractères.'),
});

const addMembersSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(50),
});

// ---- Helpers ----

function isParticipant(conv, userId) {
  return conv.participants.some((p) => p.userId === userId);
}

/**
 * @brief Résout les usernames par lot via le service Users (endpoint interne).
 * @param userIds Liste d'UUIDs à résoudre.
 * @returns Map { userId → username } ; valeur manquante si l'appel échoue.
 */
async function resolveUsernames(userIds) {
  if (!userIds.length) return {};
  try {
    const res = await fetch(
      `${env.usersUrl}/api/users/internal/batch?ids=${userIds.join(',')}`,
      { headers: { 'x-internal-key': env.internalKey } }
    );
    if (!res.ok) return {};
    const json = await res.json();
    return Object.fromEntries((json.data?.users ?? []).map((u) => [u.id, u.username]));
  } catch {
    return {};
  }
}

// ---- Contrôleurs ----

/** @brief Liste les conversations de l'utilisateur authentifié. */
export async function listConversations(req, res) {
  const conversations = await Conversation.find({
    'participants.userId': req.user.id,
  }).sort({ updatedAt: -1 }).limit(100);
  return ok(res, { conversations });
}

/** @brief Crée une conversation 1:1 ou groupe. */
export async function createConversation(req, res) {
  const parsed = createConvSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return fail(res, 422, 'VALIDATION_ERROR', details[0]?.message || 'Données invalides.');
  }
  const { participantIds, name } = parsed.data;

  const allIds = [...new Set([req.user.id, ...participantIds.map(String)])];
  const isGroup = allIds.length > 2 || Boolean(name);

  // Pour les conversations 1:1 : vérifier si elle existe déjà
  if (!isGroup && allIds.length === 2) {
    const other = allIds.find((id) => id !== req.user.id);
    const existing = await Conversation.findOne({
      isGroup: false,
      'participants.userId': { $all: [req.user.id, other] },
      $expr: { $eq: [{ $size: '$participants' }, 2] },
    });
    if (existing) return ok(res, { conversation: existing }, null, 200);
  }

  // Résolution des usernames via le service Users
  const otherIds = allIds.filter((id) => id !== req.user.id);
  const usernameMap = await resolveUsernames(otherIds);

  const participants = allIds.map((uid) => ({
    userId:   uid,
    username: uid === req.user.id ? req.user.username : (usernameMap[uid] ?? uid),
    joinedAt: new Date(),
  }));

  const conv = await Conversation.create({ name: name || null, participants, isGroup });
  return ok(res, { conversation: conv }, null, 201);
}

/** @brief Retourne les métadonnées d'une conversation (vérification participation). */
export async function getConversation(req, res) {
  const conv = await Conversation.findById(req.params.id);
  if (!conv) return fail(res, 404, 'NOT_FOUND', 'Conversation introuvable.');
  if (!isParticipant(conv, req.user.id)) return fail(res, 403, 'FORBIDDEN', 'Accès refusé.');
  return ok(res, { conversation: conv });
}

/**
 * @brief Retourne les messages paginés d'une conversation.
 * Query: `page` (défaut 1), `limit` (défaut 20, max 50).
 */
export async function listMessages(req, res) {
  const conv = await Conversation.findById(req.params.id);
  if (!conv) return fail(res, 404, 'NOT_FOUND', 'Conversation introuvable.');
  if (!isParticipant(conv, req.user.id)) return fail(res, 403, 'FORBIDDEN', 'Accès refusé.');

  const page  = Math.max(1, Number.parseInt(req.query.page)  || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit) || 20));
  const skip  = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    Message.find({ conversationId: req.params.id }).sort({ createdAt: 1 }).skip(skip).limit(limit),
    Message.countDocuments({ conversationId: req.params.id }),
  ]);
  return ok(res, { messages }, { page, limit, total, pages: Math.ceil(total / limit) });
}

/** @brief Envoie un message dans une conversation. */
export async function sendMessage(req, res) {
  const conv = await Conversation.findById(req.params.id);
  if (!conv) return fail(res, 404, 'NOT_FOUND', 'Conversation introuvable.');
  if (!isParticipant(conv, req.user.id)) return fail(res, 403, 'FORBIDDEN', 'Accès refusé.');

  const parsed = sendMsgSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Contenu invalide.');
  }
  const { content } = parsed.data;

  const message = await Message.create({
    conversationId: conv._id.toString(),
    authorId:       req.user.id,
    authorUsername: req.user.username,
    content:        content.trim(),
    readBy:         [req.user.id],
  });

  await Conversation.findByIdAndUpdate(conv._id, {
    lastMessage: {
      content:        content.trim().slice(0, 100),
      authorUsername: req.user.username,
      sentAt:         message.createdAt,
    },
    updatedAt: message.createdAt,
  });

  return ok(res, { message }, null, 201);
}

/** @brief Ajoute des membres à un groupe (réservé à l'admin implicite — premier participant). */
export async function addMembers(req, res) {
  const conv = await Conversation.findById(req.params.id);
  if (!conv) return fail(res, 404, 'NOT_FOUND', 'Conversation introuvable.');
  if (!conv.isGroup) return fail(res, 400, 'BAD_REQUEST', "Impossible d'ajouter des membres à une conversation 1:1.");
  if (conv.participants[0]?.userId !== req.user.id) {
    return fail(res, 403, 'FORBIDDEN', "Seul l'administrateur peut ajouter des membres.");
  }

  const parsed = addMembersSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'userIds invalide.');
  }
  const { userIds } = parsed.data;

  const existingIds = new Set(conv.participants.map((p) => p.userId));
  const toAdd = userIds.map(String).filter((id) => !existingIds.has(id));

  if (toAdd.length > 0) {
    const usernameMap = await resolveUsernames(toAdd);
    conv.participants.push(...toAdd.map((uid) => ({
      userId:   uid,
      username: usernameMap[uid] ?? uid,
      joinedAt: new Date(),
    })));
    await conv.save();
  }

  return ok(res, { conversation: conv });
}

/** @brief Retire un membre d'une conversation (soi-même ou admin du groupe). */
export async function removeMember(req, res) {
  const conv = await Conversation.findById(req.params.id);
  if (!conv) return fail(res, 404, 'NOT_FOUND', 'Conversation introuvable.');
  if (!isParticipant(conv, req.user.id)) return fail(res, 403, 'FORBIDDEN', 'Accès refusé.');

  const { userId } = req.params;
  const isSelf  = userId === req.user.id;
  const isAdmin = conv.participants[0]?.userId === req.user.id;

  if (!isSelf && !isAdmin) {
    return fail(res, 403, 'FORBIDDEN', "Seul l'administrateur peut retirer d'autres membres.");
  }

  const before = conv.participants.length;
  conv.participants = conv.participants.filter((p) => p.userId !== userId);
  if (conv.participants.length === before) {
    return fail(res, 404, 'NOT_FOUND', 'Membre introuvable dans cette conversation.');
  }

  await conv.save();
  return ok(res, { conversation: conv });
}
