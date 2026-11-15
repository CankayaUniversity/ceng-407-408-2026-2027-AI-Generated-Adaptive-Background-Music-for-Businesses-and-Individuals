/**
 * Stand-in for the venue API. The profile is kept in this browser's
 * localStorage, and the "music identity" is derived with simple rules where
 * the real service would ask the LLM. Replace in `service.ts`.
 */

import type {MoodVector} from '../mood/types';
import {ATMOSPHERES, venueTypeLabel} from './options';
import type {DaypartId, MusicIdentity, VenueProfile, VenueProfileService, VenueType} from './types';

const STORAGE_KEY = 'moodtrack.venueProfile';

const clamp = (v: number) => Math.max(-1, Math.min(1, Math.round(v * 100) / 100));

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Rough starting point for each kind of place. */
const typeMood: Record<VenueType, MoodVector> = {
  cafe: {valence: 0.45, energy: -0.1, texture: -0.4},
  restaurant: {valence: 0.4, energy: -0.15, texture: -0.45},
  bar: {valence: 0.35, energy: 0.35, texture: 0.3},
  shop: {valence: 0.55, energy: 0.3, texture: 0.15},
  office: {valence: 0.2, energy: -0.4, texture: 0.0},
  hotel: {valence: 0.4, energy: -0.3, texture: -0.2},
  gym: {valence: 0.5, energy: 0.8, texture: 0.6},
  home: {valence: 0.4, energy: -0.3, texture: -0.3},
};

const atmosphereShift: Record<string, Partial<MoodVector>> = {
  cozy: {valence: 0.1, energy: -0.1, texture: -0.2},
  elegant: {energy: -0.15, texture: -0.15},
  minimal: {energy: -0.1, texture: 0.15},
  lively: {valence: 0.15, energy: 0.25},
  relaxed: {energy: -0.25},
  trendy: {energy: 0.1, texture: 0.25},
};

const daypartShift: Record<DaypartId, Partial<MoodVector>> = {
  morning: {energy: -0.2, texture: -0.1},
  afternoon: {energy: 0.1},
  evening: {energy: -0.05, valence: -0.05},
  night: {energy: 0.25, texture: 0.15},
};

const electronicGenres = ['Deep house', 'Electronic', 'Lo-fi', 'Hip-hop'];
const acousticGenres = ['Jazz', 'Acoustic', 'Bossa nova', 'Classical', 'Soul'];

function add(mood: MoodVector, shift: Partial<MoodVector>): MoodVector {
  return {
    valence: mood.valence + (shift.valence ?? 0),
    energy: mood.energy + (shift.energy ?? 0),
    texture: mood.texture + (shift.texture ?? 0),
  };
}

function deriveIdentity(p: VenueProfile): MusicIdentity {
  let base: MoodVector = typeMood[p.type];
  for (const a of p.atmosphere) {
    base = add(base, atmosphereShift[a] ?? {});
  }
  const electronicPull =
    p.likedGenres.filter(g => electronicGenres.includes(g)).length -
    p.likedGenres.filter(g => acousticGenres.includes(g)).length;
  base = add(base, {texture: electronicPull * 0.1});

  const daypartMoods = p.dayparts
    .filter(d => d.isOpen)
    .map(d => {
      // A different concept at this time (e.g. bar at night) pulls toward that concept.
      const conceptPull =
        d.concept === p.type
          ? {}
          : {
              valence: (typeMood[d.concept].valence - typeMood[p.type].valence) * 0.7,
              energy: (typeMood[d.concept].energy - typeMood[p.type].energy) * 0.7,
              texture: (typeMood[d.concept].texture - typeMood[p.type].texture) * 0.7,
            };
      let mood = add(add(base, daypartShift[d.id]), conceptPull);
      if (p.keepModerate) {
        mood = {...mood, energy: Math.min(mood.energy, 0.5)};
      }
      return {
        daypart: d.id,
        concept: d.concept,
        mood: {valence: clamp(mood.valence), energy: clamp(mood.energy), texture: clamp(mood.texture)},
      };
    });

  const genres = p.likedGenres.slice(0, 3);
  const feel = p.atmosphere.length
    ? p.atmosphere
        .map(a => ATMOSPHERES.find(x => x.value === a)?.label.toLowerCase() ?? a)
        .join(', ')
    : 'balanced';
  const concepts = Array.from(new Set(p.dayparts.filter(d => d.isOpen).map(d => d.concept)));
  const shift =
    concepts.length > 1
      ? ` It shifts from ${venueTypeLabel(concepts[0]).toLowerCase()} to ${venueTypeLabel(concepts[concepts.length - 1]).toLowerCase()} later in the day.`
      : '';
  const vocals =
    p.vocals === 'instrumental'
      ? 'mostly instrumental'
      : p.vocals === 'mixed'
        ? 'a mix of instrumental and vocal tracks'
        : 'songs with vocals';

  return {
    summary: `A ${feel} ${venueTypeLabel(p.type).toLowerCase()} sound built on ${
      genres.length ? genres.join(', ').toLowerCase() : 'easy-listening styles'
    }, ${vocals}.${shift}${p.keepModerate ? ' Tempo and volume stay moderate.' : ''}`,
    styleTags: [
      ...genres.map(g => g.toLowerCase()),
      ...p.atmosphere,
      p.vocals === 'instrumental' ? 'instrumental' : 'vocals',
    ],
    daypartMoods,
  };
}

export const mockVenueService: VenueProfileService = {
  async load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as VenueProfile) : null;
    } catch {
      return null;
    }
  },

  async save(profile) {
    await wait(600);
    const saved = {...profile, updatedAt: new Date().toISOString()};
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // Storage can be unavailable (private mode); the profile still works for this visit.
    }
    return saved;
  },

  async suggestIdentity(profile) {
    await wait(1200);
    return deriveIdentity(profile);
  },
};
