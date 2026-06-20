/**
 * @file index.js
 * @brief Modèles Sequelize du service Users : `User` (table partagée) et `Follow` (graphe social).
 */
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Modèle User — mappé sur la même table `users` que le service Auth.
// Le service Users gère le profil et le graphe social, pas les credentials.
export const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    username: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('user', 'moderator', 'admin'), allowNull: false, defaultValue: 'user' },
    status: { type: DataTypes.ENUM('active', 'suspended', 'banned'), allowNull: false, defaultValue: 'active' },
    displayName: { type: DataTypes.STRING(60), allowNull: true },
    bio: { type: DataTypes.STRING(160), allowNull: true },
    avatarUrl: { type: DataTypes.STRING, allowNull: true },
    language: { type: DataTypes.STRING(5), allowNull: false, defaultValue: 'fr' },
    theme: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'light' },
  },
  { tableName: 'users', timestamps: true }
);

// Modèle Follow — graphe social (Fx9). Possédé par le service Users.
export const Follow = sequelize.define(
  'Follow',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    followerId: { type: DataTypes.UUID, allowNull: false }, // celui qui suit
    followedId: { type: DataTypes.UUID, allowNull: false }, // celui qui est suivi
  },
  {
    tableName: 'follows',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['followerId', 'followedId'] },
      { fields: ['followedId'] },
    ],
  }
);

/**
 * @brief Projette un utilisateur en vue publique, avec champs additionnels optionnels.
 * @param u Instance utilisateur.
 * @param extra Champs supplémentaires (ex. compteurs sociaux).
 * @returns Objet sûr à exposer via l'API.
 */
export function publicUser(u, extra = {}) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName || u.username,
    role: u.role,
    status: u.status,
    bio: u.bio || '',
    avatarUrl: u.avatarUrl || null,
    language: u.language || 'fr',
    theme: u.theme || 'light',
    createdAt: u.createdAt,
    ...extra,
  };
}
