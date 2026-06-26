/**
 * @file posts.routes.js
 * @brief Routes du service Posts (`/api/posts/*`) : posts, stories, likes, commentaires, signalements.
 */
import { Router } from 'express';
import * as posts from '../controllers/posts.controller.js';
import * as reports from '../controllers/reports.controller.js';
import * as stories from '../controllers/stories.controller.js';
import { uploadMiddleware, handleUpload } from '../controllers/upload.controller.js';
import { authenticate, optionalAuth, requireRole, validate, ah } from '../middleware/common.js';
import {
  createPostSchema, updatePostSchema, createCommentSchema, createReportSchema, resolveReportSchema,
  createReplySchema,
} from '../validators/posts.schema.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ data: { status: 'ok', service: 'posts' }, error: null }));

// --- Stories (rail du fil) ---
router.get('/stories', optionalAuth, ah(stories.listStories));
router.get('/stories/:authorId', optionalAuth, ah(stories.getUserStories));
router.post('/stories', authenticate, ah(stories.createStory));

// --- Découverte ---
router.get('/feed', authenticate, ah(posts.getFeed));            // Fx5
router.get('/explore', optionalAuth, ah(posts.getExplore));
router.get('/tags/trending', ah(posts.trendingTags));
router.get('/tag/:tag', optionalAuth, ah(posts.getByTag));       // Fx13
router.get('/user/:userId', optionalAuth, ah(posts.getUserPosts)); // Fx11

// --- Recherche plein-texte (avant /:id pour éviter la capture) ---
router.get('/search', optionalAuth, ah(posts.searchPosts));

// --- Signalements & modération (avant /:id) ---
router.post('/reports', authenticate, validate(createReportSchema), ah(reports.createReport)); // Fx20
router.get('/reports', authenticate, requireRole('moderator', 'admin'), ah(reports.listReports));
router.patch('/reports/:id', authenticate, requireRole('moderator', 'admin'), validate(resolveReportSchema), ah(reports.resolveReport));

// --- Upload média ---
router.post('/upload', authenticate, uploadMiddleware, ah(handleUpload)); // Fx18 / Fx19

// --- Replies (avant /:id pour éviter la capture par la route générique) ---
router.get('/comments/:commentId/replies', optionalAuth, ah(posts.listReplies));
router.post('/comments/:commentId/replies', authenticate, validate(createReplySchema), ah(posts.createReply));
router.delete('/comments/:commentId/replies/:replyId', authenticate, ah(posts.deleteReply));

// --- CRUD posts ---
router.post('/', authenticate, validate(createPostSchema), ah(posts.createPost)); // Fx3
router.get('/:id', optionalAuth, ah(posts.getPost));             // Fx4
router.patch('/:id', authenticate, validate(updatePostSchema), ah(posts.updatePost));
router.delete('/:id', authenticate, ah(posts.deletePost));

// --- Republication ---
router.post('/:id/repost', authenticate, ah(posts.repostPost));

// --- Likes (Fx6) ---
router.post('/:id/like',     authenticate, ah(posts.likePost));
router.delete('/:id/like',   authenticate, ah(posts.unlikePost));

// --- Bookmarks ---
router.post('/:id/bookmark',   authenticate, ah(posts.bookmarkPost));
router.delete('/:id/bookmark', authenticate, ah(posts.unbookmarkPost));

// --- Commentaires (Fx7 / Fx8) ---
router.get('/:id/comments', optionalAuth, ah(posts.listComments));
router.post('/:id/comments', authenticate, validate(createCommentSchema), ah(posts.createComment));
router.delete('/:id/comments/:commentId', authenticate, ah(posts.deleteComment));

export default router;
