import type {ComponentType, SVGProps} from 'react';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {VStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {BuildingStorefrontIcon, ClockIcon, SunIcon, UserGroupIcon} from '@heroicons/react/24/outline';
import type {SceneInfo} from './types';

type Tile = {
  label: string;
  value: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  variant: 'blue' | 'green' | 'yellow' | 'cyan';
  iconColor: 'blue' | 'green' | 'orange' | 'cyan';
};

/** What the AI saw in the last snapshot: venue type, crowd, light, time of day. */
export function SceneTiles({scene}: {scene: SceneInfo}) {
  const tiles: Tile[] = [
    {label: 'Venue Type', value: scene.venueType, icon: BuildingStorefrontIcon, variant: 'blue', iconColor: 'blue'},
    {label: 'Crowd', value: scene.crowd, icon: UserGroupIcon, variant: 'green', iconColor: 'green'},
    {label: 'Lighting', value: scene.lighting, icon: SunIcon, variant: 'yellow', iconColor: 'orange'},
    {label: 'Time of Day', value: scene.timeOfDay, icon: ClockIcon, variant: 'cyan', iconColor: 'cyan'},
  ];

  return (
    <Grid columns={{minWidth: 130, repeat: 'fit'}} gap={3}>
      {tiles.map(tile => (
        <Card key={tile.label} variant={tile.variant} padding={4}>
          <VStack gap={3} hAlign="center">
            <Icon icon={tile.icon} size="lg" color={tile.iconColor} />
            <VStack gap={0.5} hAlign="center">
              <Text type="supporting" justify="center">
                {tile.label}
              </Text>
              <Heading level={4} justify="center">
                {tile.value}
              </Heading>
            </VStack>
          </VStack>
        </Card>
      ))}
    </Grid>
  );
}
