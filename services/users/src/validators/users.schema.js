/**
 * @file users.schema.js
 * @brief Schémas de validation Zod des entrées du service Users.
 */
import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().max(60).optional(),
  bio: z.string().max(160).optional(),
  avatarUrl: z.string().url().max(500).nullable().optional(),
});

export const moderateStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'banned']),
});

export const updateLanguageSchema = z.object({
  language: z.enum(['fr', 'en']),
});

export const updateThemeSchema = z.object({
  theme: z.enum(['light', 'dark']),
});
