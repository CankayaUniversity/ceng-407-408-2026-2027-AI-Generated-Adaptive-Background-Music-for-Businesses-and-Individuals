'use client';

import {useId, useState} from 'react';
import {Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {Card} from '@astryxdesign/core/Card';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {Selector} from '@astryxdesign/core/Selector';
import {ArrowTrendingUpIcon} from '@heroicons/react/24/outline';
import type {MoodAxis, MoodHistoryPoint} from './types';

/**
 * What each value on an axis means. Every axis runs from -1 to +1:
 * `low` is the -1 end, `high` the +1 end, and the ticks in between name the
 * steps, so the chart reads as words instead of bare numbers.
 */
const axisMeaning: Record<
  MoodAxis,
  {label: string; low: string; high: string; ticks: Record<string, string>}
> = {
  energy: {
    label: 'Energy',
    low: 'calm',
    high: 'energetic',
    ticks: {'-1': 'Calm', '-0.5': 'Relaxed', '0': 'Neutral', '0.5': 'Lively', '1': 'Energetic'},
  },
  valence: {
    label: 'Valence',
    low: 'sad',
    high: 'happy',
    ticks: {'-1': 'Sad', '-0.5': 'Melancholic', '0': 'Neutral', '0.5': 'Upbeat', '1': 'Happy'},
  },
  texture: {
    label: 'Texture',
    low: 'acoustic',
    high: 'electronic',
    ticks: {
      '-1': 'Acoustic',
      '-0.5': 'More acoustic',
      '0': 'Balanced',
      '0.5': 'More electronic',
      '1': 'Electronic',
    },
  },
};

const axisOptions = (Object.keys(axisMeaning) as MoodAxis[]).map(value => ({
  value,
  label: axisMeaning[value].label,
}));

/** Puts a value into words, e.g. 0.30 on energy -> "slightly energetic". */
export function describeValue(axis: MoodAxis, value: number): string {
  const {low, high} = axisMeaning[axis];
  const size = Math.abs(value);
  if (size < 0.15) {
    return axis === 'texture' ? 'balanced' : 'neutral';
  }
  const word = value > 0 ? high : low;
  if (size < 0.5) {
    return `slightly ${word}`;
  }
  if (size < 0.8) {
    return word;
  }
  return `very ${word}`;
}

const tick = {fontSize: 'var(--font-size-sm)', fill: 'var(--color-text-secondary)'};

function HistoryTooltip({
  active,
  payload,
  label,
  axis,
}: {
  active?: boolean;
  payload?: Array<{value: number}>;
  label?: string;
  axis: MoodAxis;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const value = payload[0].value;
  return (
    <Card padding={2} elevation="med">
      <VStack gap={0.5}>
        <Text type="supporting">{label}</Text>
        <Text>
          <Text weight="semibold">{value.toFixed(2)}</Text> · {describeValue(axis, value)}
        </Text>
      </VStack>
    </Card>
  );
}

/** How one mood axis moved through the day, one point per snapshot. */
export function MoodHistoryCard({history}: {history: MoodHistoryPoint[]}) {
  const id = useId();
  const [axis, setAxis] = useState<MoodAxis>('energy');
  const meaning = axisMeaning[axis];

  return (
    <Card padding={5}>
      <VStack gap={4}>
        <HStack hAlign="between" vAlign="center">
          <HStack gap={2} vAlign="center">
            <Icon icon={ArrowTrendingUpIcon} color="blue" />
            <Heading level={3}>Mood History</Heading>
          </HStack>
          <Selector
            label="Axis shown"
            isLabelHidden
            size="sm"
            options={axisOptions}
            value={axis}
            onChange={v => setAxis(v as MoodAxis)}
          />
        </HStack>
        <Text type="supporting">
          Each point is one camera snapshot. The scale runs from −1 ({meaning.low}) to +1 (
          {meaning.high}); 0 is {axis === 'texture' ? 'balanced' : 'neutral'}.
        </Text>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={history} margin={{top: 10, right: 20, left: 0, bottom: 10}}>
            <defs>
              <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{stopColor: 'var(--color-data-blue-2)'}} stopOpacity={0.6} />
                <stop offset="1" style={{stopColor: 'var(--color-data-blue-1)'}} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="time" tick={tick} axisLine={false} tickLine={false} interval={1} />
            <YAxis
              domain={[-1, 1]}
              ticks={[-1, -0.5, 0, 0.5, 1]}
              tickFormatter={(v: number) => meaning.ticks[String(v)] ?? v.toFixed(1)}
              tick={tick}
              axisLine={false}
              tickLine={false}
              width={axis === 'texture' ? 104 : 84}
            />
            <Tooltip
              content={<HistoryTooltip axis={axis} />}
              cursor={{stroke: 'var(--color-border)'}}
            />
            <Area
              type="monotone"
              dataKey={axis}
              name={meaning.label}
              stroke="var(--color-data-blue-4)"
              strokeWidth={2.5}
              fill={`url(#${id}-fill)`}
              dot={{r: 3.5, fill: 'var(--color-data-blue-4)', strokeWidth: 0}}
              activeDot={{r: 5}}
            />
          </AreaChart>
        </ResponsiveContainer>
      </VStack>
    </Card>
  );
}
