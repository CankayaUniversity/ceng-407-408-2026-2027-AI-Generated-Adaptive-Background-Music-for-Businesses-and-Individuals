/**
 * Stand-in for the real generation pipeline so the Generate screen can be
 * built and tested without the API or any paid credits.
 *
 * - planPrompts: derives tempo, key and instruments from the mood the same way
 *   the real LLM prompt is meant to (energy -> tempo, valence -> major/minor,
 *   texture -> acoustic vs electronic instruments).
 * - generateTrack: waits a few seconds and returns a track without audio.
 *   About one in eight fails on purpose, so the retry path can be tried.
 *
 * To connect the real pipeline, implement `GenerationService` (see types.ts)
 * and export it from `service.ts` instead of this one.
 */

import type {MoodVector} from '../mood/types';
import type {Track} from '../player/types';
import type {GenerationRequest, GenerationService, PlannedPrompt} from './types';

const FAIL_RATE = 0.12;

const acousticSets = [
  'Rhodes piano, brushed drums, upright bass',
  'nylon guitar, soft shaker, warm cello',
  'felt piano, light strings, gentle hand percussion',
  'acoustic guitar, upright bass, vibraphone',
  'muted trumpet, piano trio, soft brushes',
];
const hybridSets = [
  'electric piano, lo-fi drums, warm sub bass',
  'clean guitar, soft synth pads, laid-back beat',
  'Wurlitzer, tape-saturated drums, airy pads',
  'vibraphone, analog bass, chillhop groove',
];
const electronicSets = [
  'deep house groove, warm sub bass, airy synth pads',
  'analog synths, four-on-the-floor kick, plucked arps',
  'downtempo beat, glassy keys, evolving pads',
  'nu-disco bassline, filtered chords, crisp hi-hats',
];

const calmGenres = ['ambient jazz', 'bossa nova', 'neo-classical', 'acoustic lounge', 'lo-fi'];
const midGenres = ['lounge jazz', 'chillhop', 'soul jazz', 'acoustic pop', 'downtempo'];
const upbeatGenres = ['swing jazz', 'nu-disco', 'deep house', 'funk', 'indie pop'];

const titleA = ['Amber', 'Velvet', 'Golden', 'Quiet', 'Neon', 'Linen', 'Copper', 'Midnight', 'Harbor', 'Paper'];
const titleB = ['Lamp', 'Hours', 'Terrace', 'Window', 'Corner', 'Breeze', 'Avenue', 'Garden', 'Steps', 'Light'];

const majorKeys = ['C major', 'D major', 'F major', 'G major', 'A major', 'B♭ major'];
const minorKeys = ['A minor', 'D minor', 'E minor', 'F♯ minor', 'C minor', 'G minor'];

function pick<T>(list: T[], index: number): T {
  return list[((index % list.length) + list.length) % list.length];
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function describePrompt(mood: MoodVector, index: number, request: GenerationRequest): string {
  // Energy sets the tempo: calm ~70 BPM, energetic ~125 BPM, with a little spread.
  const bpm = Math.round(98 + mood.energy * 27 + ((index * 7) % 11) - 5);
  const key = mood.valence >= 0 ? pick(majorKeys, index) : pick(minorKeys, index);
  const instruments =
    mood.texture < -0.3
      ? pick(acousticSets, index)
      : mood.texture > 0.3
        ? pick(electronicSets, index)
        : pick(hybridSets, index);
  const genre =
    mood.energy < -0.2
      ? pick(calmGenres, index)
      : mood.energy > 0.35
        ? pick(upbeatGenres, index)
        : pick(midGenres, index);
  const vocals = request.vocals === 'vocals' ? 'soft wordless vocals' : 'instrumental';
  const context = request.description.trim() ? `, fits: ${request.description.trim()}` : '';
  return `${bpm} BPM, ${key}, ${instruments}, ${genre}, ${vocals}${context}`;
}

export const mockGenerationService: GenerationService = {
  async planPrompts(request) {
    await wait(1200);
    const seed = Math.floor(Math.random() * 100);
    return Array.from({length: request.count}, (_, i): PlannedPrompt => {
      // Vary the mood slightly per song so the playlist does not sound uniform.
      const drift = (((i * 37) % 7) - 3) / 20;
      const mood = {
        valence: request.mood.valence,
        energy: Math.max(-1, Math.min(1, request.mood.energy + drift)),
        texture: request.mood.texture,
      };
      return {
        id: newId(),
        title: `${pick(titleA, seed + i)} ${pick(titleB, seed + i * 3)}`,
        prompt: describePrompt(mood, seed + i, request),
      };
    });
  },

  async generateTrack(prompt, request) {
    await wait(2500 + Math.random() * 4500);
    if (Math.random() < FAIL_RATE) {
      throw new Error('The music service timed out. Try again.');
    }
    const track: Track = {
      id: newId(),
      title: prompt.title,
      credit: 'Moodtrack AI',
      durationSec: Math.round(request.durationSec * (0.9 + Math.random() * 0.2)),
      mood: request.mood,
      prompt: prompt.prompt,
    };
    return track;
  },
};
