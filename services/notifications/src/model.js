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

/** Types de notification activables/désactivables par l'utilisateur. */
export const NOTIF_TYPES = ['like', 'comment', 'follow', 'mention', 'message'];

// Préférences par utilisateur : un booléen par type, activé par défaut.
const PreferenceSchema = new mongoose.Schema(
  {
    userId:  { type: String, required: true, unique: true, index: true },
    like:    { type: Boolean, default: true },
    comment: { type: Boolean, default: true },
    follow:  { type: Boolean, default: true },
    mention: { type: Boolean, default: true },
    message: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Preference = mongoose.model('NotificationPreference', PreferenceSchema);

/**
 * @brief Une notification de ce type est-elle autorisée pour ces préférences ?
 * Pas de document (utilisateur sans préférences) ⇒ tout est autorisé (défaut).
 * Un type vaut `false` ⇒ refusé ; absent ou `true` ⇒ autorisé.
 */
export function prefAllows(prefDoc, type) {
  if (!prefDoc) return true;
  return prefDoc[type] !== false;
}
