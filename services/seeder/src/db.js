/**
 * @file db.js
 * @brief Connexions et modèles du seeder (PostgreSQL via Sequelize, MongoDB via Mongoose).
 *
 * Les modèles répliquent ceux des services mais avec `timestamps:false` afin que le
 * seeder fixe lui-même les dates de création (fil chronologique réaliste).
 */
import { Sequelize, DataTypes } from 'sequelize';
import mongoose from 'mongoose';

// ---- PostgreSQL (users, follows) ----
export const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'breezy',
  process.env.POSTGRES_USER || 'breezy',
  process.env.POSTGRES_PASSWORD || 'breezy',
  {
    host: process.env.POSTGRES_HOST || 'postgres',
    port: Number(process.env.POSTGRES_PORT || 5432),
    dialect: 'postgres',
    logging: false,
  }
);

export const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.UUID, primaryKey: true },
    username: { type: DataTypes.STRING(30), unique: true },
    email: { type: DataTypes.STRING(255), unique: true },
    passwordHash: DataTypes.STRING,
    role: DataTypes.ENUM('user', 'moderator', 'admin'),
    status: DataTypes.ENUM('active', 'suspended', 'banned'),
    displayName: DataTypes.STRING(60),
    bio: DataTypes.STRING(160),
    avatarUrl: DataTypes.STRING,
  },
  { tableName: 'users', timestamps: true }
);

export const Follow = sequelize.define(
  'Follow',
  {
    id: { type: DataTypes.UUID, primaryKey: true },
    followerId: DataTypes.UUID,
    followedId: DataTypes.UUID,
  },
  { tableName: 'follows', timestamps: true }
);

// ---- MongoDB (posts, comments, likes, stories, notifications) ----

/** @brief Établit la connexion MongoDB du seeder. */
export async function connectMongo() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://mongo:27017/breezy', {
    serverSelectionTimeoutMS: 8000,
  });
}

const Mixed = mongoose.Schema.Types.Mixed;
// timestamps désactivés : le seeder fixe lui-même createdAt/updatedAt
// pour produire un fil chronologique réaliste (étalé sur 30 jours).

export const Post = mongoose.model('Post', new mongoose.Schema(
  {
    authorId: String, authorUsername: String, content: String,
    tags: [String], media: [{ url: String, type: String, _id: false }],
    likeCount: Number, commentCount: Number,
    createdAt: Date, updatedAt: Date,
  },
  { timestamps: false }
));

export const Comment = mongoose.model('Comment', new mongoose.Schema(
  { postId: mongoose.Schema.Types.ObjectId, parentCommentId: mongoose.Schema.Types.ObjectId,
    authorId: String, authorUsername: String, content: String, createdAt: Date, updatedAt: Date },
  { timestamps: false }
));

export const Like = mongoose.model('Like', new mongoose.Schema(
  { postId: mongoose.Schema.Types.ObjectId, userId: String, createdAt: Date, updatedAt: Date },
  { timestamps: false }
));

export const Story = mongoose.model('Story', new mongoose.Schema(
  { authorId: String, authorUsername: String, gradient: String, text: String, mediaUrl: String,
    expiresAt: Date, createdAt: Date, updatedAt: Date },
  { timestamps: false }
));

export const Notification = mongoose.model('Notification', new mongoose.Schema(
  { userId: String, type: String, actor: { id: String, username: String }, payload: Mixed,
    read: Boolean, createdAt: Date, updatedAt: Date },
  { timestamps: false }
));

export const Reply = mongoose.model('Reply', new mongoose.Schema(
  { commentId: String, postId: String, authorId: String, authorUsername: String,
    content: String, likes: [String], createdAt: Date, updatedAt: Date },
  { timestamps: false }
));
