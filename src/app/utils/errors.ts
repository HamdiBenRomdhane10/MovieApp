/** Transforme une erreur Firebase / réseau en message compréhensible en français. */
export function errorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const known: Record<string, string> = {
    'auth/invalid-credential': 'Email ou mot de passe incorrect.',
    'auth/user-not-found': 'Email ou mot de passe incorrect.',
    'auth/wrong-password': 'Email ou mot de passe incorrect.',
    'auth/invalid-email': "Cette adresse email n'est pas valide.",
    'auth/email-already-in-use': 'Un compte existe déjà avec cet email.',
    'auth/weak-password': 'Mot de passe trop faible (6 caractères minimum).',
    'auth/too-many-requests': 'Trop de tentatives. Réessaie dans quelques minutes.',
    'auth/network-request-failed': 'Pas de connexion internet.',
    'permission-denied': "Action refusée. Vérifie les règles Firestore et tes droits.",
    unavailable: 'Serveur injoignable. Vérifie ta connexion.',
  };
  if (known[code]) return known[code];
  if (e instanceof Error && e.message) return e.message;
  return 'Une erreur est survenue. Réessaie.';
}
