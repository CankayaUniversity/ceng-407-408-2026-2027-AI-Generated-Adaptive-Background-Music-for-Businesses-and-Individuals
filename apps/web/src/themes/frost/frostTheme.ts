/**
 * Frost: Astryx Neutral with a very slight blue-grey tint.
 *
 * Inherits everything from Neutral (Figtree type, motion, radius, icons,
 * status colours, component overrides) and only re-points the grey roles at
 * the `slate` ramp and the accent at the `azure` blue ramp. All ramps keep
 * Neutral's lightness per stop, so contrast is unchanged.
 *
 * Edit, then rebuild: `npm run theme:build` (writes frost.css / frost.js).
 */
import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral';
import {frostPalette} from './frostPalette.generated';

const {slate, steel, azure} = frostPalette;
const L = slate.light;
const D = slate.dark;
const a = (color: string, alpha: string) => `${color}${alpha}`;
const liftedSecondary = `light-dark(${L[30]}, ${D[80]})`;
const SANS_FALLBACKS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const frostTheme = defineTheme({
  name: 'frost',
  extends: neutralTheme,

  // Host Grotesk (Google Fonts, OFL) replaces Neutral's Figtree. `typography`
  // replaces the base block entirely, so Neutral's scale and weights are
  // repeated here; only the families change. Self-hosted via frost.fonts.css.
  typography: {
    scale: {base: 14, ratio: 1.2},
    body: {family: 'Host Grotesk', fallbacks: SANS_FALLBACKS},
    heading: {
      family: 'Host Grotesk',
      fallbacks: SANS_FALLBACKS,
      weights: {3: 'bold', 4: 'bold'},
    },
    code: {
      family: 'ui-monospace',
      fallbacks: '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
  },

  tokens: {
    // Surfaces: tinted page (body/wash) under lifted cards in both modes
    '--color-background-surface': [L[100], D[15]],
    '--color-background-body': [L[95], D[10]],
    '--color-background-card': [L[100], D[15]],
    '--color-background-popover': [L[100], D[10]],
    '--color-background-muted': [L[95], D[10]],

    // Accent: clear azure blue instead of Neutral's near-black / near-white.
    // Stop 40 keeps white text on the accent above 4.5:1 contrast.
    '--color-accent': [azure.light[40], azure.dark[75]],
    '--color-accent-muted': [steel.light[90], steel.dark[30]],
    '--color-text-accent': [azure.light[40], azure.dark[75]],
    '--color-icon-accent': [azure.light[40], azure.dark[75]],
    '--color-on-accent': [L[100], D[5]],
    '--color-neutral': [a(L[0], '0F'), a(D[100], '1A')],

    // Overlays
    '--color-overlay': [a(L[0], '80'), a(D[0], 'CC')],
    '--color-overlay-hover': [a(L[0], '0D'), a(D[100], '0D')],
    '--color-overlay-pressed': [a(L[0], '1A'), a(D[100], '1A')],

    // Text and icons
    '--color-text-primary': [L[0], D[100]],
    '--color-text-secondary': [L[30], D[65]],
    '--color-text-disabled': [L[60], D[35]],
    '--color-on-light': L[5],
    '--color-on-warning': L[5],
    '--color-on-success': [L[100], D[5]],
    '--color-on-error': [L[100], D[5]],
    '--color-on-info': [L[100], D[5]],
    '--color-icon-primary': [L[0], D[100]],
    '--color-icon-secondary': [L[45], D[65]],
    '--color-icon-disabled': [L[60], D[35]],

    // Borders: lighter than Neutral (8% -> 5% hairlines, softer field outlines)
    '--color-border': [a(L[0], '0D'), a(D[100], '14')],
    '--color-border-emphasized': [L[90], D[25]],
    '--color-skeleton': [L[95], D[35]],
    '--color-shadow': [a(L[0], '1A'), a(D[0], '4D')],
    '--color-tint-hover': [L[0], D[100]],

    // The "gray" named colour follows the tint too
    '--color-background-gray': [L[90], D[20]],
    '--color-border-gray': [L[85], D[15]],
    '--color-icon-gray': [L[30], D[65]],
    '--color-text-gray': [L[10], D[85]],
  },

  // Neutral lifts secondary text on selected fills; keep that, on the tinted ramp.
  components: {
    // Field insets: text inputs and text areas get the same 12px inline padding
    // as Selector, so typed text and placeholders start on one line across a
    // form instead of sitting against the border.
    'text-input': {base: {paddingInline: 'var(--spacing-3)'}},
    'text-area-control': {
      base: {paddingInline: 'var(--spacing-3)', paddingBlock: 'var(--spacing-2)'},
    },
    item: {selected: {'--color-text-secondary': liftedSecondary}},
    'tree-list-item': {selected: {'--color-text-secondary': liftedSecondary}},
    'file-input': {'mode:dropzone': {'--color-text-secondary': liftedSecondary}},
    citation: {'variant:number': {'--color-text-secondary': liftedSecondary}},
    'segmented-control-item': {base: {'--color-text-secondary': liftedSecondary}},
  },
});
