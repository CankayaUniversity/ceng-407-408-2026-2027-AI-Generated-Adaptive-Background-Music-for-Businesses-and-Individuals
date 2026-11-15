'use client';

import {useEffect, useRef, useState} from 'react';
import {Card} from '@astryxdesign/core/Card';
import {HStack, VStack, StackItem} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Slider} from '@astryxdesign/core/Slider';
import {
  ArrowsRightLeftIcon,
  ArrowPathRoundedSquareIcon,
  BackwardIcon,
  EllipsisHorizontalIcon,
  ForwardIcon,
  HeartIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';
import {HeartIcon as HeartIconSolid, PauseIcon, PlayIcon} from '@heroicons/react/24/solid';
import {MoodArt} from '../mood/MoodArt';
import {formatDuration, type Track} from './types';
import {volumeIcon} from './VolumeIcon';

/**
 * Soft white-to-blue wash behind the player. Built only from theme tokens, so it
 * follows light and dark mode: the card colour fades into the lightest blues.
 */
const playerBackground = {
  background:
    'linear-gradient(135deg, var(--color-background-card) 0%, var(--color-background-card) 30%, var(--color-data-blue-1) 70%, var(--color-background-blue) 100%)',
};

/**
 * The large "now playing" card. Playback is simulated until the streaming API
 * exists: the position ticks forward once a second while playing.
 */
export function NowPlayingCard({track, startAtSec = 78}: {track: Track; startAtSec?: number}) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [position, setPosition] = useState(startAtSec);
  const [volume, setVolume] = useState(70);
  // The level to return to when unmuting.
  const lastVolume = useRef(70);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(true);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }
    const timer = setInterval(() => {
      setPosition(p => (p + 1 >= track.durationSec ? 0 : p + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, track.durationSec]);

  return (
    <Card elevation="low" padding={0}>
      <VStack gap={5} padding={6} height="100%" vAlign="between" style={playerBackground}>
        <HStack gap={5} vAlign="center">
          <MoodArt mood={track.mood} size={132} />
          <StackItem size="fill">
            <VStack gap={2}>
              <HStack gap={2} vAlign="center" hAlign="between">
                <HStack gap={1.5} vAlign="center">
                  <Icon icon={SpeakerWaveIcon} size="sm" color="accent" />
                  <Text type="supporting" color="accent" weight="medium">
                    Now Playing
                  </Text>
                </HStack>
                <HStack gap={1}>
                  <IconButton
                    label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    variant="ghost"
                    icon={
                      <Icon
                        icon={isFavorite ? HeartIconSolid : HeartIcon}
                        color={isFavorite ? 'red' : 'inherit'}
                      />
                    }
                    onClick={() => setIsFavorite(f => !f)}
                  />
                  <IconButton
                    label="More options"
                    variant="ghost"
                    icon={<Icon icon={EllipsisHorizontalIcon} />}
                  />
                </HStack>
              </HStack>
              <Heading level={2} maxLines={1}>
                {track.title}
              </Heading>
              <Text color="secondary">
                {track.credit} · {formatDuration(track.durationSec)}
              </Text>
            </VStack>
          </StackItem>
        </HStack>

        <VStack gap={1}>
          <Slider
            label="Track position"
            isLabelHidden
            min={0}
            max={track.durationSec}
            value={position}
            onChange={(v: number) => setPosition(v)}
            formatValue={formatDuration}
            valueDisplay="none"
          />
          <HStack hAlign="between">
            <Text type="supporting" hasTabularNumbers>
              {formatDuration(position)}
            </Text>
            <Text type="supporting" hasTabularNumbers>
              {formatDuration(track.durationSec)}
            </Text>
          </HStack>
        </VStack>

        <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
          <HStack gap={2} vAlign="center">
            <IconButton
              label={isShuffle ? 'Turn shuffle off' : 'Shuffle'}
              variant={isShuffle ? 'secondary' : 'ghost'}
              icon={<Icon icon={ArrowsRightLeftIcon} />}
              onClick={() => setIsShuffle(s => !s)}
            />
            <IconButton
              label="Previous track"
              variant="ghost"
              icon={<Icon icon={BackwardIcon} />}
              onClick={() => setPosition(0)}
            />
            <IconButton
              label={isPlaying ? 'Pause' : 'Play'}
              variant="primary"
              size="lg"
              icon={<Icon icon={isPlaying ? PauseIcon : PlayIcon} />}
              onClick={() => setIsPlaying(p => !p)}
            />
            <IconButton label="Next track" variant="ghost" icon={<Icon icon={ForwardIcon} />} />
            <IconButton
              label={isRepeat ? 'Turn repeat off' : 'Repeat'}
              variant={isRepeat ? 'secondary' : 'ghost'}
              icon={<Icon icon={ArrowPathRoundedSquareIcon} />}
              onClick={() => setIsRepeat(r => !r)}
            />
          </HStack>
          <HStack gap={1} vAlign="center" width={200}>
            <IconButton
              label={volume === 0 ? 'Unmute' : 'Mute'}
              variant="ghost"
              size="sm"
              icon={<Icon icon={volumeIcon(volume)} />}
              onClick={() => {
                if (volume === 0) {
                  setVolume(lastVolume.current || 50);
                } else {
                  lastVolume.current = volume;
                  setVolume(0);
                }
              }}
            />
            <StackItem size="fill">
              <Slider
                label="Volume"
                isLabelHidden
                min={0}
                max={100}
                value={volume}
                onChange={(v: number) => setVolume(v)}
                formatValue={v => `${v}%`}
              />
            </StackItem>
          </HStack>
        </HStack>
      </VStack>
    </Card>
  );
}
