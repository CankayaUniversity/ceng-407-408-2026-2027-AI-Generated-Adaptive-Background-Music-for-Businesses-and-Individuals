'use client';

import {Layout, LayoutContent, HStack, VStack} from '@astryxdesign/core/Layout';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Avatar} from '@astryxdesign/core/Avatar';
import {BellIcon} from '@heroicons/react/24/outline';
import {NowPlayingCard} from '../features/player/NowPlayingCard';
import {QueueCard} from '../features/player/QueueCard';
import {CurrentMoodCard} from '../features/mood/CurrentMoodCard';
import {AdaptiveModeCard} from '../features/mood/AdaptiveModeCard';
import {SceneTiles} from '../features/mood/SceneTiles';
import {MoodHistoryCard} from '../features/mood/MoodHistoryCard';
import {
  adaptiveSettings,
  currentAnalysis,
  currentUser,
  moodHistory,
  nowPlaying,
  queue,
} from '../features/dashboard/mockData';

/** Home dashboard: what is playing, the current mood and how it changed today. */
export default function DashboardPage() {
  return (
    <Layout
      height="fill"
      content={
        <LayoutContent padding={6}>
          <VStack gap={6}>
            <HStack hAlign="between" vAlign="start" gap={4}>
              <VStack gap={1}>
                <Heading level={1}>Hello, {currentUser.firstName} 👋</Heading>
                <Text color="secondary">Music matched to your venue’s atmosphere is playing now.</Text>
              </VStack>
              <HStack gap={3} vAlign="center">
                <IconButton label="Notifications" variant="ghost" icon={<Icon icon={BellIcon} />} />
                <Avatar name={currentUser.firstName} />
              </HStack>
            </HStack>

            <Grid columns={{minWidth: 440, repeat: 'fit'}} gap={5}>
              <NowPlayingCard track={nowPlaying} />
              <CurrentMoodCard analysis={currentAnalysis} />
            </Grid>

            <Grid columns={{minWidth: 440, repeat: 'fit'}} gap={5} align="center">
              <AdaptiveModeCard
                initialEnabled={adaptiveSettings.isEnabled}
                nextSnapshotInSec={adaptiveSettings.nextSnapshotInSec}
                lastMood={currentAnalysis.mood}
              />
              <SceneTiles scene={currentAnalysis.scene} />
            </Grid>

            <Grid columns={{minWidth: 440, repeat: 'fit'}} gap={5}>
              <MoodHistoryCard history={moodHistory} />
              <QueueCard tracks={queue} />
            </Grid>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
