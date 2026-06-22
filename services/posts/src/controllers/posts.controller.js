/**
 * @file posts.controller.js
 * @brief Posts : création, flux, exploration, détail, édition, likes, bookmarks, commentaires (threads).
 */
import { Post }     from '../models/post.model.js';
import { Comment }  from '../models/comment.model.js';
import { Like }     from '../models/like.model.js';
import { Reply }    from '../models/reply.model.js';
import { Bookmark } from '../models/bookmark.model.js';
import { ok, created, AppError } from '../utils/response.js';
import { getFollowingIds, emitNotification, getMentionedUserIds } from '../utils/services.js';

const PAGE = 20;

/**
 * @brief Valide et parse le curseur de pagination temporel.
 * @throws AppError 400 si la valeur n'est pas une date ISO valide.
 */
function parseCursor(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new AppError(400, 'BAD_REQUEST', 'Curseur de pagination invalide (format ISO 8601 requis).');
  }
  return d;
}

function extractTags(content, explicit = []) {
  const fromContent = (content.match(/#(\w{1,30})/g) || []).map((t) => t.slice(1).toLowerCase());
  return [...new Set([...(explicit || []).map((t) => t.toLowerCase()), ...fromContent])];
}

/**
 * @brief Sérialise un ou plusieurs posts avec les flags `liked` et `bookmarked` du lecteur.
 * Utilise deux requêtes $in (pas de N+1) pour les likes et les bookmarks.
 */
async function serialize(posts, viewerId) {
  const list = Array.isArray(posts) ? posts : [posts];
  let likedSet     = new Set();
  let bookmarkedSet = new Set();

  if (viewerId && list.length) {
    const postIds = list.map((p) => p._id);
    const postIdStrs = list.map((p) => p._id.toString());
    const [likes, bookmarks] = await Promise.all([
      Like.find({ userId: viewerId, postId: { $in: postIds } }).select('postId'),
      Bookmark.find({ userId: viewerId, postId: { $in: postIdStrs } }).select('postId'),
    ]);
    likedSet      = new Set(likes.map((l) => l.postId.toString()));
    bookmarkedSet = new Set(bookmarks.map((b) => b.postId.toString()));
  }

  const mapped = list.map((p) => ({
    id:              p._id,
    authorId:        p.authorId,
    authorUsername:  p.authorUsername,
    content:         p.content,
    tags:            p.tags,
    media:           p.media,
    likeCount:       p.likeCount,
    commentCount:    p.commentCount,
    liked:           likedSet.has(p._id.toString()),
    bookmarked:      bookmarkedSet.has(p._id.toString()),
    createdAt:       p.createdAt,
  }));
  return Array.isArray(posts) ? mapped : mapped[0];
}

/** @brief Fx3 — Publie un message court (≤ 280) avec tags et médias optionnels. */
export async function createPost(req, res) {
  const { content, media } = req.body;
  const tags = extractTags(content, req.body.tags);
  const post = await Post.create({
    authorId: req.user.id,
    authorUsername: req.user.username,
    content,
    tags,
    media: media || [],
  });
  // Fx14 — notifications @mentions
  const mentionIds = await getMentionedUserIds(content, req.user.id);
  mentionIds.forEach((uid) => emitNotification({
    userId: uid,
    type: 'mention',
    actor: { id: req.user.id, username: req.user.username },
    payload: { postId: post._id.toString(), excerpt: content.slice(0, 100) },
  }));
  return created(res, { post: await serialize(post, req.user.id) });
}

/** @brief Fx5 — Flux chronologique des utilisateurs suivis (et de soi-même). */
export async function getFeed(req, res) {
  const before = parseCursor(req.query.before);
  const following = await getFollowingIds(req.user.id);
  const authors = [...new Set([req.user.id, ...following])];
  const filter = { authorId: { $in: authors } };
  if (before) filter.createdAt = { $lt: before };
  const posts = await Post.find(filter).sort({ createdAt: -1 }).limit(PAGE);
  return ok(res, { posts: await serialize(posts, req.user.id) }, { count: posts.length });
}

/** @brief Explorer — posts récents de toute la plateforme. */
export async function getExplore(req, res) {
  const before = parseCursor(req.query.before);
  const filter = before ? { createdAt: { $lt: before } } : {};
  const posts = await Post.find(filter).sort({ createdAt: -1 }).limit(PAGE);
  return ok(res, { posts: await serialize(posts, req.user?.id) }, { count: posts.length });
}

/** @brief Fx4 — Détail d'un post. */
export async function getPost(req, res) {
  const post = await Post.findById(req.params.id);
  if (!post) throw new AppError(404, 'NOT_FOUND', 'Post introuvable.');
  return ok(res, { post: await serialize(post, req.user?.id) });
}

/** @brief Fx11 — Liste paginée des posts d'un utilisateur (onglet profil). */
export async function getUserPosts(req, res) {
  const before = parseCursor(req.query.before);
  const filter = { authorId: req.params.userId };
  if (before) filter.createdAt = { $lt: before };
  const posts = await Post.find(filter).sort({ createdAt: -1 }).limit(PAGE);
  return ok(res, { posts: await serialize(posts, req.user?.id) });
}

/** @brief Fx13 — Recherche de posts par tag. */
export async function getByTag(req, res) {
  const tag = req.params.tag.toLowerCase();
  const before = parseCursor(req.query.before);
  const filter = { tags: tag };
  if (before) filter.createdAt = { $lt: before };
  const posts = await Post.find(filter).sort({ createdAt: -1 }).limit(PAGE);
  return ok(res, { posts: await serialize(posts, req.user?.id), tag });
}

/** @brief Tags tendances des 7 derniers jours (agrégation MongoDB). */
export async function trendingTags(_req, res) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const tags = await Post.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
  return ok(res, { tags: tags.map((t) => ({ tag: t._id, count: t.count })) });
}

/** @brief Fx4 — Modifie le contenu d'un post (auteur uniquement). */
export async function updatePost(req, res) {
  const post = await Post.findById(req.params.id);
  if (!post) throw new AppError(404, 'NOT_FOUND', 'Post introuvable.');
  if (post.authorId !== req.user.id) throw new AppError(403, 'FORBIDDEN', 'Vous ne pouvez modifier que vos posts.');
  post.content = req.body.content;
  post.tags = extractTags(req.body.content, post.tags);
  await post.save();
  return ok(res, { post: await serialize(post, req.user.id) });
}

/** @brief Supprime un post et ses commentaires/likes/bookmarks (auteur, ou modérateur/admin). */
export async function deletePost(req, res) {
  const post = await Post.findById(req.params.id);
  if (!post) throw new AppError(404, 'NOT_FOUND', 'Post introuvable.');
  const isModerator = ['moderator', 'admin'].includes(req.user.role);
  if (post.authorId !== req.user.id && !isModerator) {
    throw new AppError(403, 'FORBIDDEN', 'Droits insuffisants.');
  }
  await Promise.all([
    Post.deleteOne({ _id: post._id }),
    Comment.deleteMany({ postId: post._id }),
    Like.deleteMany({ postId: post._id }),
    Bookmark.deleteMany({ postId: post._id.toString() }),
  ]);
  return ok(res, { deleted: true });
}

/**
 * @brief Fx6 — Like un post (idempotent) et notifie l'auteur (Fx15).
 * Utilise $inc atomique pour éviter les race conditions sur likeCount.
 */
export async function likePost(req, res) {
  const post = await Post.findById(req.params.id);
  if (!post) throw new AppError(404, 'NOT_FOUND', 'Post introuvable.');
  try {
    await Like.create({ postId: post._id, userId: req.user.id });
    const updated = await Post.findByIdAndUpdate(
      post._id,
      { $inc: { likeCount: 1 } },
      { new: true }
    );
    emitNotification({
      userId: post.authorId,
      type: 'like',
      actor: { id: req.user.id, username: req.user.username },
      payload: { postId: post._id.toString(), excerpt: post.content.slice(0, 60) },
    });
    return ok(res, { liked: true, likeCount: updated.likeCount });
  } catch (err) {
    if (err.code !== 11000) throw err; // déjà liké : idempotent
    return ok(res, { liked: true, likeCount: post.likeCount });
  }
}

/** @brief Retire le like de l'utilisateur courant. */
export async function unlikePost(req, res) {
  const post = await Post.findById(req.params.id);
  if (!post) throw new AppError(404, 'NOT_FOUND', 'Post introuvable.');
  const del = await Like.deleteOne({ postId: post._id, userId: req.user.id });
  let likeCount = post.likeCount;
  if (del.deletedCount > 0) {
    const updated = await Post.findByIdAndUpdate(
      post._id,
      { $inc: { likeCount: -1 } },
      { new: true }
    );
    likeCount = updated.likeCount;
  }
  return ok(res, { liked: false, likeCount });
}

/**
 * @brief Enregistre un post dans les favoris de l'utilisateur (idempotent).
 */
export async function bookmarkPost(req, res) {
  const post = await Post.findById(req.params.id);
  if (!post) throw new AppError(404, 'NOT_FOUND', 'Post introuvable.');
  try {
    await Bookmark.create({ userId: req.user.id, postId: post._id.toString() });
  } catch (err) {
    if (err.code !== 11000) throw err; // déjà bookmarké : idempotent
  }
  return ok(res, { bookmarked: true });
}

/**
 * @brief Retire un post des favoris de l'utilisateur.
 */
export async function unbookmarkPost(req, res) {
  await Bookmark.deleteOne({ userId: req.user.id, postId: req.params.id });
  return ok(res, { bookmarked: false });
}

/** @brief Fx7/Fx8 — Liste les commentaires d'un post (paginés, max 50). */
export async function listComments(req, res) {
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit) || 50));
  const page  = Math.max(1, Number.parseInt(req.query.page) || 1);
  const skip  = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    Comment.find({ postId: req.params.id }).sort({ createdAt: 1 }).skip(skip).limit(limit),
    Comment.countDocuments({ postId: req.params.id }),
  ]);
  return ok(res, {
    comments: comments.map((c) => ({
      id:              c._id,
      postId:          c.postId,
      parentCommentId: c.parentCommentId,
      authorId:        c.authorId,
      authorUsername:  c.authorUsername,
      content:         c.content,
      createdAt:       c.createdAt,
    })),
  }, { page, limit, total, pages: Math.ceil(total / limit) });
}

