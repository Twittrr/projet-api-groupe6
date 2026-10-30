/**
 * @file auth.schema.js
 * @brief Schémas de validation Zod des entrées du service Auth.
 */
import { z } from 'zod';

/** Politique de mot de passe : ≥ 8 caractères, 1 minuscule, 1 majuscule, 1 chiffre. */
const password = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
  .max(72, 'Le mot de passe est trop long.')
  .regex(/[a-z]/, 'Au moins une lettre minuscule requise.')
  .regex(/[A-Z]/, 'Au moins une lettre majuscule requise.')
  .regex(/\d/, 'Au moins un chiffre requis.');

const username = z
  .string()
  .regex(/^\w{3,30}$/, "Le nom d'utilisateur doit faire 3 à 30 caractères (lettres, chiffres, _).");

export const registerSchema = z.object({
  username,
  email: z.string().email('Email invalide.').max(255),
  password,
});

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Identifiant requis.'), // username ou email
  password: z.string().min(1, 'Mot de passe requis.'),
});

// Création de compte par un administrateur (peut fixer le rôle)
export const adminCreateUserSchema = z.object({
  username,
  email: z.string().email().max(255),
  password,
  role: z.enum(['user', 'moderator', 'admin']).default('user'),
});
