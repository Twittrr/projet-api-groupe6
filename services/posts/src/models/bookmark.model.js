/**
 * @file bookmark.model.js
 * @brief Modèle Mongoose `Bookmark` — enregistrement d'un post par un utilisateur.
 */
import mongoose from 'mongoose';

const BookmarkSchema = new mongoose.Schema(
  {
    userId:  { type: String, required: true, index: true },
    postId:  { type: String, required: true, index: true },
  },
  { timestamps: true }
);

// Index unique : un utilisateur ne peut bookmarker le même post qu'une seule fois
BookmarkSchema.index({ userId: 1, postId: 1 }, { unique: true });

export const Bookmark = mongoose.model('Bookmark', BookmarkSchema);
