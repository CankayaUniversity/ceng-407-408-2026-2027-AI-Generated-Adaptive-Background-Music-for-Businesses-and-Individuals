import type {ComponentType, SVGProps} from 'react';

/**
 * Speaker icons for four volume levels, drawn in the Heroicons outline style
 * (24×24, 1.5 stroke, currentColor) so they sit next to the other icons.
 * Heroicons only ships "wave" and "muted", so the in-between levels are drawn
 * here: the waves are arcs around the speaker cone, added one per level.
 */

type IconProps = SVGProps<SVGSVGElement>;

const SPEAKER =
  'M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z';

// Arcs centred on the cone's mouth (12.75, 12), radius 3, 6 and 9.
const WAVES = [
  'M14.871 9.879a3 3 0 0 1 0 4.243',
  'M16.993 7.757a6 6 0 0 1 0 8.485',
  'M19.114 5.636a9 9 0 0 1 0 12.728',
];

const MUTE_X = 'M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25';

function Speaker({waves, isMuted, ...props}: IconProps & {waves: number; isMuted?: boolean}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
      {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d={SPEAKER} />
      {isMuted ? (
        <path strokeLinecap="round" strokeLinejoin="round" d={MUTE_X} />
      ) : (
        WAVES.slice(0, waves).map(d => (
          <path key={d} strokeLinecap="round" strokeLinejoin="round" d={d} />
        ))
      )}
    </svg>
  );
}

const VolumeMuted = (props: IconProps) => <Speaker waves={0} isMuted {...props} />;
const VolumeLow = (props: IconProps) => <Speaker waves={1} {...props} />;
const VolumeMedium = (props: IconProps) => <Speaker waves={2} {...props} />;
const VolumeHigh = (props: IconProps) => <Speaker waves={3} {...props} />;

/** Picks the speaker for a 0–100 volume: muted, then one, two or three waves. */
export function volumeIcon(volume: number): ComponentType<IconProps> {
  if (volume <= 0) {
    return VolumeMuted;
  }
  if (volume < 34) {
    return VolumeLow;
  }
  if (volume < 67) {
    return VolumeMedium;
  }
  return VolumeHigh;
}
