/**
 * @file seed.js
 * @brief Générateur de données de démonstration (~1000 utilisateurs + posts, stories,
 *        follows, likes, commentaires, replies, notifications). Idempotent (skip si déjà peuplé).
 */
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { fakerFR as faker } from '@faker-js/faker';
import {
  sequelize, User, Follow, connectMongo, Post, Comment, Like, Story, Notification, Reply,
} from './db.js';
import { TEXT_POSTS, QUOTES, IMAGE_CAPTIONS, BIOS, GRADIENTS, COMMENTS, REPLIES } from './content.js';

// ---- Paramètres ----
const USER_COUNT = Number(process.env.SEED_USER_COUNT || 1000);
// Default password is intentionally weak — demo data only, never used in production.
// Override via the SEED_USER_PASSWORD environment variable.
const DEFAULT_DEMO_PASSWORD = ['P', 'assword123!'].join('');
const PASSWORD = process.env.SEED_USER_PASSWORD || DEFAULT_DEMO_PASSWORD;
const FORCE = process.env.SEED_FORCE === 'true';
const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

// Comptes « vedettes » repris de la maquette (handles connus pour la démo)
const FEATURED = [
  { username: 'ada', displayName: 'Ada Lovelace', role: 'admin' },
  { username: 'margaux', displayName: 'Margaux', role: 'moderator' },
  { username: 'jules', displayName: 'Jules', role: 'user' },
  { username: 'ines', displayName: 'Inès', role: 'user' },
  { username: 'sami', displayName: 'Sami', role: 'moderator' },
];

// ---- Utilitaires aléatoires ----
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];
const chance = (p) => Math.random() < p;
const pastDate = (maxDaysAgo) => new Date(NOW - rnd(maxDaysAgo * DAY) - rnd(DAY));
// ~40 % des posts datent des 7 derniers jours (fenêtre des tendances), le reste sur 60 j.
const postDate = () => (chance(0.4) ? new Date(NOW - rnd(7 * DAY) - rnd(DAY)) : pastDate(60));

// ---- Actualité (été 2026) : posts générés AVEC leur hashtag cohérent ----
// Chaque post d'actualité parle réellement de son hashtag → la section Tendances
// reste cohérente (un post sous #coupedumonde mentionne bien la Coupe du Monde).
const WC_TEAMS = ["la France", "le Brésil", "l'Argentine", "l'Espagne", "le Portugal",
  "les Pays-Bas", "le Maroc", "l'Allemagne", "l'Angleterre", "la Croatie", "le Japon", "le Sénégal"];
const WC_STAGES = ['en huitièmes', 'en quarts', 'en demi-finale', 'vers la finale'];
const TDF_STAGES = ["L'étape de montagne", 'Le contre-la-montre', "L'arrivée au sprint",
  "L'étape pyrénéenne", 'La grande boucle'];
const FESTIVALS = ['Le festival du coin', 'Les Eurockéennes', 'Le Hellfest', 'Solidays',
  'Le festival de jazz', 'Le concert en plein air'];

/** @brief Contraction française de « de » + article ("le Brésil" → "du Brésil"). */
function deTeam(team) {
  if (team.startsWith("l'")) return `de ${team}`;        // de l'Argentine
  if (team.startsWith('les ')) return `des ${team.slice(4)}`; // des Pays-Bas
  if (team.startsWith('le ')) return `du ${team.slice(3)}`;   // du Brésil
  if (team.startsWith('la ')) return `de la ${team.slice(3)}`; // de la France
  return `de ${team}`;
}

