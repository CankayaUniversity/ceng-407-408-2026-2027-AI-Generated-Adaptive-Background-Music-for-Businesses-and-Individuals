'use client';

import type {ComponentType, SVGProps} from 'react';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {HStack, VStack, StackItem} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {BoltIcon, FaceSmileIcon, Square3Stack3DIcon} from '@heroicons/react/24/outline';
import {SparklesIcon} from '@heroicons/react/24/solid';
import {MoodMap} from './MoodMap';
import type {MoodAnalysis, MoodAxis} from './types';

const axes: Array<{
  key: MoodAxis;
  label: string;
  hint: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  variant: 'accent' | 'success';
}> = [
  {key: 'valence', label: 'Valence', hint: 'Sad → Happy', icon: FaceSmileIcon, variant: 'accent'},
  {key: 'energy', label: 'Energy', hint: 'Calm → Energetic', icon: BoltIcon, variant: 'success'},
  {key: 'texture', label: 'Texture', hint: 'Acoustic → Electronic', icon: Square3Stack3DIcon, variant: 'accent'},
];

/** The latest mood: AI summary, the three axes and the circumplex map. */
export function CurrentMoodCard({analysis}: {analysis: MoodAnalysis}) {
  return (
    <Card padding={6}>
      <Grid columns={{minWidth: 240, repeat: 'fit'}} gap={6} align="center">
        <VStack gap={4}>
          <HStack gap={2} vAlign="center">
            <Icon icon={SparklesIcon} color="accent" />
            <Heading level={3}>Current Mood</Heading>
          </HStack>
          <Text>“{analysis.summary}”</Text>
          <VStack gap={3}>
            {axes.map(axis => {
              const value = analysis.mood[axis.key];
              return (
                <HStack key={axis.key} gap={3} vAlign="center">
                  <Icon icon={axis.icon} color="blue" />
                  <StackItem size="static">
                    <Text weight="medium">{axis.label}</Text>
                  </StackItem>
                  <StackItem size="fill">
                    <ProgressBar
                      label={`${axis.label} (${axis.hint})`}
                      isLabelHidden
                      value={value + 1}
                      max={2}
                      variant={axis.variant}
                    />
                  </StackItem>
                  <Text weight="semibold" hasTabularNumbers>
                    {value.toFixed(2)}
                  </Text>
                </HStack>
              );
            })}
          </VStack>
        </VStack>
        <MoodMap mood={analysis.mood} />
      </Grid>
    </Card>
  );
}
