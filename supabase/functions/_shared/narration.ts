import type { Script } from './schemas.ts';

const ENDS_WITH_PUNCT = /[.!?…:]["»)]*$/;
const ensureEnd = (s: string) => (ENDS_WITH_PUNCT.test(s.trim()) ? s.trim() : `${s.trim()}.`);

/** Texte lu en voix off : hook + développement + appel à l'action, chacun terminé par une ponctuation (pauses naturelles). */
export function narrationText(s: Pick<Script, 'hook' | 'script' | 'cta'>): string {
  return [s.hook, s.script, s.cta].map(ensureEnd).join(' ').replace(/\s+/g, ' ').trim();
}
