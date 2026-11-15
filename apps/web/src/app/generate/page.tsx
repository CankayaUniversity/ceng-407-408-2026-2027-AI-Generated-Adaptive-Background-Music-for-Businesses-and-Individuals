'use client';

import {Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import {GenerateScreen} from '../../features/generation/GenerateScreen';
import {currentAnalysis} from '../../features/dashboard/mockData';
import type {MoodVector} from '../../features/mood/types';

/** Reads ?valence=&energy=&texture= (sent by Mood Analysis); falls back to the current mood. */
function moodFromParams(params: URLSearchParams): MoodVector {
  const read = (key: keyof MoodVector) => {
    const raw = params.get(key);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : currentAnalysis.mood[key];
  };
  return {valence: read('valence'), energy: read('energy'), texture: read('texture')};
}

function GenerateWithParams() {
  const params = useSearchParams();
  const mood = moodFromParams(params);
  // Key on the mood so arriving with a new mood resets the form.
  return (
    <GenerateScreen
      key={`${mood.valence}|${mood.energy}|${mood.texture}`}
      currentMood={mood}
    />
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<GenerateScreen currentMood={currentAnalysis.mood} />}>
      <GenerateWithParams />
    </Suspense>
  );
}
