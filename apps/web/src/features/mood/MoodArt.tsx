'use client';

import {useId} from 'react';
import type {MoodVector} from './types';

type Palette = 'blue' | 'shamrock' | 'yellow' | 'orange' | 'purple' | 'teal';

/**
 * Picks a data palette for a mood, so every generated track gets cover art in
 * the colour of the mood it was made for.
 */
export function paletteForMood({valence, energy, texture}: MoodVector): Palette {
  if (texture > 0.4) {
    return 'purple';
  }
  if (energy > 0.4 && valence > 0.3) {
    return 'yellow';
  }
  if (energy > 0.4) {
    return 'orange';
  }
  if (energy < -0.3 && valence >= 0) {
    return 'shamrock';
  }
  if (valence < 0) {
    return 'teal';
  }
  return 'blue';
}

function tone(palette: Palette, step: 1 | 2 | 3 | 4) {
  return `var(--color-data-${palette}-${step})`;
}

/**
 * Generated tracks have no cover photo, so the cover is drawn: layered waves in
 * the mood's palette. Decorative; the track title next to it carries the meaning.
 */
export function MoodArt({mood, size}: {mood: MoodVector; size: number}) {
  const id = useId();
  const palette = paletteForMood(mood);
  // Calmer moods get flatter waves.
  const swell = 14 + Math.round((mood.energy + 1) * 8);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{stopColor: tone(palette, 1)}} />
          <stop offset="1" style={{stopColor: tone(palette, 2)}} />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <rect width="100" height="100" rx="14" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width="100" height="100" fill={`url(#${id}-bg)`} />
        <path
          d={`M0 ${62 - swell / 2} C 25 ${62 - swell}, 45 ${62 + swell / 2}, 70 ${58 - swell / 2} S 100 ${54}, 100 ${52} V100 H0 Z`}
          style={{fill: tone(palette, 2)}}
          opacity="0.9"
        />
        <path
          d={`M0 ${76 - swell / 3} C 30 ${70 - swell / 2}, 50 ${84}, 75 ${72 - swell / 3} S 100 ${70}, 100 ${68} V100 H0 Z`}
          style={{fill: tone(palette, 3)}}
          opacity="0.85"
        />
        <path
          d={`M0 ${90} C 30 ${84}, 60 ${96}, 100 ${86} V100 H0 Z`}
          style={{fill: tone(palette, 4)}}
          opacity="0.6"
        />
      </g>
    </svg>
  );
}