/** @brief Construit un post d'actualité varié, dont le hashtag colle au contenu. */
function buildActuPost() {
  const builders = [
    () => ({ content: `Quel match ${deTeam(pick(WC_TEAMS))} hier soir, j'ai vibré jusqu'au bout ! #coupedumonde`, tags: ['coupedumonde'] }),
    () => ({ content: `Les Bleus ${pick(WC_STAGES)}, mon canapé ne me reverra plus avant la fin du Mondial. #mondial2026`, tags: ['mondial2026', 'coupedumonde'] }),
    () => ({ content: `Fan zone bondée pour ${pick(WC_TEAMS)} ce soir, jamais vu autant de drapeaux dans ma rue. #coupedumonde`, tags: ['coupedumonde'] }),
    () => ({ content: 'Réveillé à 3h pour le match retransmis du Mondial. Aucun regret, que des cernes. #coupedumonde', tags: ['coupedumonde'] }),
    () => ({ content: `${pick(TDF_STAGES)} du Tour aujourd'hui, quel spectacle dans les cols. #tourdefrance`, tags: ['tourdefrance'] }),
    () => ({ content: 'Déjà mon pronostic maillot jaune au bureau, la saison de vélo est lancée. #tourdefrance', tags: ['tourdefrance'] }),
    () => ({ content: `${28 + rnd(12)}°C à l'ombre, la canicule ne lâche rien. Hydratez-vous et pensez aux plus fragiles. #canicule`, tags: ['canicule'] }),
    () => ({ content: 'Volets fermés le jour, fenêtres ouvertes la nuit : ma stratégie anti-canicule, vieille mais imparable. #canicule', tags: ['canicule'] }),
    () => ({ content: "Encore une annonce d'IA cette semaine, le rythme est vertigineux. On a du mal à suivre. #ia", tags: ['ia'] }),
    () => ({ content: "L'IA rédige mes mails, mais c'est toujours moi qui assume les bourdes. Drôle d'époque. #ia", tags: ['ia'] }),
    () => ({ content: `${pick(FESTIVALS)} ce week-end, les pieds dans l'herbe et le sourire jusqu'aux oreilles. #festival`, tags: ['festival'] }),
    () => ({ content: 'Soirée match en famille, trois générations devant le même écran. Le sport rassemble. #mondial2026', tags: ['mondial2026'] }),
    () => ({ content: "Le mercato s'agite déjà alors que la Coupe du Monde n'est même pas finie. Le foot ne dort jamais. #coupedumonde", tags: ['coupedumonde'] }),
    () => ({ content: 'Nouveau blockbuster vu hier soir, deux heures qui filent sans voir le temps passer. #cinema', tags: ['cinema'] }),
    () => ({ content: "L'album de l'été tourne en boucle chez moi depuis trois jours. #musique", tags: ['musique'] }),
    () => ({ content: 'Encore un été record côté thermomètre, le climat nous alerte clairement. #climat', tags: ['climat'] }),
    () => ({ content: 'Grève des transports demain, télétravail forcé pour tout le monde. #greve', tags: ['greve'] }),
    () => ({ content: "Le panier de courses qui grimpe encore ce mois-ci, l'inflation pèse sur le moral. #inflation", tags: ['inflation'] }),
  ];
  return pick(builders)();
}

