'use client';

import NextLink from 'next/link';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {Button} from '@astryxdesign/core/Button';
import {Slider} from '@astryxdesign/core/Slider';
import {Token} from '@astryxdesign/core/Token';
import {Divider} from '@astryxdesign/core/Divider';
import {ArrowUturnLeftIcon, MusicalNoteIcon, SparklesIcon} from '@heroicons/react/24/outline';
import {MoodMap} from '../MoodMap';
import {SceneTiles} from '../SceneTiles';
import {axisMeaning, describeValue} from '../axisMeaning';
import type {MoodAnalysis, MoodAxis, MoodVector} from '../types';

const axisOrder: MoodAxis[] = ['valence', 'energy', 'texture'];

export function generateHref(mood: MoodVector) {
  const params = new URLSearchParams({
    valence: mood.valence.toFixed(2),
    energy: mood.energy.toFixed(2),
    texture: mood.texture.toFixed(2),
  });
  return `/generate?${params.toString()}`;
}

/** What the AI read, with sliders to fine-tune the mood before using it. */
export function AnalysisResultCard({
  analysis,
  mood,
  onMoodChange,
}: {
  analysis: MoodAnalysis;
  /** The mood after the user's tuning; starts as `analysis.mood`. */
  mood: MoodVector;
  onMoodChange: (mood: MoodVector) => void;
}) {
  const isTuned = axisOrder.some(axis => mood[axis] !== analysis.mood[axis]);

  return (
    <Card padding={5}>
      <VStack gap={5}>
        <VStack gap={2}>
          <HStack gap={2} vAlign="center">
            <Icon icon={SparklesIcon} color="accent" />
            <Heading level={3}>Detected Mood</Heading>
          </HStack>
          <Text>“{analysis.summary}”</Text>
          <HStack gap={2} wrap="wrap">
            {analysis.tags.map(tag => (
              <Token key={tag} label={tag} size="sm" color="blue" />
            ))}
          </HStack>
        </VStack>

        <SceneTiles scene={analysis.scene} />

        <Divider />

        <Grid columns={{minWidth: 220, repeat: 'fit'}} gap={5} align="center">
          <VStack gap={4}>
            <HStack hAlign="between" vAlign="center">
              <Text weight="semibold">Fine-tune</Text>
              <Button
                label="Reset to AI values"
                size="sm"
                variant="ghost"
                icon={<Icon icon={ArrowUturnLeftIcon} />}
                isDisabled={!isTuned}
                onClick={() => onMoodChange(analysis.mood)}
              />
            </HStack>
            {axisOrder.map(axis => (
              <Slider
                key={axis}
                label={`${axisMeaning[axis].label} · ${mood[axis].toFixed(2)}`}
                description={describeValue(axis, mood[axis])}
                min={-1}
                max={1}
                step={0.05}
                value={mood[axis]}
                onChange={(v: number) => onMoodChange({...mood, [axis]: v})}
                formatValue={v => v.toFixed(2)}
              />
            ))}
          </VStack>
          <MoodMap mood={mood} />
        </Grid>

        <Button
          label="Generate a playlist with this mood"
          variant="primary"
          size="lg"
          width="100%"
          icon={<Icon icon={MusicalNoteIcon} />}
          href={generateHref(mood)}
          as={NextLink}
        />
      </VStack>
    </Card>
  );
}