/**
 * @brief Fx7/Fx8 — Ajoute une réponse à un post et notifie l'auteur.
 * Utilise $inc atomique pour commentCount.
 */
export async function createComment(req, res) {
  const post = await Post.findById(req.params.id);
  if (!post) throw new AppError(404, 'NOT_FOUND', 'Post introuvable.');
  const comment = await Comment.create({
    postId:          post._id,
    parentCommentId: req.body.parentCommentId || null,
    authorId:        req.user.id,
    authorUsername:  req.user.username,
    content:         req.body.content,
  });
  await Post.updateOne({ _id: post._id }, { $inc: { commentCount: 1 } });

  emitNotification({
    userId: post.authorId,
    type: 'comment',
    actor:   { id: req.user.id, username: req.user.username },
    payload: { postId: post._id.toString(), excerpt: req.body.content.slice(0, 60) },
  });
  // Fx14 — @mentions dans le commentaire
  const mentionIds = await getMentionedUserIds(req.body.content, req.user.id);
  mentionIds.forEach((uid) => emitNotification({
    userId: uid,
    type: 'mention',
    actor: { id: req.user.id, username: req.user.username },
    payload: { postId: post._id.toString(), excerpt: req.body.content.slice(0, 100) },
  }));
  return created(res, {
    comment: {
      id:              comment._id,
      postId:          comment.postId,
      parentCommentId: comment.parentCommentId,
      authorId:        comment.authorId,
      authorUsername:  comment.authorUsername,
      content:         comment.content,
      createdAt:       comment.createdAt,
    },
  });
}

