/**
 * @file user.model.js
 * @brief Modèle Sequelize `User` — source de vérité de l'identité (table `users`).
 */
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Table `users` — source de vérité de l'identité (partagée avec le service Users).
// Le service Auth possède les colonnes sensibles (passwordHash, role, status).
export const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      validate: { is: /^\w{3,30}$/ },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // RBAC : visitor (non stocké), user, moderator, admin
    role: {
      type: DataTypes.ENUM('user', 'moderator', 'admin'),
      allowNull: false,
      defaultValue: 'user',
    },
    // Cycle de vie du compte (modération)
    status: {
      type: DataTypes.ENUM('active', 'suspended', 'banned'),
      allowNull: false,
      defaultValue: 'active',
    },
    displayName: { type: DataTypes.STRING(60), allowNull: true },
    bio: { type: DataTypes.STRING(160), allowNull: true },
    avatarUrl: { type: DataTypes.STRING, allowNull: true },
    language: { type: DataTypes.STRING(5), allowNull: false, defaultValue: 'fr' },
    theme: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'light' },
  },
  {
    tableName: 'users',
    timestamps: true,
    indexes: [{ fields: ['username'] }, { fields: ['email'] }],
  }
);

/**
 * @brief Projette un utilisateur en vue publique (sans passwordHash ni email).
 * @param u Instance utilisateur.
 * @returns Objet sûr à exposer via l'API.
 */
export function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName || u.username,
    role: u.role,
    status: u.status,
    bio: u.bio || '',
    avatarUrl: u.avatarUrl || null,
    createdAt: u.createdAt,
  };
}
