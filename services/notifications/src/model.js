/**
 * @file model.js
 * @brief Modèle Mongoose `Notification` (Fx14 mentions, Fx15 likes, Fx16 followers, commentaires).
 */
import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    type:   { type: String, enum: ['like', 'comment', 'follow', 'mention', 'message'], required: true },
    actor:  {
      id:       { type: String, required: true },
      username: { type: String, required: true },
    },
    payload: { type: Object, default: {} },
    read:    { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });

// TTL : suppression automatique après 90 jours (évite la croissance infinie de la collection)
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

export const Notification = mongoose.model('Notification', NotificationSchema);
