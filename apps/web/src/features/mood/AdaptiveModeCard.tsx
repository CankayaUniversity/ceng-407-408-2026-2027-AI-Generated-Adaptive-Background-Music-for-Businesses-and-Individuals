'use client';

import {useEffect, useState} from 'react';
import {Card} from '@astryxdesign/core/Card';
import {HStack, VStack, StackItem} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {Switch} from '@astryxdesign/core/Switch';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {CameraIcon, ClockIcon, EyeSlashIcon} from '@heroicons/react/24/outline';
import {MoodArt} from './MoodArt';
import type {MoodVector} from './types';

/**
 * Periodic webcam adaptation. While on, the camera indicator is always visible
 * (KVKK: people in the venue must be able to tell the camera is in use).
 * The last snapshot is shown as a placeholder: real frames are blurred and
 * deleted right after analysis, so the UI never keeps a photo of guests.
 */
export function AdaptiveModeCard({
  initialEnabled,
  nextSnapshotInSec,
  lastMood,
}: {
  initialEnabled: boolean;
  nextSnapshotInSec: number;
  lastMood: MoodVector;
}) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [secondsLeft, setSecondsLeft] = useState(nextSnapshotInSec);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft(s => (s <= 1 ? nextSnapshotInSec : s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isEnabled, nextSnapshotInSec]);

  const minutesLeft = Math.max(1, Math.ceil(secondsLeft / 60));

  return (
    <Card padding={5}>
      <HStack gap={5} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          <VStack gap={4}>
            <VStack gap={1}>
              <HStack gap={2} vAlign="center" hAlign="between">
                <HStack gap={2} vAlign="center">
                  <Icon icon={CameraIcon} color="blue" />
                  <Heading level={3}>Adaptive Mode</Heading>
                </HStack>
                <Switch
                  label="Turn on adaptive mode"
                  isLabelHidden
                  value={isEnabled}
                  onChange={checked => {
                    setIsEnabled(checked);
                    setSecondsLeft(nextSnapshotInSec);
                  }}
                />
              </HStack>
              <Text type="supporting">Analyzes the room and updates the music automatically.</Text>
            </VStack>
            <HStack gap={4} vAlign="center" wrap="wrap">
              <HStack gap={2} vAlign="center">
                <StatusDot
                  variant={isEnabled ? 'success' : 'neutral'}
                  label={isEnabled ? 'Camera on' : 'Camera off'}
                  isPulsing={isEnabled}
                />
                <Text weight="medium">{isEnabled ? 'Camera on' : 'Camera off'}</Text>
              </HStack>
              {isEnabled && (
                <HStack gap={2} vAlign="center">
                  <Icon icon={ClockIcon} size="sm" color="secondary" />
                  <Text>Next analysis: {minutesLeft} min</Text>
                </HStack>
              )}
            </HStack>
          </VStack>
        </StackItem>
        <VStack gap={1} hAlign="center">
          <MoodArt mood={lastMood} size={112} />
          <HStack gap={1} vAlign="center">
            <Icon icon={EyeSlashIcon} size="xsm" color="secondary" />
            <Text type="supporting">Last frame deleted</Text>
          </HStack>
        </VStack>
      </HStack>
    </Card>
  );
}
