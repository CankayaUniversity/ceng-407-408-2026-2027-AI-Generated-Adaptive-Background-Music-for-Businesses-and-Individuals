/**
 * Mood shapes shared by the web app. They mirror the planned API (`apps/api`,
 * `mood/vector.py`). Once the API exists, replace these with types generated from
 * its OpenAPI schema.
 */

/** Three mood axes, each in [-1, 1]. */
export interface MoodVector {
  /** Sad (-1) to happy (+1). */
  valence: number;
  /** Calm (-1) to energetic (+1). */
  energy: number;
  /** Acoustic (-1) to electronic (+1). */
  texture: number;
}

export type MoodAxis = keyof MoodVector;

export interface SceneInfo {
  venueType: string;
  crowd: string;
  lighting: string;
  timeOfDay: string;
}

export interface MoodAnalysis {
  mood: MoodVector;
  summary: string;
  tags: string[];
  scene: SceneInfo;
  analyzedAt: string;
}

export interface MoodHistoryPoint extends MoodVector {
  time: string;
}
