import {Icon} from '@astryxdesign/core/Icon';
import {HeartIcon} from '@heroicons/react/24/outline';
import {HeartIcon as HeartIconSolid} from '@heroicons/react/24/solid';

/**
 * The favorite heart, used everywhere a song can be favorited.
 * Filled hearts use the bright data red: the theme's `red` icon colour is a
 * deep maroon that reads almost black at icon size.
 */
const FILLED_STYLE = {color: 'var(--color-data-categorical-red)'};

export function FavoriteIcon({isFavorite}: {isFavorite: boolean}) {
  return isFavorite ? (
    <Icon icon={HeartIconSolid} style={FILLED_STYLE} />
  ) : (
    <Icon icon={HeartIcon} />
  );
}
