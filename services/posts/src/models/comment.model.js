/**
 * @file comment.model.js
 * @brief Modèle Mongoose `Comment` (réponse à un post Fx7 ou à un commentaire Fx8).
 */
import mongoose from 'mongoose';

// Comment — réponse à un post (Fx7) ou à un autre commentaire en thread (Fx8)
const CommentSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    parentCommentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    authorId: { type: String, required: true },
    authorUsername: { type: String, required: true },
    content: { type: String, required: true, maxlength: 280, trim: true },
  },
  { timestamps: true }
);

CommentSchema.index({ postId: 1, createdAt: 1 });

export const Comment = mongoose.model('Comment', CommentSchema);
