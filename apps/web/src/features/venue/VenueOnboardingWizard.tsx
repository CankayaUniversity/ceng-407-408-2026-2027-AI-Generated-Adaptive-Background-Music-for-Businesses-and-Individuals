'use client';

/**
 * Venue onboarding: the questions asked once when a venue joins, so its music
 * fits the place before the camera ever runs. Built on the Astryx
 * `form-wizard` template: pinned header with a Stepper, one step at a time,
 * validation on Next, and a footer with Back / Next.
 */

import {useId, useMemo, useRef, useState, type CSSProperties} from 'react';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {CheckboxList, CheckboxListItem} from '@astryxdesign/core/CheckboxList';
import {Divider} from '@astryxdesign/core/Divider';
import {Field} from '@astryxdesign/core/Field';
import {FileInput} from '@astryxdesign/core/FileInput';
import {FormLayout} from '@astryxdesign/core/FormLayout';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {Layout, LayoutContent, LayoutFooter, LayoutHeader} from '@astryxdesign/core/Layout';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {RadioList, RadioListItem} from '@astryxdesign/core/RadioList';
import {SelectableCard} from '@astryxdesign/core/SelectableCard';
import {Selector} from '@astryxdesign/core/Selector';
import {Spinner} from '@astryxdesign/core/Spinner';
import {HStack, StackItem, VStack} from '@astryxdesign/core/Stack';
import {Step, Stepper} from '@astryxdesign/core/Stepper';
import {Switch} from '@astryxdesign/core/Switch';
import {Heading, Text} from '@astryxdesign/core/Text';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {ToggleButton} from '@astryxdesign/core/ToggleButton';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {CheckIcon, NoSymbolIcon, SparklesIcon} from '@heroicons/react/24/outline';
import {
  ATMOSPHERES,
  AUDIENCES,
  DAYPARTS,
  GENRES,
  LYRIC_LANGUAGES,
  MAX_ATMOSPHERES,
  VENUE_TYPES,
  venueTypeLabel,
} from './options';
import {venueService} from './service';
import {MusicIdentityCard} from './MusicIdentityCard';
import type {MusicIdentity, VenueProfile, VenueType, VocalPreference} from './types';

const STEPS = [
  {label: 'Venue'},
  {label: 'Guests & vibe'},
  {label: 'Music'},
  {label: 'Photos', isOptional: true},
  {label: 'Review'},
];

// Keeps the step counter on the centre line (see the form-wizard template).
const footerZone: CSSProperties = {flexBasis: 0};

const conceptOptions = VENUE_TYPES.map(t => ({value: t.value, label: t.label}));

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value];
}