/** @brief Supprime un commentaire et décrémente le compteur. */
export async function deleteComment(req, res) {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) throw new AppError(404, 'NOT_FOUND', 'Commentaire introuvable.');
  const isModerator = ['moderator', 'admin'].includes(req.user.role);
  if (comment.authorId !== req.user.id && !isModerator) {
    throw new AppError(403, 'FORBIDDEN', 'Droits insuffisants.');
  }
  await Comment.deleteOne({ _id: comment._id });
  await Post.updateOne({ _id: comment.postId }, { $inc: { commentCount: -1 } });
  return ok(res, { deleted: true });
}

// ─── Replies ────────────────────────────────────────────────────────────────

/** @brief Liste les replies d'un commentaire. */
export async function listReplies(req, res) {
  const replies = await Reply.find({ commentId: req.params.commentId }).sort({ createdAt: 1 });
  return ok(res, {
    replies: replies.map((r) => ({
      id:             r._id,
      commentId:      r.commentId,
      postId:         r.postId,
      authorId:       r.authorId,
      authorUsername: r.authorUsername,
      content:        r.content,
      likes:          r.likes,
      createdAt:      r.createdAt,
    })),
  });
}

/**
 * @brief Crée une reply sur un commentaire, notifie l'auteur du commentaire,
 * et décrémente le commentCount du post parent (replies ≠ commentaires de premier niveau).
 */
