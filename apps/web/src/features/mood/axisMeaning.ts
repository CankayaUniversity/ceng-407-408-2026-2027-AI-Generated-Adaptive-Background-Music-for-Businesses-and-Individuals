import type {MoodAxis} from './types';

/**
 * What each value on a mood axis means. Every axis runs from -1 to +1:
 * `low` is the -1 end, `high` the +1 end, and `ticks` name the steps between,
 * so charts and sliders can show words instead of bare numbers.
 */
export const axisMeaning: Record<
  MoodAxis,
  {label: string; low: string; high: string; ticks: Record<string, string>}
> = {
  energy: {
    label: 'Energy',
    low: 'calm',
    high: 'energetic',
    ticks: {'-1': 'Calm', '-0.5': 'Relaxed', '0': 'Neutral', '0.5': 'Lively', '1': 'Energetic'},
  },
  valence: {
    label: 'Valence',
    low: 'sad',
    high: 'happy',
    ticks: {'-1': 'Sad', '-0.5': 'Melancholic', '0': 'Neutral', '0.5': 'Upbeat', '1': 'Happy'},
  },
  texture: {
    label: 'Texture',
    low: 'acoustic',
    high: 'electronic',
    ticks: {
      '-1': 'Acoustic',
      '-0.5': 'More acoustic',
      '0': 'Balanced',
      '0.5': 'More electronic',
      '1': 'Electronic',
    },
  },
};

/** Puts a value into words, e.g. 0.30 on energy -> "slightly energetic". */
export function describeValue(axis: MoodAxis, value: number): string {
  const {low, high} = axisMeaning[axis];
  const size = Math.abs(value);
  if (size < 0.15) {
    return axis === 'texture' ? 'balanced' : 'neutral';
  }
  const word = value > 0 ? high : low;
  if (size < 0.5) {
    return `slightly ${word}`;
  }
  if (size < 0.8) {
    return word;
  }
  return `very ${word}`;
}
