/**
 * @file reply.model.js
 * @brief Modèle Mongoose `Reply` (réponse à un commentaire, Fx8).
 */
import mongoose from 'mongoose';

const ReplySchema = new mongoose.Schema(
  {
    commentId: { type: String, required: true, index: true },
    postId: { type: String, required: true },
    authorId: { type: String, required: true },
    authorUsername: { type: String, required: true },
    content: { type: String, required: true, maxlength: 280, trim: true },
    likes: { type: [String], default: [] }, // tableau d'userIds
  },
  { timestamps: true }
);

ReplySchema.index({ commentId: 1, createdAt: 1 });

export const Reply = mongoose.model('Reply', ReplySchema);
