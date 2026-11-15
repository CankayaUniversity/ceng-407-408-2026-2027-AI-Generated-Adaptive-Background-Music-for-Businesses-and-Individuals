'use client';

import {Card} from '@astryxdesign/core/Card';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {Button} from '@astryxdesign/core/Button';
import {Slider} from '@astryxdesign/core/Slider';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Divider} from '@astryxdesign/core/Divider';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {AdjustmentsHorizontalIcon, SparklesIcon} from '@heroicons/react/24/outline';
import type {MoodAxis, MoodVector} from '../mood/types';
import {describeValue} from '../mood/axisMeaning';
import type {GenerationRequest, VocalMode} from './types';
import {MIN_SONGS, PLAN_SONG_LIMIT} from './service';

export const moodPresets: Array<{label: string; mood: MoodVector}> = [
  {label: 'Morning coffee', mood: {valence: 0.5, energy: -0.3, texture: -0.6}},
  {label: 'Lunch rush', mood: {valence: 0.6, energy: 0.6, texture: 0.1}},
  {label: 'Evening lounge', mood: {valence: 0.4, energy: -0.1, texture: -0.3}},
  {label: 'Late-night bar', mood: {valence: 0.2, energy: 0.5, texture: 0.7}},
  {label: 'Focus', mood: {valence: 0.1, energy: -0.6, texture: 0.2}},
];

const axes: Array<{key: MoodAxis; label: string; range: string}> = [
  {key: 'valence', label: 'Valence', range: 'Sad → Happy'},
  {key: 'energy', label: 'Energy', range: 'Calm → Energetic'},
  {key: 'texture', label: 'Texture', range: 'Acoustic → Electronic'},
];

const durations = [
  {value: '60', label: '1 min'},
  {value: '120', label: '2 min'},
  {value: '180', label: '3 min'},
];

/** Left column: what to generate. */
export function GenerationSettingsCard({
  request,
  onChange,
  currentMood,
  onPlan,
  isPlanning,
  isLocked,
}: {
  request: GenerationRequest;
  onChange: (next: GenerationRequest) => void;
  currentMood: MoodVector;
  onPlan: () => void;
  isPlanning: boolean;
  /** True while songs are generating; settings are read-only then. */
  isLocked: boolean;
}) {
  const setMood = (mood: MoodVector) => onChange({...request, mood});

  return (
    <Card padding={5}>
      <VStack gap={5}>
        <HStack gap={2} vAlign="center">
          <Icon icon={AdjustmentsHorizontalIcon} color="accent" />
          <Heading level={3}>Mood & Options</Heading>
        </HStack>

        <VStack gap={2}>
          <Text weight="medium">Start from</Text>
          <HStack gap={2} wrap="wrap">
            <Button
              label="Current mood"
              size="sm"
              variant="secondary"
              icon={<Icon icon={SparklesIcon} />}
              isDisabled={isLocked}
              onClick={() => setMood(currentMood)}
            />
            {moodPresets.map(preset => (
              <Button
                key={preset.label}
                label={preset.label}
                size="sm"
                variant="ghost"
                isDisabled={isLocked}
                onClick={() => setMood(preset.mood)}
              />
            ))}
          </HStack>
        </VStack>

        <VStack gap={4}>
          {axes.map(axis => {
            const value = request.mood[axis.key];
            return (
              <Slider
                key={axis.key}
                label={`${axis.label} · ${value.toFixed(2)}`}
                description={`${axis.range} — now ${describeValue(axis.key, value)}`}
                min={-1}
                max={1}
                step={0.05}
                value={value}
                isDisabled={isLocked}
                onChange={(v: number) => setMood({...request.mood, [axis.key]: v})}
                formatValue={v => v.toFixed(2)}
              />
            );
          })}
        </VStack>

        <TextArea
          label="Describe the vibe"
          description="Optional. Added to every song prompt."
          placeholder="e.g. rainy evening, candles on the tables, quiet conversations"
          rows={2}
          maxLength={200}
          value={request.description}
          onChange={description => onChange({...request, description})}
        />

        <Divider />

        <Slider
          label={`Number of songs · ${request.count}`}
          description={`Your plan allows up to ${PLAN_SONG_LIMIT} songs per playlist.`}
          min={MIN_SONGS}
          max={PLAN_SONG_LIMIT}
          value={request.count}
          isDisabled={isLocked}
          onChange={(v: number) => onChange({...request, count: v})}
        />

        <HStack gap={6} wrap="wrap">
          <VStack gap={2}>
            <Text weight="medium">Vocals</Text>
            <SegmentedControl
              label="Vocals"
              value={request.vocals}
              onChange={v => onChange({...request, vocals: v as VocalMode})}>
              <SegmentedControlItem value="instrumental" label="Instrumental" />
              <SegmentedControlItem value="vocals" label="With vocals" />
            </SegmentedControl>
          </VStack>
          <VStack gap={2}>
            <Text weight="medium">Song length</Text>
            <SegmentedControl
              label="Song length"
              value={String(request.durationSec)}
              onChange={v => onChange({...request, durationSec: Number(v)})}>
              {durations.map(d => (
                <SegmentedControlItem key={d.value} value={d.value} label={d.label} />
              ))}
            </SegmentedControl>
          </VStack>
        </HStack>

        <Button
          label={`Plan ${request.count} songs`}
          variant="primary"
          size="lg"
          width="100%"
          icon={<Icon icon={SparklesIcon} />}
          isLoading={isPlanning}
          isDisabled={isLocked}
          onClick={onPlan}
        />
      </VStack>
    </Card>
  );
}
