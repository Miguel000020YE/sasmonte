/** Alignement caractère par caractère renvoyé par ElevenLabs (endpoint /with-timestamps). */
export interface Alignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

interface Word {
  text: string;
  start: number;
  end: number;
}
interface Cue {
  start: number;
  end: number;
  text: string;
}

// Réglages pensés pour une vidéo verticale 9:16 : cues courtes, une seule ligne lisible.
const MAX_WORDS = 6;
const MAX_CHARS = 32;
const SOFT_BREAK_CHARS = 16; // on coupe volontiers après une virgule si la cue a déjà cette taille
const MAX_DURATION = 3.5; // secondes

const SENTENCE_END = /[.!?…]["»)]*$/;
const SOFT_END = /[,;:]["»)]*$/;
const LONE_PUNCT = /^[?!:;.,…»)]+$/; // ponctuation isolée (typographie française : "Pourquoi ?")

function toWords(a: Alignment): Word[] {
  const words: Word[] = [];
  let cur: Word | null = null;
  for (let i = 0; i < a.characters.length; i++) {
    const ch = a.characters[i];
    const s = a.character_start_times_seconds[i];
    const e = a.character_end_times_seconds[i];
    if (/\s/.test(ch)) {
      if (cur) words.push(cur);
      cur = null;
      continue;
    }
    if (!cur) cur = { text: ch, start: s, end: e };
    else {
      cur.text += ch;
      cur.end = e;
    }
  }
  if (cur) words.push(cur);
  return words;
}

const joined = (ws: Word[]) => ws.map((w) => w.text).join(' ');

function toCues(words: Word[]): Cue[] {
  const cues: Cue[] = [];
  let buf: Word[] = [];
  const flush = () => {
    if (!buf.length) return;
    cues.push({ start: buf[0].start, end: buf[buf.length - 1].end, text: joined(buf) });
    buf = [];
  };
  for (const w of words) {
    if (LONE_PUNCT.test(w.text) && buf.length) {
      buf.push(w); // on colle la ponctuation au mot précédent
    } else {
      const tooLong = buf.length > 0 && `${joined(buf)} ${w.text}`.length > MAX_CHARS;
      if (buf.length && (buf.length >= MAX_WORDS || tooLong || w.end - buf[0].start > MAX_DURATION)) flush();
      buf.push(w);
    }
    if (SENTENCE_END.test(w.text)) flush();
    else if (SOFT_END.test(w.text) && joined(buf).length >= SOFT_BREAK_CHARS) flush();
  }
  flush();
  return cues;
}

const pad = (n: number, l = 2) => String(n).padStart(l, '0');
export function srtTimestamp(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms % 1000, 3)}`;
}

export function buildSrt(alignment: Alignment): string {
  const cues = toCues(toWords(alignment));
  for (let i = 0; i < cues.length; i++) {
    if (i < cues.length - 1 && cues[i].end > cues[i + 1].start) cues[i].end = cues[i + 1].start;
    if (cues[i].end <= cues[i].start) cues[i].end = cues[i].start + 0.3;
  }
  return (
    cues.map((c, i) => `${i + 1}\n${srtTimestamp(c.start)} --> ${srtTimestamp(c.end)}\n${c.text}\n`).join('\n')
  );
}
