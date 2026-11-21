/** Messages d'erreur Supabase Auth en langage simple. */
export function authMessage(err: unknown): string {
  const msg = (err instanceof Error ? err.message : typeof err === 'string' ? err : '').toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (msg.includes('already registered') || msg.includes('already been registered')) return 'Un compte existe déjà avec cet email.';
  if (msg.includes('email not confirmed')) return 'Confirme ton email (lien reçu par mail) avant de te connecter.';
  if (msg.includes('password') && (msg.includes('weak') || msg.includes('at least') || msg.includes('short')))
    return 'Mot de passe trop faible (8 caractères minimum).';
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Trop de tentatives. Patiente quelques minutes puis réessaie.';
  if (msg.includes('same password') || msg.includes('different from the old')) return "Choisis un mot de passe différent de l'ancien.";
  if (msg.includes('network') || msg.includes('fetch')) return 'Connexion impossible. Vérifie ton réseau.';
  return "Impossible de terminer l'opération. Réessaie dans un instant.";
}
