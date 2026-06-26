/**
 * @file story.model.js
 * @brief Modèle Mongoose `Story` (contenu éphémère, expiration 24 h via index TTL).
 */
import mongoose from 'mongoose';

// Story — contenu éphémère affiché dans le rail du fil (maquette « stories »).
// Expire automatiquement au bout de 24 h via un index TTL.
const StorySchema = new mongoose.Schema(
  {
    authorId: { type: String, required: true, index: true },
    authorUsername: { type: String, required: true },
    gradient: { type: String, required: true }, // dégradé CSS de fond (cf. maquette)
    text: { type: String, maxlength: 120, default: '' },
    mediaUrl: { type: String, default: null },
    viewedBy: { type: [String], default: [] }, // userIds ayant vu cette story (#11 état "vu")
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Suppression automatique à expiration
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
StorySchema.index({ authorId: 1, createdAt: -1 });

export const Story = mongoose.model('Story', StorySchema);
