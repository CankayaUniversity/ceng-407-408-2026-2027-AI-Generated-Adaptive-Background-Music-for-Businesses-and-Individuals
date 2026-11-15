'use client';

import {useId} from 'react';
import type {MoodVector} from './types';

const SIZE = 220;
const CENTER = SIZE / 2;
const REACH = 78;

/**
 * Russell's circumplex as a small 2D map: valence on the x axis, energy on the y
 * axis. The dot is the current mood.
 */
export function MoodMap({mood}: {mood: MoodVector}) {
  const id = useId();
  const x = CENTER + mood.valence * REACH;
  const y = CENTER - mood.energy * REACH;
  const label = {
    fill: 'var(--color-text-secondary)',
    fontSize: 'var(--font-size-sm)',
  };
  const axis = {stroke: 'var(--color-data-blue-3)', strokeWidth: 1.2};

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width="100%"
      role="img"
      aria-label={`Mood map: valence ${mood.valence.toFixed(2)}, energy ${mood.energy.toFixed(2)}`}>
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" style={{stopColor: 'var(--color-data-blue-2)'}} stopOpacity="0.55" />
          <stop offset="1" style={{stopColor: 'var(--color-data-blue-1)'}} stopOpacity="0" />
        </radialGradient>
        <marker
          id={`${id}-arrow`}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" style={{fill: 'var(--color-data-blue-3)'}} />
        </marker>
      </defs>
      <circle cx={CENTER} cy={CENTER} r={REACH + 6} fill={`url(#${id}-glow)`} />
      <line
        x1={CENTER - REACH - 10}
        y1={CENTER}
        x2={CENTER + REACH + 10}
        y2={CENTER}
        style={axis}
        markerStart={`url(#${id}-arrow)`}
        markerEnd={`url(#${id}-arrow)`}
      />
      <line
        x1={CENTER}
        y1={CENTER + REACH + 10}
        x2={CENTER}
        y2={CENTER - REACH - 10}
        style={axis}
        markerStart={`url(#${id}-arrow)`}
        markerEnd={`url(#${id}-arrow)`}
      />
      <text x={CENTER} y={12} textAnchor="middle" style={label}>
        Energetic
      </text>
      <text x={CENTER} y={SIZE - 2} textAnchor="middle" style={label}>
        Calm
      </text>
      <text x={2} y={CENTER - 8} style={label}>
        Sad
      </text>
      <text x={SIZE - 2} y={CENTER - 8} textAnchor="end" style={label}>
        Happy
      </text>
      <circle cx={x} cy={y} r={11} style={{fill: 'var(--color-data-blue-2)'}} opacity="0.45" />
      <circle
        cx={x}
        cy={y}
        r={6}
        style={{fill: 'var(--color-data-blue-4)', stroke: 'var(--color-background-card)'}}
        strokeWidth={2}
      />
    </svg>
  );
}
