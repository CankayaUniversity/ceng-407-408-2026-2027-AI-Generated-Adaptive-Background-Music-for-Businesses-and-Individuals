/**
 * Mock data for the dashboard until the API exists. Swap these for API calls;
 * the shapes already follow `features/mood/types.ts` and `features/player/types.ts`.
 */

import type {MoodAnalysis, MoodHistoryPoint} from '../mood/types';
import type {Track} from '../player/types';

export const currentUser = {
  firstName: 'User',
};

export const currentVenue = {
  name: 'Demo Café',
  plan: 'Business Plan',
};

export const currentAnalysis: MoodAnalysis = {
  mood: {valence: 0.68, energy: 0.34, texture: -0.21},
  summary: 'A dimly lit, warm evening café with a moderate crowd.',
  tags: ['evening', 'warm light', 'moderate crowd', 'lounge'],
  scene: {
    venueType: 'Café',
    crowd: 'Moderate',
    lighting: 'Dim / Warm',
    timeOfDay: 'Evening',
  },
  analyzedAt: '2026-11-15T20:48:00+03:00',
};

export const nowPlaying: Track = {
  id: 't-01',
  title: 'Evening Lounge',
  credit: 'Moodtrack AI',
  durationSec: 204,
  mood: {valence: 0.6, energy: 0.2, texture: -0.3},
  prompt:
    '86 BPM, D major, Rhodes piano, brushed drums, warm upright bass, lounge jazz, instrumental',
};

export const queue: Track[] = [
  {
    id: 't-02',
    title: 'City Breeze',
    credit: 'Moodtrack AI',
    durationSec: 196,
    mood: {valence: 0.4, energy: -0.2, texture: 0.1},
    prompt: '92 BPM, F major, soft synth pads, nylon guitar, chillhop, instrumental',
  },
  {
    id: 't-03',
    title: 'Late Afternoon',
    credit: 'Moodtrack AI',
    durationSec: 222,
    mood: {valence: 0.3, energy: -0.4, texture: -0.5},
    prompt: '78 BPM, A minor, acoustic guitar, light percussion, bossa nova, instrumental',
  },
  {
    id: 't-04',
    title: 'Coffee & Talk',
    credit: 'Moodtrack AI',
    durationSec: 188,
    mood: {valence: 0.75, energy: 0.45, texture: -0.1},
    prompt: '100 BPM, G major, upright piano, walking bass, swing jazz, instrumental',
  },
  {
    id: 't-05',
    title: 'Amber Lamp',
    credit: 'Moodtrack AI',
    durationSec: 184,
    mood: {valence: 0.5, energy: 0.1, texture: -0.6},
    prompt: '84 BPM, D minor, Rhodes piano, soft brushes, lounge jazz, instrumental',
  },
  {
    id: 't-06',
    title: 'Neon Terrace',
    credit: 'Moodtrack AI',
    durationSec: 238,
    mood: {valence: 0.55, energy: 0.6, texture: 0.7},
    prompt: '112 BPM, E minor, deep house, warm sub bass, airy vocal chops',
  },
];

export const moodHistory: MoodHistoryPoint[] = [
  {time: '09:00', valence: 0.2, energy: -0.05, texture: -0.5},
  {time: '10:00', valence: 0.3, energy: 0.05, texture: -0.45},
  {time: '11:00', valence: 0.35, energy: 0.1, texture: -0.4},
  {time: '12:00', valence: 0.5, energy: 0.35, texture: -0.2},
  {time: '13:00', valence: 0.6, energy: 0.6, texture: 0.0},
  {time: '14:00', valence: 0.55, energy: 0.45, texture: -0.05},
  {time: '15:00', valence: 0.45, energy: 0.2, texture: -0.15},
  {time: '16:00', valence: 0.4, energy: 0.05, texture: -0.25},
  {time: '17:00', valence: 0.4, energy: -0.05, texture: -0.3},
  {time: '18:00', valence: 0.5, energy: 0.0, texture: -0.3},
  {time: '19:00', valence: 0.6, energy: 0.2, texture: -0.25},
  {time: '20:00', valence: 0.65, energy: 0.3, texture: -0.2},
  {time: '21:00', valence: 0.68, energy: 0.34, texture: -0.21},
];

export const adaptiveSettings = {
  isEnabled: true,
  intervalMin: 15,
  /** Seconds until the next snapshot when the page opens. */
  nextSnapshotInSec: 12 * 60,
};
