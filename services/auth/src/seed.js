/**
 * @file seed.js
 * @brief Création idempotente du compte administrateur initial au démarrage.
 */
import bcrypt from 'bcryptjs';
import { User } from './models/user.model.js';
import { env } from './config/env.js';

/**
 * @brief Crée le compte administrateur initial s'il n'existe pas déjà.
 * @returns Résout une fois l'admin présent (création ou no-op).
 */
export async function seedAdmin() {
  const existing = await User.findOne({ where: { username: env.seedAdmin.username } });
  if (existing) return;
  const passwordHash = await bcrypt.hash(env.seedAdmin.password, 12);
  await User.create({
    username: env.seedAdmin.username,
    email: env.seedAdmin.email,
    passwordHash,
    role: 'admin',
  });
  console.log(`[auth] Compte admin initial créé : ${env.seedAdmin.username}`);
}
