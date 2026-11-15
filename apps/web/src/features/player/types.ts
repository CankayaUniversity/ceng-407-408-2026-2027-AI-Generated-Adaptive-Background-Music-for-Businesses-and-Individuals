import type {MoodVector} from '../mood/types';

export interface Track {
  id: string;
  title: string;
  /** Shown where an artist name would be. Generated tracks credit the app. */
  credit: string;
  durationSec: number;
  mood: MoodVector;
  /** The ElevenLabs Music prompt the track was generated from. */
  prompt: string;
}

/** Formats seconds as m:ss. */
export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