export function VenueOnboardingWizard({
  initial,
  onSaved,
  onCancel,
}: {
  initial: VenueProfile;
  onSaved: (profile: VenueProfile) => void;
  /** Present when editing an existing profile. */
  onCancel?: () => void;
}) {
  const isNarrow = useMediaQuery('(max-width: 640px)');
  const typeID = useId();
  const audienceID = useId();
  const atmosphereID = useId();
  const likedID = useId();
  const avoidID = useId();
  const nameRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState<ReadonlySet<number>>(new Set());
  const [profile, setProfile] = useState<VenueProfile>(initial);
  const [photos, setPhotos] = useState<File[]>([]);
  const [identity, setIdentity] = useState<MusicIdentity | null>(initial.identity ?? null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const update = (patch: Partial<VenueProfile>) => setProfile(p => ({...p, ...patch}));

  const errorsByStep = useMemo<Array<Record<string, string>>>(() => {
    const venue: Record<string, string> = {};
    if (!profile.name.trim()) {
      venue.name = 'Enter the name of your venue.';
    }
    if (!profile.dayparts.some(d => d.isOpen)) {
      venue.dayparts = 'Choose at least one part of the day when music plays.';
    }
    const music: Record<string, string> = {};
    if (profile.likedGenres.length === 0) {
      music.likedGenres = 'Pick at least one style you like.';
    }
    return [venue, {}, music, {}, {}];
  }, [profile]);

  const shownErrors = (index: number) => (attempted.has(index) ? errorsByStep[index] : {});
  const currentErrors = shownErrors(step);
  const isLastStep = step === STEPS.length - 1;

  // Each request gets a number; only the latest one may write its result, so
  // leaving and re-entering Review quickly never shows a stale identity.
  const suggestionRun = useRef(0);

  /** Moves to a step; entering Review asks the AI for the identity from the current answers. */
  const showStep = (index: number) => {
    setStep(index);
    if (index !== STEPS.length - 1) {
      return;
    }
    const run = ++suggestionRun.current;
    setIsSuggesting(true);
    venueService.suggestIdentity(profile).then(result => {
      if (run === suggestionRun.current) {
        setIdentity(result);
        setIsSuggesting(false);
      }
    });
  };

  const goNext = async () => {
    setAttempted(prev => new Set(prev).add(step));
    const problems = Object.keys(errorsByStep[step]);
    if (problems.length) {
      if (problems[0] === 'name') {
        nameRef.current?.focus();
      }
      return;
    }
    if (!isLastStep) {
      showStep(step + 1);
      return;
    }
    setIsSaving(true);
    const saved = await venueService.save({
      ...profile,
      photoNames: photos.map(f => f.name),
      identity: identity ?? undefined,
    });
    setIsSaving(false);
    onSaved(saved);
  };

  const goTo = (index: number) => {
    if (index > step) {
      setAttempted(prev => new Set(prev).add(step));
    }
    showStep(index);
  };

  const outstanding = STEPS.map((s, i) => ({...s, index: i, issues: Object.values(shownErrors(i))})).filter(
    s => s.index !== step && s.issues.length > 0,
  );

  return (
    <Layout
      height="fill"
      contentWidth={760}
      padding={5}
      defaultHasDividers
      header={
        <LayoutHeader hasDivider={false}>
          <VStack gap={isNarrow ? 3 : 5}>
            <HStack gap={3} vAlign="center">
              <StackItem size="fill">
                <VStack gap={1}>
                  <Heading level={1}>{onCancel ? 'Edit venue profile' : 'Set up your venue'}</Heading>
                  <Text color="secondary">
                    A few questions so the music fits your place from the first song.
                  </Text>
                </VStack>
              </StackItem>
              {onCancel && <Button label="Cancel" variant="ghost" onClick={onCancel} />}
            </HStack>
            <Stepper
              activeStep={step}
              orientation="horizontal"
              onStepClick={goTo}
              label="Venue setup progress"
              density="balanced"
              indicatorPosition="on-track">
              {STEPS.map((s, i) => (
                <Step
                  key={s.label}
                  step={i}
                  label={s.label}
                  isOptional={s.isOptional}
                  status={Object.keys(shownErrors(i)).length > 0 ? 'error' : undefined}
                />
              ))}
            </Stepper>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          {step === 0 && (
            <VStack gap={5}>
              <VStack gap={1}>
                <Heading level={2}>About your venue</Heading>
                <Text type="supporting" color="secondary">
                  What kind of place it is and when music plays. Many places change through the
                  day, so tell us what it becomes at each time.
                </Text>
              </VStack>
              <FormLayout defaultOptionality="optional">
                <TextInput
                  label="Venue name"
                  ref={nameRef}
                  isRequired
                  value={profile.name}
                  onChange={name => update({name})}
                  placeholder="e.g. Demo Café"
                  status={currentErrors.name ? {type: 'error', message: currentErrors.name} : undefined}
                />
                <Field label="Type of venue" inputID={typeID} isGroupLabel>
                  <Grid columns={{minWidth: 160}} gap={3}>
                    {VENUE_TYPES.map(t => (
                      <SelectableCard
                        key={t.value}
                        label={t.label}
                        isSelected={profile.type === t.value}
                        onChange={() =>
                          update({
                            type: t.value,
                            // Keep the day plan in step with the main type until the user changes it.
                            dayparts: profile.dayparts.map(d =>
                              d.concept === profile.type ? {...d, concept: t.value} : d,
                            ),
                          })
                        }
                        padding={3}>
                        <HStack gap={3} vAlign="start">
                          <Icon icon={t.icon} size="lg" color="accent" />
                          <VStack gap={0.5}>
                            <Text type="label">{t.label}</Text>
                            <Text type="supporting" color="secondary">
                              {t.description}
                            </Text>
                          </VStack>
                        </HStack>
                      </SelectableCard>
                    ))}
                  </Grid>
                </Field>
                <VStack gap={3}>
                  <VStack gap={0.5}>
                    <Text type="label">When does music play?</Text>
                    <Text type="supporting" color="secondary">
                      Turn on the parts of the day you are open, and say what the venue is then.
                    </Text>
                  </VStack>
                  {DAYPARTS.map(d => {
                    const part = profile.dayparts.find(p => p.id === d.id)!;
                    const setPart = (patch: Partial<typeof part>) =>
                      update({
                        dayparts: profile.dayparts.map(p => (p.id === d.id ? {...p, ...patch} : p)),
                      });
                    return (
                      <HStack key={d.id} gap={4} vAlign="center" wrap="wrap">
                        <StackItem size="fill">
                          <Switch
                            label={`${d.label} · ${d.hours}`}
                            labelIcon={d.icon}
                            value={part.isOpen}
                            onChange={isOpen => setPart({isOpen})}
                          />
                        </StackItem>
                        {part.isOpen && (
                          <Selector
                            label={`Venue during ${d.label.toLowerCase()}`}
                            isLabelHidden
                            size="sm"
                            width={180}
                            options={conceptOptions}
                            value={part.concept}
                            onChange={v => setPart({concept: v as VenueType})}
                          />
                        )}
                      </HStack>
                    );
                  })}
                  {currentErrors.dayparts && (
                    <Banner status="error" title={currentErrors.dayparts} />
                  )}
                </VStack>
              </FormLayout>
            </VStack>
          )}

          {step === 1 && (
            <VStack gap={5}>
              <VStack gap={1}>
                <Heading level={2}>Guests and atmosphere</Heading>
                <Text type="supporting" color="secondary">
                  Who comes in and how the place should feel. Both shape tempo and instruments.
                </Text>
              </VStack>
              <FormLayout defaultOptionality="optional">
                <Field label="Who are your guests?" inputID={audienceID} isGroupLabel>
                  <HStack gap={2} wrap="wrap">
                    {AUDIENCES.map(a => (
                      <ToggleButton
                        key={a}
                        label={a}
                        size="sm"
                        isPressed={profile.audience.includes(a)}
                        onPressedChange={() => update({audience: toggle(profile.audience, a)})}>
                        {a}
                      </ToggleButton>
                    ))}
                  </HStack>
                </Field>
                <Field
                  label={`How should it feel? (up to ${MAX_ATMOSPHERES})`}
                  inputID={atmosphereID}
                  isGroupLabel>
                  <Grid columns={{minWidth: 200}} gap={3}>
                    {ATMOSPHERES.map(a => {
                      const isSelected = profile.atmosphere.includes(a.value);
                      const isFull = profile.atmosphere.length >= MAX_ATMOSPHERES;
                      return (
                        <SelectableCard
                          key={a.value}
                          label={a.label}
                          isSelected={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              update({atmosphere: profile.atmosphere.filter(v => v !== a.value)});
                            } else if (!isFull) {
                              update({atmosphere: [...profile.atmosphere, a.value]});
                            } else {
                              // Replace the oldest choice so a click never silently does nothing.
                              update({atmosphere: [...profile.atmosphere.slice(1), a.value]});
                            }
                          }}
                          padding={3}>
                          <HStack gap={3} vAlign="start">
                            <Icon icon={a.icon} size="lg" color="accent" />
                            <VStack gap={0.5}>
                              <Text type="label">{a.label}</Text>
                              <Text type="supporting" color="secondary">
                                {a.description}
                              </Text>
                            </VStack>
                          </HStack>
                        </SelectableCard>
                      );
                    })}
                  </Grid>
                </Field>
              </FormLayout>
            </VStack>
          )}

          {step === 2 && (
            <VStack gap={5}>
              <VStack gap={1}>
                <Heading level={2}>Music taste</Heading>
                <Text type="supporting" color="secondary">
                  Styles to lean on and styles to stay away from. A style can’t be in both lists.
                </Text>
              </VStack>
              <FormLayout defaultOptionality="optional">
                <Field
                  label="Styles you like"
                  inputID={likedID}
                  isGroupLabel
                  description="Pick a few; the first three weigh the most.">
                  <VStack gap={2}>
                    <HStack gap={2} wrap="wrap">
                      {GENRES.map(g => (
                        <ToggleButton
                          key={g}
                          label={g}
                          size="sm"
                          icon={profile.likedGenres.includes(g) ? <Icon icon={CheckIcon} /> : undefined}
                          isPressed={profile.likedGenres.includes(g)}
                          isDisabled={profile.avoidGenres.includes(g)}
                          onPressedChange={() => update({likedGenres: toggle(profile.likedGenres, g)})}>
                          {g}
                        </ToggleButton>
                      ))}
                    </HStack>
                    {currentErrors.likedGenres && (
                      <Banner status="error" title={currentErrors.likedGenres} />
                    )}
                  </VStack>
                </Field>
                <Field label="Styles to avoid" inputID={avoidID} isGroupLabel>
                  <HStack gap={2} wrap="wrap">
                    {GENRES.map(g => (
                      <ToggleButton
                        key={g}
                        label={`Avoid ${g}`}
                        size="sm"
                        icon={profile.avoidGenres.includes(g) ? <Icon icon={NoSymbolIcon} /> : undefined}
                        isPressed={profile.avoidGenres.includes(g)}
                        isDisabled={profile.likedGenres.includes(g)}
                        onPressedChange={() => update({avoidGenres: toggle(profile.avoidGenres, g)})}>
                        {g}
                      </ToggleButton>
                    ))}
                  </HStack>
                </Field>
                <RadioList
                  label="Vocals"
                  value={profile.vocals}
                  onChange={v => update({vocals: v as VocalPreference})}>
                  <RadioListItem
                    value="instrumental"
                    label="Instrumental only"
                    description="Best for conversation, work and dining."
                  />
                  <RadioListItem
                    value="mixed"
                    label="Mostly instrumental, some vocals"
                    description="Vocals now and then to keep it lively."
                  />
                  <RadioListItem
                    value="vocals"
                    label="Songs with vocals"
                    description="Fits bars, shops and busy hours."
                  />
                </RadioList>
                {profile.vocals !== 'instrumental' && (
                  <CheckboxList
                    label="Lyrics language"
                    value={profile.lyricLanguages.filter(l => l !== 'none')}
                    onChange={lyricLanguages => update({lyricLanguages})}>
                    {LYRIC_LANGUAGES.filter(l => l.value !== 'none').map(l => (
                      <CheckboxListItem key={l.value} value={l.value} label={l.label} />
                    ))}
                  </CheckboxList>
                )}
                <Divider />
                <Switch
                  label="Keep tempo and volume moderate"
                  description="Avoids very fast or loud tracks, even when the room gets busy."
                  value={profile.keepModerate}
                  onChange={keepModerate => update({keepModerate})}
                  labelPosition="start"
                  labelSpacing="spread"
                />
                <TextArea
                  label="Anything else?"
                  placeholder="e.g. No sad songs on weekend mornings; we host jazz nights on Thursdays"
                  rows={3}
                  maxLength={300}
                  value={profile.notes}
                  onChange={notes => update({notes})}
                />
              </FormLayout>
            </VStack>
          )}

          {step === 3 && (
            <VStack gap={5}>
              <VStack gap={1}>
                <Heading level={2}>Photos of your venue</Heading>
                <Text type="supporting" color="secondary">
                  Optional. A few photos give the AI a first look at your space before the camera
                  is set up. They are analyzed once and not kept.
                </Text>
              </VStack>
              <FileInput
                label="Venue photos"
                isLabelHidden
                mode="dropzone"
                isMultiple
                accept="image/jpeg,image/png,image/webp"
                maxSize={10 * 1024 * 1024}
                placeholder="Drop up to 5 photos here or click to choose"
                value={photos}
                onChange={next => {
                  const list = Array.isArray(next) ? next : next ? [next] : [];
                  setPhotos(list.slice(0, 5));
                }}
              />
            </VStack>
          )}

          {step === 4 && (
            <VStack gap={5}>
              <VStack gap={1}>
                <Heading level={2}>Your music identity</Heading>
                <Text type="supporting" color="secondary">
                  This is how the AI understood your venue. Go back to any step to change it;
                  nothing is saved until you press Save.
                </Text>
              </VStack>

              {outstanding.length > 0 && (
                <Banner
                  status="error"
                  title={`${outstanding.length} ${outstanding.length === 1 ? 'step needs' : 'steps need'} attention`}
                  collapsible={false}>
                  <VStack gap={2}>
                    {outstanding.map(s => (
                      <Text key={s.label} type="supporting">
                        <Text type="inherit" weight="bold">
                          {s.label}
                        </Text>
                        : {s.issues.join(' ')}
                      </Text>
                    ))}
                  </VStack>
                </Banner>
              )}

              {isSuggesting || !identity ? (
                <Card variant="muted" padding={6}>
                  <VStack gap={3} hAlign="center">
                    <Spinner size="lg" />
                    <Text color="secondary">Building your music identity…</Text>
                  </VStack>
                </Card>
              ) : (
                <MusicIdentityCard identity={identity} />
              )}

              <MetadataList orientation="vertical">
                <MetadataListItem label="Venue">
                  {profile.name.trim() || '—'} · {venueTypeLabel(profile.type)}
                </MetadataListItem>
                <MetadataListItem label="Open">
                  {profile.dayparts
                    .filter(d => d.isOpen)
                    .map(d => {
                      const label = DAYPARTS.find(x => x.id === d.id)?.label;
                      return d.concept === profile.type ? label : `${label} (${venueTypeLabel(d.concept)})`;
                    })
                    .join(', ') || '—'}
                </MetadataListItem>
                <MetadataListItem label="Guests">
                  {profile.audience.join(', ') || 'Not specified'}
                </MetadataListItem>
                <MetadataListItem label="Atmosphere">
                  {profile.atmosphere
                    .map(a => ATMOSPHERES.find(x => x.value === a)?.label)
                    .join(', ') || 'Not specified'}
                </MetadataListItem>
                <MetadataListItem label="Likes">{profile.likedGenres.join(', ') || '—'}</MetadataListItem>
                <MetadataListItem label="Avoids">{profile.avoidGenres.join(', ') || 'Nothing'}</MetadataListItem>
                <MetadataListItem label="Photos">
                  {photos.length ? `${photos.length} added` : 'None'}
                </MetadataListItem>
              </MetadataList>
            </VStack>
          )}
        </LayoutContent>
      }
      footer={
        <LayoutFooter>
          <HStack gap={3} vAlign="center">
            <StackItem size="fill" style={footerZone}>
              {STEPS[step].isOptional && (
                <Button
                  label="Skip"
                  variant="ghost"
                  onClick={() => {
                    setPhotos([]);
                    showStep(step + 1);
                  }}
                />
              )}
            </StackItem>
            <Text type="supporting" color="secondary">
              {step + 1} of {STEPS.length}
            </Text>
            <StackItem size="fill" style={footerZone}>
              <HStack gap={3} hAlign="end">
                <Button
                  label="Back"
                  variant="secondary"
                  isDisabled={step === 0}
                  onClick={() => setStep(s => Math.max(0, s - 1))}
                />
                <Button
                  label={isLastStep ? 'Save profile' : 'Next'}
                  variant="primary"
                  icon={isLastStep ? <Icon icon={SparklesIcon} /> : undefined}
                  isLoading={isSaving}
                  isDisabled={isLastStep && (isSuggesting || outstanding.length > 0)}
                  onClick={goNext}
                />
              </HStack>
            </StackItem>
          </HStack>
        </LayoutFooter>
      }
    />
  );
}
