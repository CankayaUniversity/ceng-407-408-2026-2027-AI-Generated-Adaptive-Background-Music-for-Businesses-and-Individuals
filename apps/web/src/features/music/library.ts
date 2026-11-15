/**
 * The venue's track library (mock). The real "closest tracks" lookup is a SQL
 * Euclidean-distance query in the API (music/library); this mirrors it so the
 * preview behaves the same.
 */

import type {MoodVector} from '../mood/types';
import type {Track} from '../player/types';
import {nowPlaying, queue} from '../dashboard/mockData';

export const libraryTracks: Track[] = [
  nowPlaying,
  ...queue,
  {
    id: 't-07',
    title: 'Morning Linen',
    credit: 'Moodtrack AI',
    durationSec: 176,
    mood: {valence: 0.55, energy: -0.45, texture: -0.7},
    prompt: '76 BPM, C major, felt piano, soft strings, neo-classical, instrumental',
  },
  {
    id: 't-08',
    title: 'Rainy Window',
    credit: 'Moodtrack AI',
    durationSec: 212,
    mood: {valence: -0.35, energy: -0.5, texture: -0.4},
    prompt: '70 BPM, A minor, nylon guitar, cello, ambient jazz, instrumental',
  },
  {
    id: 't-09',
    title: 'Lunch Bell',
    credit: 'Moodtrack AI',
    durationSec: 168,
    mood: {valence: 0.7, energy: 0.65, texture: 0.0},
    prompt: '118 BPM, G major, upright piano, horns, swing jazz, instrumental',
  },
  {
    id: 't-10',
    title: 'Glass District',
    credit: 'Moodtrack AI',
    durationSec: 244,
    mood: {valence: 0.15, energy: 0.55, texture: 0.85},
    prompt: '122 BPM, F minor, analog synths, four-on-the-floor kick, deep house',
  },
  {
    id: 't-11',
    title: 'Slow Steps',
    credit: 'Moodtrack AI',
    durationSec: 230,
    mood: {valence: -0.1, energy: -0.7, texture: 0.3},
    prompt: '68 BPM, D minor, evolving pads, glassy keys, downtempo, instrumental',
  },
];

export function moodDistance(a: MoodVector, b: MoodVector): number {
  return Math.hypot(a.valence - b.valence, a.energy - b.energy, a.texture - b.texture);
}

/** Tracks ordered by mood distance; `match` is 100% for identical moods. */
export function closestTracks(mood: MoodVector, count = 3) {
  // The largest possible distance in the [-1, 1]^3 cube.
  const maxDistance = Math.sqrt(12);
  return libraryTracks
    .map(track => {
      const distance = moodDistance(mood, track.mood);
      return {track, distance, match: Math.round((1 - distance / maxDistance) * 100)};
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}