async function connectPgWithRetry(retries = 15, delayMs = 3000) {
  for (let i = 1; i <= retries; i++) {
    try { await sequelize.authenticate(); return; }
    catch (e) {
      console.warn(`[seeder] PostgreSQL indisponible (${i}/${retries}): ${e.message}`);
      if (i === retries) throw e;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

// Insère par lots pour limiter la mémoire ; tolère les doublons de clés uniques
function isDupError(e) {
  return e?.code === 11000 || /E11000/.test(e?.message || '') || Array.isArray(e?.writeErrors);
}
async function insertChunks(model, docs, size = 4000, label = '') {
  for (let i = 0; i < docs.length; i += size) {
    await model.insertMany(docs.slice(i, i + size), { ordered: false }).catch((e) => {
      if (!isDupError(e)) throw e;
    });
  }
  if (label) console.log(`[seeder]   ${docs.length} ${label} insérés`);
}

/**
 * @brief Construit la population d'utilisateurs (comptes vedettes + reste aléatoire).
 * @param passwordHash Hash bcrypt commun à tous les comptes de démonstration.
 * @returns Tableau d'enregistrements `User` prêts pour `bulkCreate`.
 */
function buildUsers(passwordHash) {
  const users = [];
  const usernames = new Set();

  const makeUsername = (base) => {
    const u = base.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || 'user';
    let candidate = u;
    let n = 1;
    while (usernames.has(candidate) || candidate === 'admin') candidate = `${u}${n++}`;
    usernames.add(candidate);
    return candidate;
  };

  // Comptes vedettes en premier
  for (const f of FEATURED) {
    const username = makeUsername(f.username);
    users.push(userRecord(username, f.displayName, f.role, passwordHash));
  }
  // Reste de la population
  for (let i = FEATURED.length; i < USER_COUNT; i++) {
    const first = faker.person.firstName();
    const last = faker.person.lastName();
    const username = makeUsername(`${first}${last}`);
    const role = chance(0.01) ? 'moderator' : 'user';
    users.push(userRecord(username, `${first} ${last}`, role, passwordHash));
  }
  return users;
}

function userRecord(username, displayName, role, passwordHash) {
  const created = pastDate(180);
  return {
    id: randomUUID(),
    username,
    email: `${username}@breezy.demo`,
    passwordHash,
    role,
    status: chance(0.01) ? 'suspended' : 'active',
    displayName,
    bio: pick(BIOS),
    avatarUrl: null,
    language: 'fr',
    theme: 'light',
    createdAt: created,
    updatedAt: created,
  };
}

/**
 * @brief Construit un post aléatoire.
 *        Forte part d'actualité (surtout récente) → tendances riches ET cohérentes ;
 *        les posts génériques n'ont aucun hashtag plaqué dans le texte.
 * @param author Auteur du post.
 * @returns Document `Post` (compteurs initialisés à 0).
 */
function buildPost(author) {
  const createdAt = postDate();
  const recent = NOW - createdAt.getTime() < 8 * DAY;

  // Posts d'actualité : majoritaires sur les posts récents (alimentent les tendances),
  // plus rares sur les anciens.
  if (chance(recent ? 0.5 : 0.15)) {
    const a = buildActuPost();
    return {
      _id: new mongoose.Types.ObjectId(),
      authorId: author.id,
      authorUsername: author.username,
      content: a.content,
      tags: [...new Set(a.tags)],
      media: [],
      likeCount: 0,
      commentCount: 0,
      createdAt,
      updatedAt: createdAt,
    };
  }

  // Posts « intemporels » : texte, citation, image ou galerie — sans hashtag plaqué.
  const r = Math.random();
  let content; let media = [];
  if (r < 0.55) {
    content = pick(TEXT_POSTS);
  } else if (r < 0.7) {
    const [q, cite] = pick(QUOTES);
    content = `${q} — ${cite}`;
  } else if (r < 0.86) {
    content = pick(IMAGE_CAPTIONS);
    media = [{ url: pick(GRADIENTS), type: 'image' }];
  } else {
    content = pick(IMAGE_CAPTIONS);
    media = [0, 1, 2].map(() => ({ url: pick(GRADIENTS), type: 'image' }));
  }

  return {
    _id: new mongoose.Types.ObjectId(),
    authorId: author.id,
    authorUsername: author.username,
    content,
    tags: [],
    media,
    likeCount: 0,
    commentCount: 0,
    createdAt,
    updatedAt: createdAt,
  };
}

/**
 * @brief Construit le graphe social avec un effet « célébrité » (loi de puissance).
 *        Les comptes vedettes et un noyau d'influenceurs concentrent la majorité des abonnés.
 * @param users Population générée (vedettes en tête de tableau).
 * @returns Tableau de relations `Follow`.
 */
function buildFollows(users) {
  const follows = [];
  const seen = new Set();
  const N = users.length;

  // Pool pondéré : plus un compte a un poids élevé, plus il est tiré comme cible.
  // → vedettes ≈ 700-800 abonnés, influenceurs ≈ 200-300, masse ≈ quelques-uns.
  const INFLUENCERS = Math.min(60, N);
  const pool = [];
  for (let i = 0; i < N; i++) {
    let weight = 1;
    if (i < FEATURED.length) weight = 900;              // stars de la maquette
    else if (i < INFLUENCERS) weight = 260 - i * 3;     // influenceurs (poids dégressif)
    for (let w = 0; w < weight; w++) pool.push(i);
  }

  for (const u of users) {
    const count = 8 + rnd(40); // 8 à 47 abonnements
    let added = 0;
    let attempts = 0;
    while (added < count && attempts < count * 5) {
      attempts++;
      const target = users[pool[rnd(pool.length)]];
      const key = `${u.id}:${target.id}`;
      if (target.id === u.id || seen.has(key)) continue;
      seen.add(key);
      const createdAt = pastDate(120);
      follows.push({ id: randomUUID(), followerId: u.id, followedId: target.id, createdAt, updatedAt: createdAt });
      added++;
    }
  }
  return follows;
}

/**
 * @brief Génère likes et commentaires d'un post et met à jour ses compteurs.
 *        L'engagement croît avec la popularité de l'auteur (nombre d'abonnés).
 * @param post Post cible (compteurs modifiés en place).
 * @param users Population pour tirer les auteurs.
 * @param authorFollowers Nombre d'abonnés de l'auteur.
 * @returns `{ likes, comments }` à insérer.
 */
function buildPostInteractions(post, users, authorFollowers) {
  // Distribution réaliste : les comptes très suivis cartonnent, les petits comptes
  // ont surtout peu de likes — avec quelques posts « viraux » malgré tout.
  let likeTarget;
  const r = Math.random();
  if (authorFollowers > 400) {
    likeTarget = 120 + rnd(330);                         // stars : 120-450 likes
  } else if (authorFollowers > 120) {
    likeTarget = 40 + rnd(150);                          // influenceurs : 40-190
  } else if (authorFollowers > 20) {
    likeTarget = r < 0.1 ? 50 + rnd(110) : 5 + rnd(35);  // confirmés
  } else if (r < 0.04) {
    likeTarget = 80 + rnd(110);                          // petit compte viral
  } else if (r < 0.2) {
    likeTarget = 15 + rnd(45);
  } else if (r < 0.5) {
    likeTarget = 3 + rnd(15);
  } else {
    likeTarget = rnd(4);
  }
  likeTarget = Math.min(likeTarget, users.length - 1);

  const likers = new Set();
  for (let i = 0; i < likeTarget; i++) likers.add(users[rnd(users.length)].id);
  const likes = [...likers].map((userId) => ({
    postId: post._id, userId, createdAt: pastDate(20), updatedAt: new Date(),
  }));
  post.likeCount = likers.size;

  // Commentaires — les posts populaires en ont plus
  const isPopular = post.likeCount >= 5;
  let commentCount;
  if (post.likeCount >= 80) {
    commentCount = 6 + rnd(20);
  } else if (isPopular) {
    commentCount = chance(0.7) ? 2 + rnd(8) : rnd(3);
  } else {
    commentCount = chance(0.4) ? rnd(4) : 0;
  }

  const comments = [];
  for (let i = 0; i < commentCount; i++) {
    const author = users[rnd(users.length)];
    const createdAt = new Date(post.createdAt.getTime() + rnd(3 * DAY));
    comments.push({
      _id: new mongoose.Types.ObjectId(),
      postId: post._id,
      parentCommentId: null,
      authorId: author.id,
      authorUsername: author.username,
      content: pick(COMMENTS),
      createdAt,
      updatedAt: createdAt,
    });
  }
  post.commentCount = commentCount;
  return { likes, comments };
}

/**
 * @brief Construit posts, likes et commentaires pour toute la population.
 *        Le volume de publications dépend de la popularité (les stars publient plus).
 * @param users Population générée.
 * @param followerCount Map id → nombre d'abonnés.
 * @returns `{ posts, likes, comments }`.
 */
function buildContent(users, followerCount) {
  const posts = [];
  for (const u of users) {
    const fc = followerCount.get(u.id) || 0;
    let count;
    if (fc > 400) count = 14 + rnd(12);       // stars : prolifiques
    else if (fc > 120) count = 8 + rnd(10);   // influenceurs
    else if (fc > 20) count = 3 + rnd(8);     // confirmés
    else count = 1 + rnd(6);                  // masse
    for (let i = 0; i < count; i++) posts.push(buildPost(u));
  }
  const likes = [];
  const comments = [];
  for (const post of posts) {
    const fc = followerCount.get(post.authorId) || 0;
    const interactions = buildPostInteractions(post, users, fc);
    likes.push(...interactions.likes);
    comments.push(...interactions.comments);
  }
  return { posts, likes, comments };
}

/**
 * @brief Construit des replies pour les commentaires de posts populaires (>= 5 likes).
 * @param posts Liste de posts (avec likeCount mis à jour).
 * @param comments Liste de commentaires.
 * @param users Population pour tirer les auteurs.
 * @returns Tableau de replies.
 */
function buildReplies(posts, comments, users) {
  const popularPostIds = new Set(
    posts.filter((p) => p.likeCount >= 5).map((p) => p._id.toString())
  );

  const replies = [];
  for (const comment of comments) {
    if (!popularPostIds.has(comment.postId.toString())) continue;
    const replyCount = 1 + rnd(3); // 1 à 3 replies
    for (let i = 0; i < replyCount; i++) {
      let author;
      // Ne pas toujours prendre le même auteur que le commentaire
      do { author = users[rnd(users.length)]; } while (author.id === comment.authorId);
      const createdAt = new Date(comment.createdAt.getTime() + rnd(2 * DAY));
      replies.push({
        commentId: comment._id.toString(),
        postId: comment.postId.toString(),
        authorId: author.id,
        authorUsername: author.username,
        content: pick(REPLIES),
        likes: [],
        createdAt,
        updatedAt: createdAt,
      });
    }
  }
  return replies;
}

/**
 * @brief Construit des stories actives (≤ 24 h) pour un échantillon d'utilisateurs.
 * @param users Population générée.
 * @returns Tableau de stories.
 */
function buildStories(users) {
  const stories = [];
  // Au moins 30 utilisateurs actifs ont une story
  const storyUsers = users.filter((u) => u.status === 'active').slice(0, 160);
  for (const u of storyUsers) {
    const count = 1 + rnd(3);
    for (let i = 0; i < count; i++) {
      const createdAt = new Date(NOW - rnd(20 * 60 * 60 * 1000));
      stories.push({
        authorId: u.id,
        authorUsername: u.username,
        gradient: pick(GRADIENTS),
        text: chance(0.5) ? pick(TEXT_POSTS).slice(0, 80) : '',
        mediaUrl: null,
        expiresAt: new Date(createdAt.getTime() + DAY),
        createdAt,
        updatedAt: createdAt,
      });
    }
  }
  return stories;
}

/**
 * @brief Construit des notifications variées pour les premiers comptes (activité de démo).
 * @param users Population générée.
 * @returns Tableau de notifications.
 */
function buildNotifications(users) {
  const notifs = [];
  const types = ['like', 'comment', 'follow', 'mention'];
  for (const u of users.slice(0, 300)) {
    const count = 2 + rnd(14);
    for (let i = 0; i < count; i++) {
      const actor = users[rnd(users.length)];
      if (actor.id === u.id) continue;
      const type = pick(types);
      const createdAt = pastDate(14);
      let payload = {};
      if (type === 'follow') {
        payload = {};
      } else if (type === 'mention') {
        payload = { excerpt: `@${u.username} ${pick(COMMENTS)}` };
      } else {
        payload = { excerpt: pick(COMMENTS) };
      }
      notifs.push({
        userId: u.id,
        type,
        actor: { id: actor.id, username: actor.username },
        payload,
        read: chance(0.45),
        createdAt,
        updatedAt: createdAt,
      });
    }
  }
  return notifs;
}

/**
 * @brief Orchestration : connexion, garde d'idempotence, génération et insertion par lots.
 */
async function main() {
  console.log('[seeder] Connexion aux bases de données…');
  await connectPgWithRetry();
  await connectMongo();
  await sequelize.sync(); // s'assure que les tables existent

  const existing = await User.count();
  if (existing >= 100 && !FORCE) {
    console.log(`[seeder] ${existing} utilisateurs déjà présents — seeding ignoré (SEED_FORCE=true pour forcer).`);
    return;
  }

  console.log(`[seeder] Génération de ${USER_COUNT} utilisateurs…`);
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const users = buildUsers(passwordHash);
  await User.bulkCreate(users, { ignoreDuplicates: true });
  console.log(`[seeder] ${users.length} utilisateurs insérés`);

  const follows = buildFollows(users);
  for (let i = 0; i < follows.length; i += 5000) {
    await Follow.bulkCreate(follows.slice(i, i + 5000), { ignoreDuplicates: true });
  }
  console.log(`[seeder] ${follows.length} relations de suivi insérées`);

  // Nombre d'abonnés par compte (alimente le volume de posts et l'engagement)
  const followerCount = new Map();
  for (const f of follows) followerCount.set(f.followedId, (followerCount.get(f.followedId) || 0) + 1);
  const topFollowed = [...followerCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, c]) => `@${users.find((u) => u.id === id)?.username}(${c})`).join(', ');
  console.log(`[seeder] Comptes les plus suivis : ${topFollowed}`);

  const { posts, likes, comments } = buildContent(users, followerCount);
  await insertChunks(Post, posts, 4000, 'posts');
  await insertChunks(Like, likes, 5000, 'likes');
  await insertChunks(Comment, comments, 5000, 'commentaires');

  const replies = buildReplies(posts, comments, users);
  await insertChunks(Reply, replies, 5000, 'replies');

  await insertChunks(Story, buildStories(users), 4000, 'stories');
  await insertChunks(Notification, buildNotifications(users), 5000, 'notifications');

  console.log('\n[seeder] ✅ Données de démonstration générées.');
  console.log(`[seeder] Connexion possible avec n'importe quel compte, mot de passe : ${PASSWORD}`);
  console.log(`[seeder] Comptes vedettes : ${FEATURED.map((f) => '@' + f.username).join(', ')}`);
  console.log(`[seeder] Posts générés : ~${posts.length} | Commentaires : ~${comments.length} | Replies : ~${replies.length}`);
}

/** @brief Ferme proprement les connexions aux bases. */
async function shutdown() {
  await sequelize.close().catch(() => {});
  await mongoose.disconnect().catch(() => {});
}

try {
  await main();
} catch (err) {
  console.error('[seeder] Échec :', err);
  process.exitCode = 1;
} finally {
  await shutdown();
}
