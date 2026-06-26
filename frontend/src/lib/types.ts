/**
 * @file types.ts
 * @brief Types partagés du domaine (utilisateurs, posts, stories, notifications…).
 */
export type Role = 'user' | 'moderator' | 'admin';
export type AccountStatus = 'active' | 'suspended' | 'banned';

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  status: AccountStatus;
  bio: string;
  avatarUrl: string | null;
  language: string;
  theme: string;
  provider?: 'local' | 'google'; // fournisseur d'identité (renvoyé par publicUser côté auth)
  createdAt: string;
  followers?: number;
  following?: number;
  isFollowing?: boolean;
}

export interface Media {
  url: string;
  type: 'image' | 'video';
}

export interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  /** Nom complet de l'auteur (ex. "Ada Lovelace"). Peut être absent sur les anciens posts. */
  authorDisplayName?: string;
  content: string;
  tags: string[];
  media: Media[];
  likeCount: number;
  commentCount: number;
  /** Nombre de repartages. */
  repostCount?: number;
  /** Si ce post est une republication : id du post original, sinon null/absent. */
  repostOf?: string | null;
  /** Nom de l'auteur du post original republié. */
  repostOfUsername?: string | null;
  liked: boolean;
  /** true si l'utilisateur courant a bookmarké ce post. */
  bookmarked: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  parentCommentId: string | null;
  authorId: string;
  authorUsername: string;
  content: string;
  createdAt: string;
}

export interface StoryGroup {
  authorId: string;
  authorUsername: string;
  gradient: string;
  count: number;
  seen: boolean;
}

export interface Story {
  _id: string;
  authorId: string;
  authorUsername: string;
  gradient: string;
  text: string;
  mediaUrl: string | null;
  createdAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'message';
  actor: { id: string; username: string };
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  name?: string;
  participants: { userId: string; username: string; joinedAt: string }[];
  lastMessage?: { content: string; authorUsername: string; sentAt: string };
  isGroup: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  authorId: string;
  authorUsername: string;
  content: string;
  readBy: string[];
  deleted?: boolean;
  createdAt: string;
}

export interface Reply {
  id: string;
  commentId: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  content: string;
  likes: string[];
  createdAt: string;
}

export interface Report {
  _id: string;
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  reason: string;
  reporterUsername: string;
  status: 'open' | 'reviewed' | 'dismissed';
  snapshot: { authorUsername?: string; content?: string };
  createdAt: string;
}
