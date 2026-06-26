/**
 * @file i18n.ts
 * @brief Dictionnaires de traduction FR/EN et utilitaire translate() (Fx22).
 */

export type Lang = 'fr' | 'en';

const fr = {
  // Navigation desktop
  'nav.feed':         'Fil',
  'nav.explore':      'Explorer',
  'nav.notifications':'Notifications',
  'nav.messages':     'Messages',
  'nav.profile':      'Profil',
  'nav.settings':     'Réglages',
  'nav.moderation':   'Modération',
  'nav.publish':      'Publier',
  'nav.signIn':       'Se connecter',
  // Navigation mobile
  'nav.home':         'Accueil',
  'nav.activity':     'Activité',

  // Fil d'actualités
  'feed.forYou':           'Pour toi',
  'feed.following':        'Abonnements',
  'feed.loading':          'Chargement du fil…',
  'feed.empty.following':  'Votre fil est vide.',
  'feed.empty.explore':    'Rien à explorer pour le moment.',
  'feed.discover':         'Découvrir « Pour toi » →',
  'feed.error':            'Impossible de charger le fil.',

  // Actions sur un post
  'post.like':        'Aimer',
  'post.comment':     'Répondre',
  'post.bookmark':    'Enregistrer',
  'post.report':      'Signaler ce post',
  'post.public':      'public',

  // Profil
  'profile.edit':          'Modifier',
  'profile.follow':        'Suivre',
  'profile.following':     'Suivi',
  'profile.unfollow':      'Se désabonner',
  'profile.followings':    'abonnements',
  'profile.followers':     'abonnés',
  'profile.noPosts':       'Aucune publication.',
  'profile.notFound':      'Utilisateur introuvable',
  'profile.back':          'Retour',
  'profile.followersList': 'Abonnés',
  'profile.followingsList':'Abonnements',
  'profile.noFollowers':   'Aucun abonné.',
  'profile.noFollowing':   'Aucun abonnement.',
  'profile.loading':       'Chargement…',

  // Notifications
  'notif.title':   'Activité',
  'notif.empty':   'Aucune notification.',
  'notif.like':    'a aimé votre message',
  'notif.comment': 'a répondu à votre message',
  'notif.follow':  'a commencé à vous suivre',
  'notif.mention': 'vous a mentionné',
  'notif.message': 'vous a envoyé un message',
  'notif.repost':  'a republié votre message',

  // Préférences de notification (libellés courts pour les réglages)
  'settings.notifications': 'Notifications',
  'settings.notifSaved':    'Préférences enregistrées ✓',
  'notifPref.like':    'J’aime',
  'notifPref.comment': 'Commentaires',
  'notifPref.follow':  'Nouveaux abonnés',
  'notifPref.mention': 'Mentions',
  'notifPref.message': 'Messages',
  'notifPref.repost':  'Republications',

  // Paramètres
  'settings.title':       'Réglages',
  'settings.appearance':  'Apparence',
  'settings.darkMode':    'Mode sombre',
  'settings.language':    'Langue',
  'settings.langFr':      'Français',
  'settings.langEn':      'English',
  'settings.profile':     'Profil',
  'settings.displayName': 'Nom affiché',
  'settings.bio':         'Biographie',
  'settings.save':        'Enregistrer',
  'settings.saved':       'Profil enregistré ✓',
  'settings.admin':       'Administration',
  'settings.modQueue':    'File de modération',
  'settings.logout':      'Se déconnecter',

  // Compose
  'compose.published': 'Note publiée ✓',

  // Communs
  'common.loading': 'Chargement…',
  'common.cancel':  'Annuler',
  'common.back':    'Retour',

  // Dates relatives
  'time.now': "à l'instant",
  'time.min': 'min',
  'time.h':   'h',
  'time.d':   'j',
} as const;

const en: Record<keyof typeof fr, string> = {
  // Navigation desktop
  'nav.feed':         'Feed',
  'nav.explore':      'Explore',
  'nav.notifications':'Notifications',
  'nav.messages':     'Messages',
  'nav.profile':      'Profile',
  'nav.settings':     'Settings',
  'nav.moderation':   'Moderation',
  'nav.publish':      'Post',
  'nav.signIn':       'Sign in',
  // Navigation mobile
  'nav.home':         'Home',
  'nav.activity':     'Activity',

  // Feed
  'feed.forYou':           'For you',
  'feed.following':        'Following',
  'feed.loading':          'Loading feed…',
  'feed.empty.following':  'Your feed is empty.',
  'feed.empty.explore':    'Nothing to explore yet.',
  'feed.discover':         'Discover "For you" →',
  'feed.error':            'Could not load feed.',

  // Post actions
  'post.like':     'Like',
  'post.comment':  'Reply',
  'post.bookmark': 'Bookmark',
  'post.report':   'Report post',
  'post.public':   'public',

  // Profile
  'profile.edit':          'Edit',
  'profile.follow':        'Follow',
  'profile.following':     'Following',
  'profile.unfollow':      'Unfollow',
  'profile.followings':    'following',
  'profile.followers':     'followers',
  'profile.noPosts':       'No posts yet.',
  'profile.notFound':      'User not found',
  'profile.back':          'Back',
  'profile.followersList': 'Followers',
  'profile.followingsList':'Following',
  'profile.noFollowers':   'No followers yet.',
  'profile.noFollowing':   'Not following anyone yet.',
  'profile.loading':       'Loading…',

  // Notifications
  'notif.title':   'Activity',
  'notif.empty':   'No notifications yet.',
  'notif.like':    'liked your post',
  'notif.comment': 'replied to your post',
  'notif.follow':  'started following you',
  'notif.mention': 'mentioned you',
  'notif.message': 'sent you a message',
  'notif.repost':  'reposted your post',

  // Notification preferences (short labels for settings)
  'settings.notifications': 'Notifications',
  'settings.notifSaved':    'Preferences saved ✓',
  'notifPref.like':    'Likes',
  'notifPref.comment': 'Comments',
  'notifPref.follow':  'New followers',
  'notifPref.mention': 'Mentions',
  'notifPref.message': 'Messages',
  'notifPref.repost':  'Reposts',

  // Settings
  'settings.title':       'Settings',
  'settings.appearance':  'Appearance',
  'settings.darkMode':    'Dark mode',
  'settings.language':    'Language',
  'settings.langFr':      'Français',
  'settings.langEn':      'English',
  'settings.profile':     'Profile',
  'settings.displayName': 'Display name',
  'settings.bio':         'Biography',
  'settings.save':        'Save',
  'settings.saved':       'Profile saved ✓',
  'settings.admin':       'Administration',
  'settings.modQueue':    'Moderation queue',
  'settings.logout':      'Sign out',

  // Compose
  'compose.published': 'Post published ✓',

  // Common
  'common.loading': 'Loading…',
  'common.cancel':  'Cancel',
  'common.back':    'Back',

  // Relative time
  'time.now': 'just now',
  'time.min': 'min',
  'time.h':   'h',
  'time.d':   'd',
};

const translations: Record<Lang, Record<keyof typeof fr, string>> = { fr, en };

export type TKey = keyof typeof fr;

export function translate(lang: Lang, key: TKey): string {
  return translations[lang]?.[key] ?? translations.fr[key] ?? key;
}
