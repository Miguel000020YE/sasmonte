import type { Script } from '@/types/database';

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const saveText = (text: string, filename: string, mime = 'text/plain;charset=utf-8') =>
  saveBlob(new Blob([text], { type: mime }), filename);

/** Télécharge un fichier distant (URL signée) ; à défaut, l'ouvre dans un nouvel onglet. */
export async function saveFromUrl(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('download');
    saveBlob(await res.blob(), filename);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}

export const safeFilename = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'video';

export const scriptToText = (s: Script) =>
  `${s.titre}\n\n${s.hook}\n\n${s.script}\n\n${s.cta}\n\n${s.hashtags.join(' ')}\n`;

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
