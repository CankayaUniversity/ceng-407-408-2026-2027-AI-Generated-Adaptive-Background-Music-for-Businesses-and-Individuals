/**
 * Venue profile: the answers to the onboarding questions, plus the "music
 * identity" the AI derives from them. The identity seeds every generation
 * (style and a default mood per part of the day) before any camera input.
 */

import type {MoodVector} from '../mood/types';

export type VenueType =
  | 'cafe'
  | 'restaurant'
  | 'bar'
  | 'shop'
  | 'office'
  | 'hotel'
  | 'gym'
  | 'home';

export type DaypartId = 'morning' | 'afternoon' | 'evening' | 'night';

export interface Daypart {
  id: DaypartId;
  isOpen: boolean;
  /** What the venue is during this part of the day, e.g. "Café" in the morning, "Bar" at night. */
  concept: VenueType;
}

export type VocalPreference = 'instrumental' | 'mixed' | 'vocals';

export interface VenueProfile {
  name: string;
  type: VenueType;
  dayparts: Daypart[];
  audience: string[];
  atmosphere: string[];
  likedGenres: string[];
  avoidGenres: string[];
  vocals: VocalPreference;
  lyricLanguages: string[];
  keepModerate: boolean;
  notes: string;
  /** File names only; reference photos are analyzed once and not stored. */
  photoNames: string[];
  identity?: MusicIdentity;
  updatedAt?: string;
}

export interface MusicIdentity {
  summary: string;
  styleTags: string[];
  daypartMoods: Array<{daypart: DaypartId; concept: VenueType; mood: MoodVector}>;
}

export interface VenueProfileService {
  load(): Promise<VenueProfile | null>;
  save(profile: VenueProfile): Promise<VenueProfile>;
  /** Asks the AI for a music identity from the answers (does not save). */
  suggestIdentity(profile: VenueProfile): Promise<MusicIdentity>;
}
