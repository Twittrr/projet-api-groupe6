/**
 * @file report.model.js
 * @brief Modèle Mongoose `Report` (signalement Fx20, traité par la modération Fx21).
 */
import mongoose from 'mongoose';

// Report — signalement de contenu inapproprié (Fx20), traité par la modération (Fx21)
const ReportSchema = new mongoose.Schema(
  {
    targetType: { type: String, enum: ['post', 'comment', 'user'], required: true },
    targetId: { type: String, required: true },
    reason: { type: String, required: true, maxlength: 280 },
    reporterId: { type: String, required: true },
    reporterUsername: { type: String, required: true },
    status: { type: String, enum: ['open', 'reviewed', 'dismissed'], default: 'open', index: true },
    // Aperçu dénormalisé pour l'écran de modération
    snapshot: { type: Object, default: {} },
  },
  { timestamps: true }
);

export const Report = mongoose.model('Report', ReportSchema);
