/**
 * @file refreshToken.model.js
 * @brief Modèle Sequelize pour la liste noire/blanche des refresh tokens (SEC-2).
 * Chaque token émis est enregistré ; révocation immédiate possible via `revoked`.
 */
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const RefreshToken = sequelize.define(
  'RefreshToken',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    jti: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    revoked: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
  },
  {
    tableName: 'refresh_tokens',
    timestamps: true,
    indexes: [
      { fields: ['jti'] },
      { fields: ['userId'] },
      { fields: ['expiresAt'] },
    ],
  }
);
