'use client';

import NextLink from 'next/link';
import {Card} from '@astryxdesign/core/Card';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {Token} from '@astryxdesign/core/Token';
import {Button} from '@astryxdesign/core/Button';
import {List, ListItem} from '@astryxdesign/core/List';
import {SparklesIcon} from '@heroicons/react/24/outline';
import {MoodArt} from '../mood/MoodArt';
import {describeValue} from '../mood/axisMeaning';
import {generateHref} from '../generation/links';
import {DAYPART_PALETTE, DAYPARTS, venueTypeLabel} from './options';
import type {MusicIdentity} from './types';

/** The AI's reading of the venue: a style summary and a starting mood per part of the day. */
export function MusicIdentityCard({
  identity,
  hasGenerateLinks = false,
}: {
  identity: MusicIdentity;
  /** Show a "Generate" button per part of the day (on the saved profile). */
  hasGenerateLinks?: boolean;
}) {
  return (
    <Card padding={5}>
      <VStack gap={4}>
        <HStack gap={2} vAlign="center">
          <Icon icon={SparklesIcon} color="accent" />
          <Heading level={3}>Music Identity</Heading>
        </HStack>
        <Text>{identity.summary}</Text>
        <HStack gap={2} wrap="wrap">
          {identity.styleTags.map(tag => (
            <Token key={tag} label={tag} size="sm" color="blue" />
          ))}
        </HStack>
        <VStack gap={1}>
          <Text weight="semibold">Starting mood through the day</Text>
          <Text type="supporting">
            Used until the camera reads the room; adaptive mode adjusts from here.
          </Text>
        </VStack>
        <List hasDividers edge="flush">
          {identity.daypartMoods.map(({daypart, concept, mood}) => {
            const part = DAYPARTS.find(d => d.id === daypart);
            return (
              <ListItem
                key={daypart}
                itemKey={daypart}
                startContent={
                  <MoodArt
                    mood={mood}
                    size={44}
                    palette={DAYPART_PALETTE[daypart]}
                    icon={part?.icon}
                  />
                }
                label={`${part?.label} · ${venueTypeLabel(concept)}`}
                description={`${part?.hours} · ${describeValue('energy', mood.energy)}, ${describeValue(
                  'valence',
                  mood.valence,
                )}, ${describeValue('texture', mood.texture)}`}
                endContent={
                  hasGenerateLinks ? (
                    <Button
                      label="Generate"
                      size="sm"
                      variant="secondary"
                      href={generateHref(mood)}
                      as={NextLink}
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
