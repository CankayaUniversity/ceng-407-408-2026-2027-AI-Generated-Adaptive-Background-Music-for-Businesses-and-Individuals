import {forwardRef, type SVGProps} from 'react';
import {
  BuildingStorefrontIcon,
  ClockIcon,
  Cog6ToothIcon,
  HomeIcon,
  MusicalNoteIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  Square3Stack3DIcon,
} from '@heroicons/react/24/outline';

type HeroIcon = typeof HomeIcon;

/**
 * Heroicons outline glyphs are drawn for 24px with a 1.5 stroke. SideNav
 * always renders them at 16px, where that stroke shrinks to 1px and, on a
 * 125% or 150% display, lands between device pixels and looks blurry and
 * jagged. A 2-unit stroke at 16px is about 1.33px, which renders crisply.
 */
function crisp(Icon: HeroIcon, name: string) {
  const Crisp = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => (
    <Icon ref={ref} {...props} strokeWidth={2} />
  ));
  Crisp.displayName = `Crisp${name}`;
  return Crisp;
}

export const NavHomeIcon = crisp(HomeIcon, 'HomeIcon');
export const NavGenerateIcon = crisp(MusicalNoteIcon, 'MusicalNoteIcon');
export const NavMoodIcon = crisp(SparklesIcon, 'SparklesIcon');
export const NavVenueIcon = crisp(BuildingStorefrontIcon, 'BuildingStorefrontIcon');
export const NavHistoryIcon = crisp(ClockIcon, 'ClockIcon');
export const NavPlanIcon = crisp(Square3Stack3DIcon, 'Square3Stack3DIcon');
export const NavSettingsIcon = crisp(Cog6ToothIcon, 'Cog6ToothIcon');
export const NavHelpIcon = crisp(QuestionMarkCircleIcon, 'QuestionMarkCircleIcon');
