'use client';

import {usePathname} from 'next/navigation';
import {SideNav, SideNavHeading, SideNavItem, SideNavSection} from '@astryxdesign/core/SideNav';
import {Icon} from '@astryxdesign/core/Icon';
import {Avatar} from '@astryxdesign/core/Avatar';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {
  HomeIcon,
  SparklesIcon,
  BuildingStorefrontIcon,
  ClockIcon,
  Square3Stack3DIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  ChevronUpDownIcon,
  MusicalNoteIcon as MusicalNoteIconOutline,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  SparklesIcon as SparklesIconSolid,
  BuildingStorefrontIcon as BuildingStorefrontIconSolid,
  ClockIcon as ClockIconSolid,
  Square3Stack3DIcon as Square3Stack3DIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  QuestionMarkCircleIcon as QuestionMarkCircleIconSolid,
  MusicalNoteIcon,
} from '@heroicons/react/24/solid';
import {currentVenue} from '../features/dashboard/mockData';

const mainItems = [
  {label: 'Home', href: '/', icon: HomeIcon, selectedIcon: HomeIconSolid},
  {
    label: 'Generate',
    href: '/generate',
    icon: MusicalNoteIconOutline,
    selectedIcon: MusicalNoteIcon,
  },
  {label: 'Mood Analysis', href: '/mood', icon: SparklesIcon, selectedIcon: SparklesIconSolid},
  {
    label: 'Venue Profile',
    href: '/venue',
    icon: BuildingStorefrontIcon,
    selectedIcon: BuildingStorefrontIconSolid,
  },
  {label: 'Music History', href: '/history', icon: ClockIcon, selectedIcon: ClockIconSolid},
  {
    label: 'Plan & Usage',
    href: '/plan',
    icon: Square3Stack3DIcon,
    selectedIcon: Square3Stack3DIconSolid,
  },
];

const footerItems = [
  {label: 'Settings', href: '/settings', icon: Cog6ToothIcon, selectedIcon: Cog6ToothIconSolid},
  {
    label: 'Help',
    href: '/help',
    icon: QuestionMarkCircleIcon,
    selectedIcon: QuestionMarkCircleIconSolid,
  },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <SideNav
      header={
        <SideNavHeading
          heading="Moodtrack"
          headingHref="/"
          icon={<Icon icon={MusicalNoteIcon} color="accent" />}
        />
      }
      footer={
        <VStack gap={4}>
          <HStack gap={3} vAlign="center" padding={2}>
            <Avatar name={currentVenue.name} shape="rounded" tooltip={false} />
            <VStack gap={0}>
              <Text weight="semibold" maxLines={1}>
                {currentVenue.name}
              </Text>
              <Text type="supporting">{currentVenue.plan}</Text>
            </VStack>
            <Icon icon={ChevronUpDownIcon} size="sm" color="secondary" />
          </HStack>
          <SideNavSection title="Account" isHeaderHidden>
            {footerItems.map(item => (
              <SideNavItem key={item.href} {...item} isSelected={pathname === item.href} />
            ))}
          </SideNavSection>
        </VStack>
      }>
      <SideNavSection title="Menu" isHeaderHidden>
        {mainItems.map(item => (
          <SideNavItem key={item.href} {...item} isSelected={pathname === item.href} />
        ))}
      </SideNavSection>
    </SideNav>
  );
}
