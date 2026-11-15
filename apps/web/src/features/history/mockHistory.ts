/**
 * Mock listening history until the API exists: past playlists, the songs in
 * them, and how often each song played. The real data comes from the
 * playlists and streaming features of the API.
 */

import type {MoodVector} from '../mood/types';
import type {Track} from '../player/types';
import {libraryTracks} from '../music/library';

/** What started a playlist. */
export type PlaylistSource = 'camera' | 'manual' | 'venue';

export const SOURCE_LABEL: Record<PlaylistSource, string> = {
  camera: 'Adaptive camera',
  manual: 'Manual',
  venue: 'Venue profile',
};

interface PlaylistData {
  id: string;
  name: string;
  source: PlaylistSource;
  createdAt: string;
  mood: MoodVector;
  trackIds: string[];
}

/** Table rows must be indexable, hence the Record base. */
export interface PlaylistRecord extends PlaylistData, Record<string, unknown> {
  durationSec: number;
}

export interface TrackRecord extends Record<string, unknown> {
  id: string;
  track: Track;
  playlistId: string;
  playlistName: string;
  source: PlaylistSource;
  generatedAt: string;
  plays: number;
  isFavorite: boolean;
}

const byId = new Map(libraryTracks.map(t => [t.id, t]));

const rawPlaylists: PlaylistData[] = [
  {
    id: 'p-01',
    name: 'Evening Lounge',
    source: 'camera',
    createdAt: '2026-11-15T20:48:00+03:00',
    mood: {valence: 0.68, energy: 0.34, texture: -0.21},
    trackIds: ['t-01', 't-02', 't-04', 't-05', 't-06'],
  },
  {
    id: 'p-02',
    name: 'Lunch Rush',
    source: 'camera',
    createdAt: '2026-11-15T12:32:00+03:00',
    mood: {valence: 0.6, energy: 0.6, texture: 0.1},
    trackIds: ['t-09', 't-04', 't-06'],
  },
  {
    id: 'p-03',
    name: 'Morning Coffee',
    source: 'venue',
    createdAt: '2026-11-15T07:05:00+03:00',
    mood: {valence: 0.5, energy: -0.3, texture: -0.6},
    trackIds: ['t-07', 't-03', 't-05'],
  },
  {
    id: 'p-04',
    name: 'Rainy Afternoon',
    source: 'manual',
    createdAt: '2026-11-14T15:20:00+03:00',
    mood: {valence: -0.3, energy: -0.5, texture: -0.4},
    trackIds: ['t-08', 't-11', 't-03'],
  },
  {
    id: 'p-05',
    name: 'Friday Night',
    source: 'camera',
    createdAt: '2026-11-13T23:10:00+03:00',
    mood: {valence: 0.2, energy: 0.6, texture: 0.75},
    trackIds: ['t-10', 't-06', 't-09'],
  },
  {
    id: 'p-06',
    name: 'Focus Hours',
    source: 'manual',
    createdAt: '2026-11-12T10:00:00+03:00',
    mood: {valence: 0.1, energy: -0.6, texture: 0.2},
    trackIds: ['t-11', 't-07', 't-02'],
  },
];

export const PLAYLISTS: PlaylistRecord[] = rawPlaylists.map(p => ({
  ...p,
  durationSec: p.trackIds.reduce((sum, id) => sum + (byId.get(id)?.durationSec ?? 0), 0),
}));

const favoriteIds = new Set(['t-01', 't-05', 't-07', 't-10']);

/** One row per song per playlist, newest playlist first. */
export const TRACK_RECORDS: TrackRecord[] = PLAYLISTS.flatMap((p, pi) =>
  p.trackIds.flatMap((id, ti) => {
    const track = byId.get(id);
    if (!track) {
      return [];
    }
    // Spread generation times a few minutes apart within the playlist.
    const generatedAt = new Date(new Date(p.createdAt).getTime() + ti * 3 * 60_000).toISOString();
    return [
      {
        id: `${p.id}-${id}`,
        track,
        playlistId: p.id,
        playlistName: p.name,
        source: p.source,
        generatedAt,
        plays: ((pi * 7 + ti * 5) % 13) + 1,
        isFavorite: favoriteIds.has(id),
      },
    ];
  }),
);
