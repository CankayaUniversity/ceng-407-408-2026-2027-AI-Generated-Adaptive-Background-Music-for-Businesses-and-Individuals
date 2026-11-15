import type {ComponentType, SVGProps} from 'react';
import {
  BeakerIcon,
  BoltIcon,
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  CakeIcon,
  CloudIcon,
  FireIcon,
  HomeIcon,
  KeyIcon,
  MoonIcon,
  ShoppingBagIcon,
  SparklesIcon,
  Squares2X2Icon,
  SunIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import type {DaypartId, VenueProfile, VenueType} from './types';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export const VENUE_TYPES: Array<{
  value: VenueType;
  label: string;
  description: string;
  icon: IconComponent;
}> = [
  {value: 'cafe', label: 'Café', description: 'Coffee, conversation, laptops', icon: CakeIcon},
  {value: 'restaurant', label: 'Restaurant', description: 'Lunch and dinner service', icon: BuildingStorefrontIcon},
  {value: 'bar', label: 'Bar', description: 'Drinks, evenings, nightlife', icon: BeakerIcon},
  {value: 'shop', label: 'Shop', description: 'Retail and browsing', icon: ShoppingBagIcon},
  {value: 'office', label: 'Office', description: 'Focus and co-working', icon: BuildingOffice2Icon},
  {value: 'hotel', label: 'Hotel', description: 'Lobby, lounge, breakfast room', icon: KeyIcon},
  {value: 'gym', label: 'Gym', description: 'Workouts and classes', icon: BoltIcon},
  {value: 'home', label: 'Home / Other', description: 'Personal space or anything else', icon: HomeIcon},
];

export const venueTypeLabel = (type: VenueType) =>
  VENUE_TYPES.find(t => t.value === type)?.label ?? type;

export const DAYPARTS: Array<{id: DaypartId; label: string; hours: string; icon: IconComponent}> = [
  {id: 'morning', label: 'Morning', hours: '07:00–12:00', icon: SunIcon},
  {id: 'afternoon', label: 'Afternoon', hours: '12:00–17:00', icon: CloudIcon},
  {id: 'evening', label: 'Evening', hours: '17:00–22:00', icon: MoonIcon},
  {id: 'night', label: 'Night', hours: '22:00–02:00', icon: SparklesIcon},
];

/** Cover colour per part of the day, so the rows read apart even when their moods are close. */
export const DAYPART_PALETTE = {
  morning: 'yellow',
  afternoon: 'orange',
  evening: 'purple',
  night: 'blue',
} as const;

export const daypartLabel =(id: DaypartId) => DAYPARTS.find(d => d.id === id)?.label ?? id;

export const AUDIENCES = [
  'Students',
  'Professionals',
  'Families',
  'Couples',
  'Tourists',
  'Young adults',
  'Remote workers',
  'Regulars',
];

export const ATMOSPHERES: Array<{
  value: string;
  label: string;
  description: string;
  icon: IconComponent;
}> = [
  {value: 'cozy', label: 'Warm & cozy', description: 'Soft light, wood, a homely feel', icon: FireIcon},
  {value: 'elegant', label: 'Elegant', description: 'Refined, upscale, understated', icon: SparklesIcon},
  {value: 'minimal', label: 'Modern & minimal', description: 'Clean lines, calm, design-led', icon: Squares2X2Icon},
  {value: 'lively', label: 'Lively & social', description: 'Busy, chatty, upbeat', icon: UserGroupIcon},
  {value: 'relaxed', label: 'Laid-back', description: 'Slow pace, easygoing', icon: CloudIcon},
  {value: 'trendy', label: 'Trendy', description: 'Young, current, a bit of an edge', icon: BoltIcon},
];

export const GENRES = [
  'Jazz',
  'Lo-fi',
  'Acoustic',
  'Bossa nova',
  'Soul',
  'Classical',
  'Ambient',
  'Indie pop',
  'Deep house',
  'Funk',
  'Turkish pop',
  'R&B',
  'Rock',
  'Hip-hop',
  'Electronic',
];

export const LYRIC_LANGUAGES = [
  {value: 'none', label: 'No lyrics (instrumental only)'},
  {value: 'english', label: 'English'},
  {value: 'turkish', label: 'Turkish'},
];

export const MAX_ATMOSPHERES = 2;

export function emptyProfile(): VenueProfile {
  return {
    name: '',
    type: 'cafe',
    dayparts: DAYPARTS.map(d => ({id: d.id, isOpen: d.id !== 'night', concept: 'cafe'})),
    audience: [],
    atmosphere: [],
    likedGenres: [],
    avoidGenres: [],
    vocals: 'instrumental',
    lyricLanguages: ['none'],
    keepModerate: true,
    notes: '',
    photoNames: [],
  };
}
