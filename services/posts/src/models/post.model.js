/**
 * @file post.model.js
 * @brief Modèle Mongoose `Post` (message court, auteur dénormalisé, médias, compteurs).
 */
import mongoose from 'mongoose';

const MediaSchema = new mongoose.Schema(
  { url: { type: String, required: true }, type: { type: String, enum: ['image', 'video'], required: true } },
  { _id: false }
);

// Post — message court (Fx3). Auteur dénormalisé pour éviter un appel cross-service en lecture.
const PostSchema = new mongoose.Schema(
  {
    authorId: { type: String, required: true, index: true },
    authorUsername: { type: String, required: true },
    content: { type: String, required: true, maxlength: 280, trim: true },
    tags: { type: [String], default: [], index: true }, // Fx12
    media: { type: [MediaSchema], default: [] }, // Fx18 / Fx19
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Flux chronologique et profils
PostSchema.index({ createdAt: -1 });
PostSchema.index({ authorId: 1, createdAt: -1 });

export const Post = mongoose.model('Post', PostSchema);
