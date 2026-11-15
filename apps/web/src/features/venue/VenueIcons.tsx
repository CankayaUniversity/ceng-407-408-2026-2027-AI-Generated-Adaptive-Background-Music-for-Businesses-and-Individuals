import type {SVGProps} from 'react';

/**
 * Venue icons Heroicons does not ship, drawn in its outline style
 * (24×24, 1.5 stroke, round caps, currentColor) so they match the others.
 */

type IconProps = SVGProps<SVGSVGElement>;

function OutlineIcon({paths, ...props}: IconProps & {paths: string[]}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
      {...props}>
      {paths.map(d => (
        <path key={d} strokeLinecap="round" strokeLinejoin="round" d={d} />
      ))}
    </svg>
  );
}

/** A coffee cup with steam, on a saucer. */
export function CoffeeCupIcon(props: IconProps) {
  return (
    <OutlineIcon
      {...props}
      paths={[
        'M4.5 10.5h11.25v4.125A4.875 4.875 0 0 1 10.875 19.5h-1.5A4.875 4.875 0 0 1 4.5 14.625V10.5Z',
        'M15.75 11.625h1.125a2.625 2.625 0 0 1 0 5.25H15.4',
        'M3.75 21h13.5',
        'M8.25 3.75c-.75.75-.75 1.5 0 2.25s.75 1.5 0 2.25',
        'M12 3.75c-.75.75-.75 1.5 0 2.25s.75 1.5 0 2.25',
      ]}
    />
  );
}

/** A cocktail glass with a drink line and a garnish pick. */
export function CocktailIcon(props: IconProps) {
  return (
    <OutlineIcon
      {...props}
      paths={[
        'M4.5 4.5h15L12 12.75 4.5 4.5Z',
        'M7.25 7.5h9.5',
        'M12 12.75v7.5',
        'M8.25 20.25h7.5',
        'M14.25 7.5 17.25 2.25',
      ]}
    />
  );
}
