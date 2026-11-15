import type {MoodVector} from '../mood/types';

/** Link to the Generate screen with a mood pre-filled (read by app/generate/page.tsx). */
export function generateHref(mood: MoodVector) {
  const params = new URLSearchParams({
    valence: mood.valence.toFixed(2),
    energy: mood.energy.toFixed(2),
    texture: mood.texture.toFixed(2),
  });
  return `/generate?${params.toString()}`;
}
