/**
 * @file posts.schema.js
 * @brief Schémas de validation Zod des entrées du service Posts.
 */
import { z } from 'zod';

const tag = z.string().regex(/^\w{1,30}$/);

// Les URLs de médias doivent pointer vers des uploads locaux (évite l'injection d'URLs externes)
const localUploadUrl = z
  .string()
  .regex(/^\/uploads\/[\w.-]+$/, "L'URL du média doit pointer vers un upload local (/uploads/...).");

export const createPostSchema = z.object({
  content: z.string().min(1, 'Le message ne peut pas être vide.').max(280, 'Maximum 280 caractères.'),
  tags:    z.array(tag).max(8).optional(),
  media:   z.array(z.object({ url: localUploadUrl, type: z.enum(['image', 'video']) })).max(4).optional(),
});

export const updatePostSchema = z.object({
  content: z.string().min(1).max(280),
});

export const createCommentSchema = z.object({
  content:         z.string().min(1).max(280),
  parentCommentId: z.string().nullable().optional(),
});

export const createReportSchema = z.object({
  targetType: z.enum(['post', 'comment', 'user']),
  targetId:   z.string().min(1),
  reason:     z.string().min(3).max(280),
});

export const resolveReportSchema = z.object({
  status: z.enum(['reviewed', 'dismissed']),
});

export const createReplySchema = z.object({
  content: z.string().min(1).max(280),
});
