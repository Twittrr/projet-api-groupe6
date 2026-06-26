'use client';
/**
 * @file privacy/page.tsx
 * @brief Politique de confidentialité Twittrr (RGPD) — page statique thémée clair/sombre.
 *
 * Couvre : responsable de traitement, données collectées, finalités et bases légales,
 * durées de conservation, partage, cookies, droits RGPD, sécurité et contact.
 */
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';

const LAST_UPDATE = '25 juin 2026';

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="space-y-3">
      <h2 className="serif text-2xl text-tx">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-tx2">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full bg-bg text-tx">
      <div className="mx-auto w-full max-w-[760px] px-6 py-10 lg:py-16">
        {/* En-tête */}
        <div className="mb-10 flex items-center justify-between">
          <Logo withWord />
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 rounded-full border border-bd2 px-3.5 py-2 text-sm text-tx2 transition hover:bg-sf"
          >
            <ArrowLeft size={16} /> Retour
          </button>
        </div>

        <header className="mb-10 space-y-2">
          <h1 className="serif text-[40px] leading-tight text-tx lg:text-[52px]">
            Politique de confidentialité
          </h1>
          <p className="text-sm text-tx3">Dernière mise à jour : {LAST_UPDATE}</p>
        </header>

        <div className="space-y-10">
          <Section title="1. Préambule">
            <p>
              La présente politique décrit comment Twittrr (« nous ») collecte, utilise et protège
              vos données personnelles lorsque vous utilisez l&apos;application. Elle est conforme au
              Règlement général sur la protection des données (RGPD, UE 2016/679) et à la loi
              « Informatique et Libertés ». En utilisant Twittrr, vous acceptez les pratiques décrites
              ci-dessous.
            </p>
          </Section>

          <Section title="2. Responsable du traitement">
            <p>
              Twittrr est un projet pédagogique. Le responsable du traitement est l&apos;équipe projet,
              joignable à l&apos;adresse{' '}
              <a href="mailto:privacy@twittrr.local" className="text-ac underline-offset-4 hover:underline">
                privacy@twittrr.local
              </a>
              . Pour toute question relative à vos données, c&apos;est ce contact qu&apos;il convient
              d&apos;utiliser.
            </p>
          </Section>

          <Section title="3. Données que nous collectons">
            <p>Nous collectons uniquement les données nécessaires au fonctionnement du service :</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-tx">Données de compte</strong> : nom d&apos;utilisateur, adresse
                e-mail, et — pour les comptes classiques — un mot de passe stocké de façon chiffrée
                (haché avec bcrypt, jamais en clair).
              </li>
              <li>
                <strong className="text-tx">Connexion via Google</strong> : si vous choisissez de vous
                connecter avec Google, nous recevons votre identifiant Google, votre adresse e-mail et
                votre nom public (pseudo). Nous ne recevons jamais votre mot de passe Google.
              </li>
              <li>
                <strong className="text-tx">Contenus publiés</strong> : posts, commentaires, mentions
                « j&apos;aime », images, stories et messages privés que vous créez.
              </li>
              <li>
                <strong className="text-tx">Données de profil</strong> : nom affiché, biographie, avatar,
                langue et thème d&apos;affichage.
              </li>
              <li>
                <strong className="text-tx">Données techniques</strong> : adresse IP et journaux d&apos;accès,
                conservés à des fins de sécurité et de limitation d&apos;abus (rate-limiting).
              </li>
            </ul>
          </Section>

          <Section title="4. Finalités et bases légales">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-tx">Fournir le service</strong> (création de compte, publication,
                fil d&apos;actualité, messagerie) — base légale : exécution du contrat.
              </li>
              <li>
                <strong className="text-tx">Sécuriser le service</strong> (authentification, détection
                d&apos;abus, modération) — base légale : intérêt légitime.
              </li>
              <li>
                <strong className="text-tx">Améliorer l&apos;expérience</strong> (préférences de langue et
                de thème) — base légale : votre consentement ou l&apos;intérêt légitime.
              </li>
            </ul>
          </Section>

          <Section title="5. Authentification Google">
            <p>
              La connexion « avec Google » repose sur le protocole OpenID Connect. Google vous
              authentifie et nous transmet un jeton signé contenant votre identifiant, votre e-mail et
              votre pseudo. Nous vérifions ce jeton côté serveur, puis créons ou retrouvons votre
              compte Twittrr. Aucun mot de passe n&apos;est créé ni stocké pour ces comptes. Vous
              pouvez à tout moment continuer à utiliser l&apos;authentification classique par e-mail.
            </p>
          </Section>

          <Section title="6. Durées de conservation">
            <p>
              Vos données de compte et vos contenus sont conservés tant que votre compte est actif.
              À la suppression du compte, ils sont effacés ou anonymisés dans un délai raisonnable,
              sauf obligation légale de conservation. Les jetons de session expirés sont purgés
              automatiquement.
            </p>
          </Section>

          <Section title="7. Partage des données">
            <p>
              Nous ne vendons pas vos données. Elles ne sont partagées qu&apos;avec les sous-traitants
              techniques strictement nécessaires (hébergement, fournisseur d&apos;identité Google pour
              la connexion). Les contenus que vous publiez publiquement sont, par nature, visibles des
              autres utilisateurs.
            </p>
          </Section>

          <Section title="8. Cookies et stockage local">
            <p>
              Twittrr utilise un cookie strictement nécessaire (jeton de rafraîchissement de session,
              en <code className="rounded bg-sf2 px-1 py-0.5 text-[13px]">HttpOnly</code>) pour vous
              maintenir connecté. Vos préférences de thème et de langue sont enregistrées localement
              dans votre navigateur. Aucun cookie publicitaire ou de pistage tiers n&apos;est utilisé.
            </p>
          </Section>

          <Section title="9. Vos droits">
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>droit d&apos;accès à vos données ;</li>
              <li>droit de rectification ;</li>
              <li>droit à l&apos;effacement (« droit à l&apos;oubli ») ;</li>
              <li>droit à la limitation et à l&apos;opposition au traitement ;</li>
              <li>droit à la portabilité de vos données.</li>
            </ul>
            <p>
              Pour exercer ces droits, contactez-nous à{' '}
              <a href="mailto:privacy@twittrr.local" className="text-ac underline-offset-4 hover:underline">
                privacy@twittrr.local
              </a>
              . Vous pouvez également introduire une réclamation auprès de la CNIL.
            </p>
          </Section>

          <Section title="10. Sécurité">
            <p>
              Nous mettons en œuvre des mesures techniques pour protéger vos données : mots de passe
              hachés (bcrypt), jetons d&apos;accès de courte durée, cookies <code className="rounded bg-sf2 px-1 py-0.5 text-[13px]">HttpOnly</code>,
              en-têtes de sécurité (CSP, HSTS), et limitation du débit des requêtes sensibles. Aucun
              système n&apos;étant infaillible, nous ne pouvons garantir une sécurité absolue.
            </p>
          </Section>

          <Section title="11. Modifications">
            <p>
              Cette politique peut évoluer. Toute modification importante sera signalée dans
              l&apos;application. La date de dernière mise à jour figure en haut de cette page.
            </p>
          </Section>
        </div>

        <footer className="mt-14 border-t border-bd pt-6 text-sm text-tx3">
          <p>
            Une question ?{' '}
            <a href="mailto:privacy@twittrr.local" className="text-ac underline-offset-4 hover:underline">
              privacy@twittrr.local
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
