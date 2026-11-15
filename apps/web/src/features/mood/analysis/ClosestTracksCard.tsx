'use client';

import {useState} from 'react';
import {Card} from '@astryxdesign/core/Card';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {List, ListItem} from '@astryxdesign/core/List';
import {QueueListIcon} from '@heroicons/react/24/outline';
import {PauseIcon, PlayIcon} from '@heroicons/react/24/solid';
import {MoodArt} from '../MoodArt';
import {closestTracks} from '../../music/library';
import {formatDuration} from '../../player/types';
import type {MoodVector} from '../types';

/** Live preview: the library tracks nearest to the (tuned) mood. */
export function ClosestTracksCard({mood}: {mood: MoodVector}) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const matches = closestTracks(mood, 3);

  return (
    <Card padding={5}>
      <VStack gap={3}>
        <VStack gap={1}>
          <HStack gap={2} vAlign="center">
            <Icon icon={QueueListIcon} color="accent" />
            <Heading level={3}>Closest in Your Library</Heading>
          </HStack>
          <Text type="supporting">Updates as you move the sliders.</Text>
        </VStack>
        <List hasDividers edge="flush">
          {matches.map(({track, match}) => {
            const isPlaying = playingId === track.id;
            return (
              <ListItem
                key={track.id}
                itemKey={track.id}
                startContent={<MoodArt mood={track.mood} size={48} />}
                label={track.title}
                description={`${match}% match · ${formatDuration(track.durationSec)}`}
                endContent={
                  <IconButton
                    label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                    variant={isPlaying ? 'primary' : 'secondary'}
                    icon={<Icon icon={isPlaying ? PauseIcon : PlayIcon} />}
                    onClick={() => setPlayingId(isPlaying ? null : track.id)}
                  />
                }
              />
            );
          })}
        </List>
      </VStack>
    </Card>
  );
}
