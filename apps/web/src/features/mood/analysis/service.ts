/**
 * The analysis service the UI uses. Swap the mock for the real implementation
 * here; nothing else in the web app needs to change.
 */

import {mockAnalysisService} from './mockAnalysisService';
import type {MoodAnalysisService} from './types';

export const moodAnalysisService: MoodAnalysisService = mockAnalysisService;
