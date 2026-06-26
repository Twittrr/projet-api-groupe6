/**
 * @file upload.controller.js
 * @brief Upload de médias (Fx18/Fx19) : stockage disque, validation MIME + magic bytes, limite taille.
 */
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { fileTypeFromFile } from 'file-type';
import { ok, AppError } from '../utils/response.js';

const UPLOAD_DIR = path.resolve('uploads');
const IMAGE_MAX_BYTES = 4 * 1024 * 1024; // 4 Mo pour les images

/**
 * @brief Décide si un upload dépasse la limite image (4 Mo). Les vidéos gardent la limite Multer (10 Mo).
 * @param mime Type MIME réel détecté (magic bytes).
 * @param size Taille du fichier en octets.
 */
export function imageExceedsLimit(mime, size) {
  return !String(mime).startsWith('video') && size > IMAGE_MAX_BYTES;
}

// Types MIME autorisés → extension de fichier
const ALLOWED = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/gif':  'gif',
  'image/webp': 'webp',
  'video/mp4':  'mp4',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, _file, cb) => {
    // Nom aléatoire : le Content-Type client ne dicte pas l'extension finale
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.tmp`);
  },
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED[file.mimetype]) {
    return cb(new AppError(422, 'UNSUPPORTED_MEDIA', 'Type de fichier non autorisé (jpg, png, gif, webp, mp4).'));
  }
  cb(null, true);
}

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('file');

/**
 * @brief Fx18/Fx19 — Valide les magic bytes réels du fichier, renomme et retourne l'URL publique.
 * La validation des magic bytes protège du MIME spoofing : un fichier PHP avec
 * Content-Type: image/jpeg sera rejeté ici même s'il a passé le filtre Multer.
 */
export async function handleUpload(req, res) {
  if (!req.file) throw new AppError(400, 'NO_FILE', 'Aucun fichier fourni.');

  // Lecture des magic bytes réels (indépendant du Content-Type fourni par le client)
  const detected = await fileTypeFromFile(req.file.path).catch(() => null);
  if (!detected || !ALLOWED[detected.mime]) {
    await unlink(req.file.path).catch(() => {});
    throw new AppError(422, 'UNSUPPORTED_MEDIA', 'Contenu du fichier non autorisé ou corrompu.');
  }

  // Limite spécifique aux images : 4 Mo (la vidéo garde la limite Multer de 10 Mo).
  const type = detected.mime.startsWith('video') ? 'video' : 'image';
  if (imageExceedsLimit(detected.mime, req.file.size)) {
    await unlink(req.file.path).catch(() => {});
    throw new AppError(413, 'IMAGE_TOO_LARGE', 'Image trop volumineuse (max 4 Mo).');
  }

  // Renommage avec la vraie extension détectée
  const ext = ALLOWED[detected.mime];
  const finalName = req.file.filename.replace('.tmp', `.${ext}`);
  const finalPath = path.join(UPLOAD_DIR, finalName);
  await import('node:fs/promises').then(({ rename }) => rename(req.file.path, finalPath));

  return ok(res, { url: `/uploads/${finalName}`, type });
}
