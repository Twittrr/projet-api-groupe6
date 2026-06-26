'use client';
/**
 * @file PasswordInput.tsx
 * @brief Champ mot de passe réutilisable : bouton afficher/masquer + indicateur de force optionnel.
 */
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const INPUT =
  'h-13 w-full rounded-xl2 border border-bd2 bg-sf px-4 py-3 pr-12 text-tx outline-none focus:border-ac';

/** Score de robustesse 0..4 : longueur, casse mixte, chiffre, caractère spécial. */
export function passwordScore(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const LABELS = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Excellent'];
// Palette Tailwind standard (pas de dépendance aux tokens de thème custom).
const COLORS = ['bg-red-500', 'bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-600'];

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  showStrength?: boolean;
  className?: string;
}

export default function PasswordInput({
  value,
  onChange,
  placeholder = 'Mot de passe',
  autoComplete = 'current-password',
  showStrength = false,
  className,
}: Props) {
  const [show, setShow] = useState(false);
  const score = passwordScore(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);

  return (
    <div className="w-full">
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className={className ?? INPUT}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-tx3 hover:text-tx"
          aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="mt-2">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${i < score ? COLORS[score] : 'bg-bd2'}`}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-tx3">
            Force : {LABELS[score]}
            {!hasSpecial && <span> · ajoutez un caractère spécial (!?@…) pour renforcer</span>}
          </p>
        </div>
      )}
    </div>
  );
}
