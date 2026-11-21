export interface Testimonial {
  name: string;
  role: string;
  text: string;
}

/**
 * TODO : remplace par de VRAIS témoignages de tes premiers utilisateurs (avec leur accord).
 * Tant que ce tableau est vide, la section "Témoignages" n'est pas affichée.
 * Exemple de forme : { name: 'Prénom', role: 'Créateur TikTok, Abidjan', text: '...' }
 */
export const TESTIMONIALS: Testimonial[] = [];

export const FAQ: { q: string; a: string }[] = [
  { q: "Qu'est-ce qu'un crédit ?", a: "1 crédit = 1 vidéo générée : un script accrocheur, une voix off en MP3 et les sous-titres au format SRT." },
  { q: 'Dois-je montrer mon visage ?', a: "Non. Les vidéos « faceless » se font avec la voix off sur des images ou des vidéos d'illustration. Tu montes le tout dans ton application de montage préférée." },
  { q: "Que se passe-t-il si la génération échoue ?", a: "Ton crédit est remboursé automatiquement et tu le vois dans l'historique de « Mon compte »." },
  { q: 'Comment fonctionne la recherche inversée ?', a: "Tu envoies une capture d'écran d'une vidéo virale. Nous retrouvons sa source avec Google Lens, puis l'IA écrit une version originale inspirée du même thème." },
  { q: 'Comment payer ?', a: "Par Mobile Money dans les pays d'Afrique de l'Ouest couverts, ou par carte bancaire ailleurs. Les crédits s'achètent en packs." },
  { q: 'Y a-t-il une limite de génération ?', a: "Oui : 10 générations par heure et par utilisateur, pour garder un service rapide pour tout le monde." },
  { q: 'Puis-je essayer gratuitement ?', a: "Oui : 2 crédits sont offerts à l'inscription." },
];
