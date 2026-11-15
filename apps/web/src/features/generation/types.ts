/**
 * Contract between the Generate screen and whatever produces the music.
 *
 * The web app only depends on `GenerationService`. Today `mockService.ts`
 * implements it; the real implementation (calling the API, which in turn calls
 * the LLM and ElevenLabs Music) replaces it without changes to the UI.
 */

import type {MoodVector} from '../mood/types';
import type {Track} from '../player/types';

export type VocalMode = 'instrumental' | 'vocals';

export interface GenerationRequest {
  mood: MoodVector;
  /** Optional free-text description of the room, e.g. "rainy evening, candles". */
  description: string;
  /** How many songs to plan and generate (5–25, capped by the user's plan). */
  count: number;
  vocals: VocalMode;
  /** Target length of each song in seconds. */
  durationSec: number;
}

/** One song the LLM planned; the user can edit or drop it before generating. */
export interface PlannedPrompt {
  id: string;
  title: string;
  prompt: string;
}

export type JobStatus = 'queued' | 'generating' | 'ready' | 'failed';

export interface GenerationJob {
  promptId: string;
  status: JobStatus;
  track?: Track;
  error?: string;
}

export interface GenerationService {
  /** Step 1: turn the mood into `count` varied song prompts. */
  planPrompts(request: GenerationRequest): Promise<PlannedPrompt[]>;
  /** Step 2: generate one song from an (edited) prompt. */
  generateTrack(prompt: PlannedPrompt, request: GenerationRequest): Promise<Track>;
}
