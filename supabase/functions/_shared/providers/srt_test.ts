import { assertEquals } from 'jsr:@std/assert@1';
import { buildSrt, srtTimestamp, type Alignment } from './srt.ts';

/** Construit un alignement synthétique : chaque caractère dure 0,05 s. */
function align(text: string): Alignment {
  const chars = [...text];
  return {
    characters: chars,
    character_start_times_seconds: chars.map((_, i) => i * 0.05),
    character_end_times_seconds: chars.map((_, i) => (i + 1) * 0.05),
  };
}

Deno.test('timestamps SRT', () => {
  assertEquals(srtTimestamp(0), '00:00:00,000');
  assertEquals(srtTimestamp(61.5), '00:01:01,500');
  assertEquals(srtTimestamp(3723.004), '01:02:03,004');
});

Deno.test('coupe aux fins de phrase et colle la ponctuation isolée', () => {
  const srt = buildSrt(align('Pourquoi ? Parce que tu travailles trop. Écoute bien.'));
  const blocks = srt.trim().split('\n\n');
  assertEquals(blocks[0].split('\n')[2], 'Pourquoi ?');
  assertEquals(blocks.at(-1)!.split('\n')[2], 'Écoute bien.');
});

Deno.test('cues courtes et sans chevauchement', () => {
  const srt = buildSrt(align('Un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize.'));
  const blocks = srt.trim().split('\n\n');
  for (const b of blocks) assertEquals(b.split('\n')[2].length <= 40, true);
  const times = blocks.map((b) => b.split('\n')[1].split(' --> '));
  for (let i = 1; i < times.length; i++) assertEquals(times[i - 1][1] <= times[i][0], true);
});
