'use client';

import {useEffect, useState} from 'react';
import {Layout, LayoutContent, HStack, VStack, StackItem} from '@astryxdesign/core/Layout';
import {Grid} from '@astryxdesign/core/Grid';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {Button} from '@astryxdesign/core/Button';
import {Banner} from '@astryxdesign/core/Banner';
import {Spinner} from '@astryxdesign/core/Spinner';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {PencilSquareIcon} from '@heroicons/react/24/outline';
import {ATMOSPHERES, DAYPARTS, LYRIC_LANGUAGES, emptyProfile, venueTypeLabel} from './options';
import {MusicIdentityCard} from './MusicIdentityCard';
import {VenueOnboardingWizard} from './VenueOnboardingWizard';
import {venueService} from './service';
import type {VenueProfile} from './types';

const vocalsLabel = {
  instrumental: 'Instrumental only',
  mixed: 'Mostly instrumental, some vocals',
  vocals: 'Songs with vocals',
} as const;

function ProfileDetails({profile}: {profile: VenueProfile}) {
  return (
    <Card padding={5}>
      <VStack gap={4}>
        <Heading level={3}>Answers</Heading>
        <MetadataList orientation="vertical">
          <MetadataListItem label="Type">{venueTypeLabel(profile.type)}</MetadataListItem>
          <MetadataListItem label="Open">
            {profile.dayparts
              .filter(d => d.isOpen)
              .map(d => {
                const label = DAYPARTS.find(x => x.id === d.id)?.label;
                return d.concept === profile.type ? label : `${label} (${venueTypeLabel(d.concept)})`;
              })
              .join(', ')}
          </MetadataListItem>
          <MetadataListItem label="Guests">{profile.audience.join(', ') || 'Not specified'}</MetadataListItem>
          <MetadataListItem label="Atmosphere">
            {profile.atmosphere.map(a => ATMOSPHERES.find(x => x.value === a)?.label).join(', ') ||
              'Not specified'}
          </MetadataListItem>
          <MetadataListItem label="Likes">{profile.likedGenres.join(', ')}</MetadataListItem>
          <MetadataListItem label="Avoids">{profile.avoidGenres.join(', ') || 'Nothing'}</MetadataListItem>
          <MetadataListItem label="Vocals">{vocalsLabel[profile.vocals]}</MetadataListItem>
          {profile.vocals !== 'instrumental' && (
            <MetadataListItem label="Lyrics">
              {profile.lyricLanguages
                .filter(l => l !== 'none')
                .map(l => LYRIC_LANGUAGES.find(x => x.value === l)?.label)
                .join(', ') || 'Any language'}
            </MetadataListItem>
          )}
          <MetadataListItem label="Tempo & volume">
            {profile.keepModerate ? 'Kept moderate' : 'Follows the room'}
          </MetadataListItem>
          {profile.notes.trim() && <MetadataListItem label="Notes">{profile.notes}</MetadataListItem>}
        </MetadataList>
      </VStack>
    </Card>
  );
}

/**
 * Venue Profile: the onboarding wizard the first time, then the saved profile
 * and its music identity, with an Edit button that reopens the wizard.
 */
export function VenueProfileScreen() {
  const [profile, setProfile] = useState<VenueProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    venueService.load().then(saved => {
      setProfile(saved);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <Layout
        height="fill"
        content={
          <LayoutContent padding={6}>
            <VStack hAlign="center" gap={3}>
              <Spinner size="lg" />
            </VStack>
          </LayoutContent>
        }
      />
    );
  }

  if (!profile || isEditing) {
    return (
      <VenueOnboardingWizard
        initial={profile ?? emptyProfile()}
        onCancel={profile ? () => setIsEditing(false) : undefined}
        onSaved={saved => {
          setProfile(saved);
          setIsEditing(false);
          setJustSaved(true);
        }}
      />
    );
  }

  return (
    <Layout
      height="fill"
      content={
        <LayoutContent padding={6}>
          <VStack gap={6}>
            <HStack gap={4} vAlign="start" wrap="wrap">
              <StackItem size="fill">
                <VStack gap={1}>
                  <Heading level={1}>{profile.name}</Heading>
                  <Text color="secondary">
                    {venueTypeLabel(profile.type)} · Venue profile
                    {profile.updatedAt
                      ? ` · updated ${new Date(profile.updatedAt).toLocaleDateString('en-GB')}`
                      : ''}
                  </Text>
                </VStack>
              </StackItem>
              <Button
                label="Edit answers"
                variant="secondary"
                icon={<Icon icon={PencilSquareIcon} />}
                onClick={() => {
                  setJustSaved(false);
                  setIsEditing(true);
                }}
              />
            </HStack>

            {justSaved && (
              <Banner
                status="success"
                title="Profile saved"
                description="New playlists will start from this music identity."
                isDismissable
              />
            )}

            <Grid columns={{minWidth: 400, repeat: 'fit'}} gap={5} align="start">
              {profile.identity && <MusicIdentityCard identity={profile.identity} hasGenerateLinks />}
              <ProfileDetails profile={profile} />
            </Grid>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
