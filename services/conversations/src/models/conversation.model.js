/**
 * @file conversation.model.js
 * @brief Modèle Mongoose `Conversation` (messagerie 1:1 et groupes).
 */
import mongoose from 'mongoose';

const ParticipantSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    username: { type: String, required: true },
    joinedAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const LastMessageSchema = new mongoose.Schema(
  {
    content: { type: String },
    authorUsername: { type: String },
    sentAt: { type: Date },
  },
  { _id: false }
);

const ConversationSchema = new mongoose.Schema(
  {
    name: { type: String, default: null },
    participants: { type: [ParticipantSchema], default: [] },
    lastMessage: { type: LastMessageSchema, default: null },
    isGroup: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ConversationSchema.index({ 'participants.userId': 1, updatedAt: -1 });

export const Conversation = mongoose.model('Conversation', ConversationSchema);
