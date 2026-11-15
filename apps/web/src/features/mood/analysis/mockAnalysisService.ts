/**
 * Stand-in for the vision LLM so the Mood Analysis screen works without the
 * API. It reads simple image statistics in the browser (nothing is uploaded):
 *
 * - brightness and warm vs cool colour -> valence (warm, well-lit rooms feel happier)
 * - contrast and saturation            -> energy  (busy, colourful scenes feel livelier)
 * - cool, saturated light              -> texture (neon/LED reads electronic,
 *                                                  warm lamplight reads acoustic)
 *
 * Text input uses keyword matching. Results are rough on purpose: the point is
 * that different photos give visibly different moods for testing the UI.
 * Replace with the real service in `service.ts`.
 */

import type {MoodAnalysis, MoodVector} from '../types';
import type {AnalysisInput, MoodAnalysisService} from './types';

const SAMPLE = 64;

const clamp = (v: number) => Math.max(-1, Math.min(1, Math.round(v * 100) / 100));

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The image could not be read.'));
    img.src = src;
  });
}

interface ImageStats {
  brightness: number; // 0..1
  warmth: number; // -1 (blue) .. 1 (red/orange)
  contrast: number; // 0..~0.5
  saturation: number; // 0..1
}

async function readStats(dataUrl: string): Promise<ImageStats> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE;
  canvas.height = SAMPLE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('This browser cannot analyze images.');
  }
  ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
  const {data} = ctx.getImageData(0, 0, SAMPLE, SAMPLE);

  let sumL = 0;
  let sumL2 = 0;
  let sumWarm = 0;
  let sumSat = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    sumL += l;
    sumL2 += l * l;
    sumWarm += r - b;
    sumSat += max === 0 ? 0 : (max - min) / max;
  }
  const brightness = sumL / n;
  return {
    brightness,
    warmth: Math.max(-1, Math.min(1, (sumWarm / n) * 3)),
    contrast: Math.sqrt(Math.max(0, sumL2 / n - brightness * brightness)),
    saturation: sumSat / n,
  };
}

function sceneFromStats(s: ImageStats, mood: MoodVector) {
  const light = s.brightness < 0.3 ? 'Dim' : s.brightness < 0.6 ? 'Soft' : 'Bright';
  const tone = s.warmth > 0.15 ? 'Warm' : s.warmth < -0.1 ? 'Cool' : 'Neutral';
  const crowd = mood.energy > 0.35 ? 'Busy' : mood.energy > -0.2 ? 'Moderate' : 'Quiet';
  const timeOfDay =
    s.brightness < 0.28 ? 'Evening' : s.brightness < 0.5 ? 'Afternoon' : 'Daytime';
  return {venueType: 'Café', crowd, lighting: `${light} / ${tone}`, timeOfDay};
}

function moodFromStats(s: ImageStats): MoodVector {
  return {
    valence: clamp((s.brightness - 0.35) * 1.4 + s.warmth * 0.9),
    energy: clamp((s.contrast - 0.17) * 4 + (s.saturation - 0.3) * 1.2),
    texture: clamp(-s.warmth * 1.3 + (s.saturation - 0.35) * 0.8 - (s.brightness < 0.3 ? 0.1 : 0)),
  };
}

const keywordMoods: Array<{words: string[]; mood: Partial<MoodVector>; tag: string}> = [
  {words: ['quiet', 'calm', 'empty', 'reading', 'study', 'focus'], mood: {energy: -0.6}, tag: 'quiet'},
  {words: ['busy', 'crowded', 'full', 'rush', 'party', 'loud', 'dance'], mood: {energy: 0.7}, tag: 'busy'},
  {words: ['candle', 'candles', 'dim', 'cozy', 'warm', 'fireplace'], mood: {valence: 0.4, texture: -0.6}, tag: 'cozy'},
  {words: ['neon', 'club', 'led', 'bar', 'cocktail', 'drinks'], mood: {texture: 0.6, energy: 0.3}, tag: 'nightlife'},
  {words: ['sunny', 'bright', 'morning', 'breakfast', 'brunch'], mood: {valence: 0.6}, tag: 'bright'},
  {words: ['rain', 'rainy', 'grey', 'gray', 'winter', 'late'], mood: {valence: -0.3, energy: -0.2}, tag: 'moody'},
  {words: ['evening', 'night', 'dinner'], mood: {energy: -0.1}, tag: 'evening'},
];

function analyzeText(text: string): MoodAnalysis {
  const words = text.toLowerCase().split(/[^a-zçğıöşü]+/);
  const mood: MoodVector = {valence: 0.2, energy: 0, texture: -0.1};
  const tags: string[] = [];
  for (const k of keywordMoods) {
    if (k.words.some(w => words.includes(w))) {
      mood.valence = clamp(mood.valence + (k.mood.valence ?? 0));
      mood.energy = clamp(mood.energy + (k.mood.energy ?? 0));
      mood.texture = clamp(mood.texture + (k.mood.texture ?? 0));
      tags.push(k.tag);
    }
  }
  const timeOfDay = words.some(w => ['morning', 'breakfast', 'brunch'].includes(w))
    ? 'Morning'
    : words.some(w => ['evening', 'night', 'dinner', 'late'].includes(w))
      ? 'Evening'
      : 'Afternoon';
  return {
    mood,
    summary: tags.length
      ? `A ${tags.slice(0, 2).join(', ')} space, based on your description.`
      : 'No strong cues in the description, so the mood stays close to neutral.',
    tags: tags.length ? tags : ['neutral'],
    scene: {
      venueType: 'Café',
      crowd: mood.energy > 0.35 ? 'Busy' : mood.energy > -0.2 ? 'Moderate' : 'Quiet',
      lighting: tags.includes('cozy') ? 'Dim / Warm' : tags.includes('nightlife') ? 'Dim / Cool' : 'Not described',
      timeOfDay,
    },
    analyzedAt: new Date().toISOString(),
  };
}

export const mockAnalysisService: MoodAnalysisService = {
  async analyze(input: AnalysisInput) {
    await wait(1800);
    if (input.kind === 'text') {
      return analyzeText(input.text);
    }
    const stats = await readStats(input.dataUrl);
    const mood = moodFromStats(stats);
    const scene = sceneFromStats(stats, mood);
    const tags = [
      scene.timeOfDay.toLowerCase(),
      `${scene.lighting.split(' / ')[1].toLowerCase()} light`,
      `${scene.crowd.toLowerCase()} room`,
      stats.saturation > 0.45 ? 'colourful' : 'muted colours',
    ];
    return {
      mood,
      summary: `A ${scene.lighting.toLowerCase().replace(' / ', ', ')}-lit space that feels ${scene.crowd.toLowerCase()}, in the ${scene.timeOfDay.toLowerCase()}.`,
      tags,
      scene,
      analyzedAt: new Date().toISOString(),
    };
  },
};
