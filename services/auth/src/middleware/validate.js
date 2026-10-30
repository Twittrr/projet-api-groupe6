/**
 * @file validate.js
 * @brief Middleware de validation/sanitation des entrées via un schéma Zod.
 */
import { AppError } from '../utils/response.js';

/**
 * @brief Valide `req.body` contre un schéma Zod et le remplace par les données nettoyées.
 * @param schema Schéma Zod.
 * @returns Middleware Express renvoyant 422 en cas d'échec de validation.
 */
export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return next(new AppError(422, 'VALIDATION_ERROR', 'Validation des champs échouée.', details));
    }
    req.body = result.data; // données nettoyées/typées
    next();
  };
}
