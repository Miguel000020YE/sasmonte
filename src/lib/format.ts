const nf = new Intl.NumberFormat('fr-FR');

/** 8000 -> "8 000 F" */
export const formatFcfa = (n: number) => `${nf.format(n)} F`;
export const formatEur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
export const videosLabel = (n: number) => `${nf.format(n)} vidéo${n > 1 ? 's' : ''}`;
export const creditsLabel = (n: number) => `${nf.format(n)} crédit${n > 1 ? 's' : ''}`;
