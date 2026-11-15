'use client';

import {Card} from '@astryxdesign/core/Card';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Link} from '@astryxdesign/core/Link';
import {List, ListItem} from '@astryxdesign/core/List';
import {MusicalNoteIcon} from '@heroicons/react/24/outline';
import {PlayIcon} from '@heroicons/react/24/solid';
import {MoodArt} from '../mood/MoodArt';
import {formatDuration, type Track} from './types';

/** Upcoming tracks; shows the first `visible` and links to the full queue. */
export function QueueCard({tracks, visible = 3}: {tracks: Track[]; visible?: number}) {
  return (
    <Card padding={5}>
      <VStack gap={3}>
        <HStack hAlign="between" vAlign="center">
          <HStack gap={2} vAlign="center">
            <Icon icon={MusicalNoteIcon} color="blue" />
            <Heading level={3}>Queue</Heading>
            <Text color="secondary">({tracks.length})</Text>
          </HStack>
          <Link href="#">View All</Link>
        </HStack>
        <List hasDividers edge="flush">
          {tracks.slice(0, visible).map(track => (
            <ListItem
              key={track.id}
              itemKey={track.id}
              startContent={<MoodArt mood={track.mood} size={52} />}
              label={track.title}
              description={`${track.credit} · ${formatDuration(track.durationSec)}`}
              endContent={
                <IconButton
                  label={`Play ${track.title}`}
                  variant="secondary"
                  icon={<Icon icon={PlayIcon} />}
                />
              }
            />
          ))}
        </List>
      </VStack>
    </Card>
  );
}
