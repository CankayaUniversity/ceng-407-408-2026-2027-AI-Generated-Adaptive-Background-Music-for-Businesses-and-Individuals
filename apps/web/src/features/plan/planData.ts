/**
 * Plans and the venue's usage (mock). In the real app the admin defines plans
 * and limits in the web admin panel and the API reports usage; until then
 * these numbers drive the Plan & Usage screen and the Generate song limit.
 */

export type PlanId = 'personal' | 'business' | 'pro';

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  songsPerMonth: number;
  songsPerPlaylist: number;
  cameraAnalysesPerMonth: number;
  storageGb: number;
  venues: number;
  features: string[];
}

/** Ordered from smallest to largest; the order decides upgrade vs. switch. */
export const PLANS: Plan[] = [
  {
    id: 'personal',
    name: 'Personal',
    description: 'For a room at home or a small studio.',
    songsPerMonth: 60,
    songsPerPlaylist: 5,
    cameraAnalysesPerMonth: 300,
    storageGb: 2,
    venues: 1,
    features: ['Mood from photos and text', 'Adaptive camera mode', 'Personal use only'],
  },
  {
    id: 'business',
    name: 'Business',
    description: 'For one café, restaurant, shop or office.',
    songsPerMonth: 300,
    songsPerPlaylist: 10,
    cameraAnalysesPerMonth: 1500,
    storageGb: 10,
    venues: 1,
    features: [
      'Commercial use of generated music',
      'Venue profile and music identity',
      'Adaptive camera mode',
      'Music history and favorites',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For busy venues and small chains.',
    songsPerMonth: 1000,
    songsPerPlaylist: 25,
    cameraAnalysesPerMonth: 6000,
    storageGb: 50,
    venues: 3,
    features: [
      'Everything in Business',
      'Up to 3 venues',
      'Songs with vocals in Turkish and English',
      'Priority generation',
    ],
  },
];

export const CURRENT_PLAN_ID: PlanId = 'business';
export const currentPlan = PLANS.find(p => p.id === CURRENT_PLAN_ID)!;

export const billingPeriod = {
  start: '2026-11-01',
  end: '2026-11-30',
  renewsOn: '2026-12-01',
};

/** Usage in the current billing period. */
export const usage = {
  songsGenerated: 186,
  cameraAnalyses: 1248,
  storageGb: 2.4,
  venues: 1,
};

/** Songs generated per day so far this period (1–15 Nov). */
export const dailySongs: Array<{day: string; songs: number}> = [
  8, 12, 10, 15, 9, 6, 14, 18, 11, 13, 16, 12, 10, 17, 15,
].map((songs, i) => ({day: String(i + 1), songs}));