export async function createReply(req, res) {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) throw new AppError(404, 'NOT_FOUND', 'Commentaire introuvable.');

  const reply = await Reply.create({
    commentId:      comment._id.toString(),
    postId:         comment.postId.toString(),
    authorId:       req.user.id,
    authorUsername: req.user.username,
    content:        req.body.content,
  });

  if (comment.authorId !== req.user.id) {
    emitNotification({
      userId: comment.authorId,
      type:   'comment',
      actor:   { id: req.user.id, username: req.user.username },
      payload: { postId: comment.postId.toString(), excerpt: req.body.content.slice(0, 60) },
    });
  }
  // Fx14 — @mentions dans la reply
  const mentionIds = await getMentionedUserIds(req.body.content, req.user.id);
  mentionIds.forEach((uid) => emitNotification({
    userId: uid,
    type: 'mention',
    actor: { id: req.user.id, username: req.user.username },
    payload: { postId: comment.postId.toString(), excerpt: req.body.content.slice(0, 100) },
  }));

  return created(res, {
    reply: {
      id:             reply._id,
      commentId:      reply.commentId,
      postId:         reply.postId,
      authorId:       reply.authorId,
      authorUsername: reply.authorUsername,
      content:        reply.content,
      likes:          reply.likes,
      createdAt:      reply.createdAt,
    },
  });
}

/** @brief Supprime une reply et décrémente le commentCount du post parent. */
export async function deleteReply(req, res) {
  const reply = await Reply.findById(req.params.replyId);
  if (!reply) throw new AppError(404, 'NOT_FOUND', 'Reply introuvable.');
  if (reply.commentId !== req.params.commentId) {
    throw new AppError(404, 'NOT_FOUND', 'Reply introuvable.');
  }
  const isModerator = ['moderator', 'admin'].includes(req.user.role);
  if (reply.authorId !== req.user.id && !isModerator) {
    throw new AppError(403, 'FORBIDDEN', 'Droits insuffisants.');
  }
  await Reply.deleteOne({ _id: reply._id });
  // Décrémente le compteur du post parent (bug BUG-2 corrigé)
  await Post.updateOne({ _id: reply.postId }, { $inc: { commentCount: -1 } });
  return ok(res, { deleted: true });
}
