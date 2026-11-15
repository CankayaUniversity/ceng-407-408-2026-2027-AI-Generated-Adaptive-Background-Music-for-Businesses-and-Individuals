/**
 * Contract between the Mood Analysis screen and whatever reads the mood.
 *
 * The real implementation sends the (downscaled, face-blurred) image or the
 * text to the API, where a vision LLM returns the three axes, a summary, tags
 * and scene details. Until then `mockAnalysisService.ts` stands in.
 */

import type {MoodAnalysis} from '../types';

export type AnalysisInput =
  | {kind: 'image'; /** A data: URL of the photo or camera frame. */ dataUrl: string}
  | {kind: 'text'; text: string};

export interface MoodAnalysisService {
  analyze(input: AnalysisInput): Promise<MoodAnalysis>;
}
