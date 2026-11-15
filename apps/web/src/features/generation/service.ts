/**
 * The generation service the UI uses. Swap the mock for the real
 * implementation here; nothing else in the web app needs to change.
 */

import {mockGenerationService} from './mockService';
import type {GenerationService} from './types';
import {currentPlan} from '../plan/planData';

export const generationService: GenerationService = mockGenerationService;

/** Songs per playlist allowed by the current plan (product range is 5–25). */
export const PLAN_SONG_LIMIT = currentPlan.songsPerPlaylist;
export const MIN_SONGS = 5;
export const MAX_SONGS = 25;
