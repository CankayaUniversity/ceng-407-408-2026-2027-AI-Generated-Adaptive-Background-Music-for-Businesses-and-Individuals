'use client';

import NextLink from 'next/link';
import {Drawer, DrawerHeader} from '@astryxdesign/core/Drawer';
import {HStack, StackItem, VStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {Button} from '@astryxdesign/core/Button';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Divider} from '@astryxdesign/core/Divider';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {ArrowPathIcon} from '@heroicons/react/24/outline';
import {PlayIcon} from '@heroicons/react/24/solid';
import {MoodArt} from '../mood/MoodArt';
import {describeValue} from '../mood/axisMeaning';
import {formatDuration} from '../player/types';
import {generateHref} from '../generation/links';
import {SOURCE_LABEL, type PlaylistRecord, type TrackRecord} from './mockHistory';
import {formatDateTime} from './format';

/** Side panel for one playlist: its mood, and every song with the prompt it came from. */
export function PlaylistDrawer({
  playlist,
  tracks,
  onClose,
}: {
  playlist: PlaylistRecord | null;
  tracks: TrackRecord[];
  onClose: () => void;
}) {
  const onOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    }
  };

  return (
    <Drawer isOpen={playlist !== null} onOpenChange={onOpenChange} width={460} label="Playlist details">
      {playlist && (
        <VStack gap={0}>
          <DrawerHeader
            title={playlist.name}
            subtitle={`${tracks.length} songs · ${formatDuration(playlist.durationSec)}`}
            onOpenChange={onOpenChange}
            startContent={<MoodArt mood={playlist.mood} size={40} />}
          />
          <VStack gap={5} padding={5}>
            <MetadataList orientation="vertical">
              <MetadataListItem label="Created">{formatDateTime(playlist.createdAt)}</MetadataListItem>
              <MetadataListItem label="Started by">{SOURCE_LABEL[playlist.source]}</MetadataListItem>
              <MetadataListItem label="Mood">
                {describeValue('energy', playlist.mood.energy)},{' '}
                {describeValue('valence', playlist.mood.valence)},{' '}
                {describeValue('texture', playlist.mood.texture)}
              </MetadataListItem>
            </MetadataList>

            <HStack gap={2} wrap="wrap">
              <Button label="Play playlist" variant="primary" icon={<Icon icon={PlayIcon} />} />
              <Button
                label="Generate more like this"
                variant="secondary"
                icon={<Icon icon={ArrowPathIcon} />}
                href={generateHref(playlist.mood)}
                as={NextLink}
              />
            </HStack>

            <Divider />

            <VStack gap={4}>
              {tracks.map((row, i) => (
                <VStack key={row.id} gap={2}>
                  {i > 0 && <Divider />}
                  <HStack gap={3} vAlign="center">
                    <MoodArt mood={row.track.mood} size={44} />
                    <StackItem size="fill">
                      <VStack gap={0.5}>
                        <Text weight="semibold">{row.track.title}</Text>
                        <Text type="supporting">
                          {formatDuration(row.track.durationSec)} · played {row.plays}×
                        </Text>
                      </VStack>
                    </StackItem>
                    <IconButton
                      label={`Play ${row.track.title}`}
                      variant="secondary"
                      size="sm"
                      icon={<Icon icon={PlayIcon} />}
                    />
                  </HStack>
                  <Text type="code" maxLines={2}>
                    {row.track.prompt}
                  </Text>
                </VStack>
              ))}
            </VStack>
          </VStack>
        </VStack>
      )}
    </Drawer>
  );
}
