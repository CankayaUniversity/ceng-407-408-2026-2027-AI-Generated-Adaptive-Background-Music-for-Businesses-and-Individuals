'use client';

import {Card} from '@astryxdesign/core/Card';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {Button} from '@astryxdesign/core/Button';
import {IconButton} from '@astryxdesign/core/IconButton';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Spinner} from '@astryxdesign/core/Spinner';
import {List, ListItem} from '@astryxdesign/core/List';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MusicalNoteIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import {PauseIcon, PlayIcon} from '@heroicons/react/24/solid';
import {MoodArt} from '../mood/MoodArt';
import {formatDuration} from '../player/types';
import type {MoodVector} from '../mood/types';
import type {GenerationJob, PlannedPrompt} from './types';

function statusLine(job: GenerationJob) {
  switch (job.status) {
    case 'queued':
      return (
        <HStack gap={1.5} vAlign="center">
          <Icon icon={ClockIcon} size="sm" color="secondary" />
          <Text type="supporting">Queued</Text>
        </HStack>
      );
    case 'generating':
      return (
        <HStack gap={1.5} vAlign="center">
          <Spinner size="sm" />
          <Text type="supporting">Generating…</Text>
        </HStack>
      );
    case 'ready':
      return (
        <HStack gap={1.5} vAlign="center">
          <Icon icon={CheckCircleIcon} size="sm" color="success" />
          <Text type="supporting">
            Ready · {job.track ? formatDuration(job.track.durationSec) : ''}
          </Text>
        </HStack>
      );
    case 'failed':
      return (
        <HStack gap={1.5} vAlign="center">
          <Icon icon={ExclamationTriangleIcon} size="sm" color="error" />
          <Text type="supporting">{job.error ?? 'Generation failed.'}</Text>
        </HStack>
      );
  }
}

/** Step 2: one row per song while it generates; ready songs can be played. */
export function GenerationProgressCard({
  prompts,
  jobs,
  mood,
  playingId,
  onTogglePlay,
  onRetry,
  onStartOver,
}: {
  prompts: PlannedPrompt[];
  jobs: Record<string, GenerationJob>;
  mood: MoodVector;
  playingId: string | null;
  onTogglePlay: (promptId: string) => void;
  onRetry: (promptId: string) => void;
  onStartOver: () => void;
}) {
  const list = prompts.map(p => jobs[p.id]).filter(Boolean);
  const ready = list.filter(j => j.status === 'ready').length;
  const failed = list.filter(j => j.status === 'failed').length;
  const isDone = ready + failed === list.length;

  return (
    <Card padding={5}>
      <VStack gap={4}>
        <HStack hAlign="between" vAlign="center" gap={3} wrap="wrap">
          <HStack gap={2} vAlign="center">
            <Icon icon={MusicalNoteIcon} color="accent" />
            <Heading level={3}>{isDone ? 'Your Playlist' : 'Generating'}</Heading>
          </HStack>
          {isDone && (
            <Button
              label="New playlist"
              size="sm"
              variant="secondary"
              icon={<Icon icon={PlusIcon} />}
              onClick={onStartOver}
            />
          )}
        </HStack>

        <VStack gap={1}>
          <ProgressBar
            label="Songs ready"
            isLabelHidden
            value={ready}
            max={list.length}
            variant={isDone && failed === 0 ? 'success' : 'accent'}
          />
          <Text type="supporting">
            {ready} of {list.length} ready
            {failed > 0 ? ` · ${failed} failed` : ''}
            {!isDone ? ' · you can play songs as soon as they are ready' : ''}
          </Text>
        </VStack>

        <List hasDividers edge="flush">
          {prompts.map(p => {
            const job = jobs[p.id];
            if (!job) {
              return null;
            }
            const isPlaying = playingId === p.id;
            return (
              <ListItem
                key={p.id}
                itemKey={p.id}
                startContent={<MoodArt mood={job.track?.mood ?? mood} size={48} />}
                label={p.title}
                description={statusLine(job)}
                endContent={
                  job.status === 'ready' ? (
                    <IconButton
                      label={isPlaying ? `Pause ${p.title}` : `Play ${p.title}`}
                      variant={isPlaying ? 'primary' : 'secondary'}
                      icon={<Icon icon={isPlaying ? PauseIcon : PlayIcon} />}
                      onClick={() => onTogglePlay(p.id)}
                    />
                  ) : job.status === 'failed' ? (
                    <Button
                      label="Retry"
                      size="sm"
                      variant="secondary"
                      icon={<Icon icon={ArrowPathIcon} />}
                      onClick={() => onRetry(p.id)}
                    />
                  ) : undefined
                }
              />
            );
          })}
        </List>
      </VStack>
    </Card>
  );
}
