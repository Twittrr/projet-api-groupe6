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
import { TEXT_POSTS, QUOTES, IMAGE_CAPTIONS, BIOS, TAGS, GRADIENTS, COMMENTS, REPLIES } from './content.js';

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
 * @brief Construit un post aléatoire (texte, citation, image ou galerie de dégradés).
 * @param author Auteur du post.
 * @returns Document `Post` (compteurs initialisés à 0).
 */
function buildPost(author) {
  const r = Math.random();
  let content; let media = [];
  if (r < 0.55) {
    content = pick(TEXT_POSTS);
  } else if (r < 0.72) {
    const [q, cite] = pick(QUOTES);
    content = `${q} — ${cite}`;
  } else if (r < 0.88) {
    content = pick(IMAGE_CAPTIONS);
    media = [{ url: pick(GRADIENTS), type: 'image' }];
  } else {
    content = pick(IMAGE_CAPTIONS);
    media = [0, 1, 2].map(() => ({ url: pick(GRADIENTS), type: 'image' }));
  }
  const tags = [];
  const nTags = rnd(4);
  for (let i = 0; i < nTags; i++) tags.push(pick(TAGS));
  if (chance(0.35)) content += ` #${pick(TAGS)}`;

  const createdAt = pastDate(60);
  return {
    _id: new mongoose.Types.ObjectId(),
    authorId: author.id,
    authorUsername: author.username,
    content,
    tags: [...new Set(tags)],
    media,
    likeCount: 0,
    commentCount: 0,
    createdAt,
    updatedAt: createdAt,
  };
}

/**
 * @brief Construit le graphe social (5 à 40 abonnements par utilisateur, sans doublon).
 * @param users Population générée.
 * @returns Tableau de relations `Follow`.
 */
function buildFollows(users) {
  const follows = [];
  const seen = new Set();
  for (const u of users) {
    const count = 5 + rnd(35);
    for (let i = 0; i < count; i++) {
      const target = users[rnd(users.length)];
      const key = `${u.id}:${target.id}`;
      if (target.id === u.id || seen.has(key)) continue;
      seen.add(key);
      const createdAt = pastDate(60);
      follows.push({ id: randomUUID(), followerId: u.id, followedId: target.id, createdAt, updatedAt: createdAt });
    }
  }
  return follows;
}

/**
 * @brief Génère likes et commentaires d'un post et met à jour ses compteurs.
 * @param post Post cible (compteurs modifiés en place).
 * @param users Population pour tirer les auteurs.
 * @returns `{ likes, comments }` à insérer.
 */
function buildPostInteractions(post, users) {
  // Likes : distribution réaliste — quelques posts « percent » avec 100+ likes
  let likeTarget;
  const r = Math.random();
  if (r < 0.05) likeTarget = 100 + rnd(80);      // viral
  else if (r < 0.2) likeTarget = 20 + rnd(80);   // populaire
  else if (r < 0.5) likeTarget = 5 + rnd(20);    // moyen
  else likeTarget = rnd(5);                        // peu ou pas de likes

  const likers = new Set();
  for (let i = 0; i < likeTarget; i++) likers.add(users[rnd(users.length)].id);
  const likes = [...likers].map((userId) => ({
    postId: post._id, userId, createdAt: pastDate(20), updatedAt: new Date(),
  }));
  post.likeCount = likers.size;

  // Commentaires — les posts populaires en ont plus
  const isPopular = post.likeCount >= 5;
  let commentCount;
  if (isPopular) {
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
 * @param users Population générée.
 * @returns `{ posts, likes, comments }`.
 */
function buildContent(users) {
  const posts = [];
  for (const u of users) {
    const isFeatured = FEATURED.some((f) => u.username === f.username);
    // Les vedettes postent davantage ; les autres entre 0 et 12 posts
    const count = isFeatured ? 10 + rnd(10) : 1 + rnd(11);
    for (let i = 0; i < count; i++) posts.push(buildPost(u));
  }
  const likes = [];
  const comments = [];
  for (const post of posts) {
    const interactions = buildPostInteractions(post, users);
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

  const { posts, likes, comments } = buildContent(users);
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
