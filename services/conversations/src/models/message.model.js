/**
 * @file message.model.js
 * @brief Modèle Mongoose `Message` (messages d'une conversation).
 */
import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true, index: true },
    authorId: { type: String, required: true },
    authorUsername: { type: String, required: true },
    content: { type: String, required: true, maxlength: 2000 },
    readBy: { type: [String], default: [] },
  },
  { timestamps: true }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message = mongoose.model('Message', MessageSchema);
