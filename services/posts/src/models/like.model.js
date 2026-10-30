/**
 * @file like.model.js
 * @brief Modèle Mongoose `Like` (Fx6). Unicité (postId, userId) garantie par index.
 */
import mongoose from 'mongoose';

// Like — appréciation d'un post (Fx6). Unicité (postId, userId) garantie par index.
const LikeSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    userId: { type: String, required: true },
  },
  { timestamps: true }
);

LikeSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const Like = mongoose.model('Like', LikeSchema);
