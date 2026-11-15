'use client';

/**
 * Plan & Usage: the venue's plan, how much of it this usage period has used,
 * and how the plans compare. Laid out after the Astryx `dashboard-scorecard`
 * template (pinned header, section headings, goal-attainment bars), without
 * its StyleX pieces since this project has no StyleX compiler.
 */

import {useState} from 'react';
import {Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {
  HStack,
  Layout,
  LayoutContent,
  LayoutHeader,
  StackItem,
  VStack,
} from '@astryxdesign/core/Layout';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {Badge} from '@astryxdesign/core/Badge';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Divider} from '@astryxdesign/core/Divider';
import {Icon} from '@astryxdesign/core/Icon';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {
  ArrowUpCircleIcon,
  CameraIcon,
  CheckIcon,
  CircleStackIcon,
  MusicalNoteIcon,
} from '@heroicons/react/24/outline';
import {
  PLANS,
  billingPeriod,
  currentPlan,
  dailySongs,
  usage,
  type Plan,
} from './planData';

type IconComponent = typeof MusicalNoteIcon;

const dateFormat = new Intl.DateTimeFormat('en-GB', {day: 'numeric', month: 'short'});
const formatDate = (iso: string) => dateFormat.format(new Date(iso));

/** Same colour bands everywhere: comfortable, getting close, at the limit. */
function usageVariant(pct: number): 'accent' | 'warning' | 'error' {
  if (pct >= 95) {
    return 'error';
  }
  if (pct >= 80) {
    return 'warning';
  }
  return 'accent';
}

function SectionHeading({title, hint, id}: {title: string; hint?: string; id?: string}) {
  return (
    <HStack hAlign="between" vAlign="center" gap={3} wrap="wrap">
      <Heading level={2} id={id}>
        {title}
      </Heading>
      {hint ? (
        <Text type="supporting" color="secondary">
          {hint}
        </Text>
      ) : null}
    </HStack>
  );
}

function UsageRow({
  icon,
  label,
  used,
  limit,
  unit,
  note,
}: {
  icon: IconComponent;
  label: string;
  used: number;
  limit: number;
  unit: string;
  note: string;
}) {
  const pct = Math.round((used / limit) * 100);
  return (
    <VStack gap={2}>
      <HStack hAlign="between" vAlign="center" gap={3}>
        <HStack gap={2} vAlign="center">
          <Icon icon={icon} color="accent" />
          <Heading level={4}>{label}</Heading>
        </HStack>
        <Text weight="semibold" hasTabularNumbers>
          {pct}%
        </Text>
      </HStack>
      <ProgressBar
        value={used}
        max={limit}
        variant={usageVariant(pct)}
        label={`${label}: ${used} of ${limit} ${unit}`}
        isLabelHidden
      />
      <HStack hAlign="between" vAlign="center" gap={4} wrap="wrap">
        <Text type="supporting">{note}</Text>
        <Text type="supporting" hasTabularNumbers>
          {used.toLocaleString('en-US')} / {limit.toLocaleString('en-US')} {unit}
        </Text>
      </HStack>
    </VStack>
  );
}

function DailyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{value: number}>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  return (
    <Card padding={2} elevation="med">
      <Text type="supporting">
        {label} Nov · <Text weight="semibold">{payload[0].value} songs</Text>
      </Text>
    </Card>
  );
}

function PlanFeature({children}: {children: string}) {
  return (
    <HStack gap={2} vAlign="start">
      <Icon icon={CheckIcon} size="sm" color="success" />
      <Text>{children}</Text>
    </HStack>
  );
}

function PlanCard({plan, onChoose}: {plan: Plan; onChoose: (plan: Plan) => void}) {
  const isCurrent = plan.id === currentPlan.id;
  const indexOf = (p: Plan) => PLANS.findIndex(x => x.id === p.id);
  const isUpgrade = indexOf(plan) > indexOf(currentPlan);
  return (
    <Card padding={5} variant={isCurrent ? 'blue' : 'default'} height="100%">
      <VStack gap={4} height="100%">
        <VStack gap={1}>
          <HStack hAlign="between" vAlign="center" gap={2}>
            <Heading level={3}>{plan.name}</Heading>
            {isCurrent && <Badge variant="info" label="Current plan" />}
          </HStack>
          <Text type="supporting">{plan.description}</Text>
        </VStack>
        <Divider />
        <VStack gap={2}>
          <PlanFeature>{`${plan.songsPerMonth.toLocaleString('en-US')} songs per month`}</PlanFeature>
          <PlanFeature>{`Up to ${plan.songsPerPlaylist} songs per playlist`}</PlanFeature>
          <PlanFeature>{`${plan.cameraAnalysesPerMonth.toLocaleString('en-US')} camera analyses`}</PlanFeature>
          <PlanFeature>{`${plan.storageGb} GB music storage`}</PlanFeature>
          {plan.features.map(f => (
            <PlanFeature key={f}>{f}</PlanFeature>
          ))}
        </VStack>
        {/* Pushes the button to the bottom so all plan cards line up. */}
        <StackItem size="fill">{null}</StackItem>
        <Button
          label={isCurrent ? 'Your plan' : isUpgrade ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`}
          variant={isCurrent ? 'secondary' : isUpgrade ? 'primary' : 'secondary'}
          width="100%"
          isDisabled={isCurrent}
          onClick={() => onChoose(plan)}
        />
      </VStack>
    </Card>
  );
}

export function PlanUsageScreen() {
  const [chosenPlan, setChosenPlan] = useState<Plan | null>(null);

  const rows = [
    {
      icon: MusicalNoteIcon,
      label: 'Songs generated',
      used: usage.songsGenerated,
      limit: currentPlan.songsPerMonth,
      unit: 'songs',
      note: `Up to ${currentPlan.songsPerPlaylist} per playlist on ${currentPlan.name}`,
    },
    {
      icon: CameraIcon,
      label: 'Camera analyses',
      used: usage.cameraAnalyses,
      limit: currentPlan.cameraAnalysesPerMonth,
      unit: 'snapshots',
      note: 'Adaptive mode pauses when the limit is reached',
    },
    {
      icon: CircleStackIcon,
      label: 'Music storage',
      used: usage.storageGb,
      limit: currentPlan.storageGb,
      unit: 'GB',
      note: 'Generated songs you keep in your library',
    },
  ];
  const nearLimit = rows.filter(r => r.used / r.limit >= 0.8);
  const songsPerDay =
    dailySongs.reduce((sum, d) => sum + d.songs, 0) / Math.max(1, dailySongs.length);
  const projected = Math.round(songsPerDay * 30);

  return (
    <Layout
      height="fill"
      contentWidth={1200}
      header={
        <LayoutHeader padding={6} hasDivider>
          <VStack gap={1}>
            <Heading level={1}>Plan & Usage</Heading>
            <Text color="secondary">
              Usage period {formatDate(billingPeriod.start)} – {formatDate(billingPeriod.end)} · limits reset{' '}
              {formatDate(billingPeriod.renewsOn)}
            </Text>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={6}>
          <VStack gap={10}>
            {nearLimit.length > 0 && (
              <Banner
                status="warning"
                title={`${nearLimit.map(r => r.label).join(' and ')} ${nearLimit.length === 1 ? 'is' : 'are'} close to the limit`}
                description={`Limits reset on ${formatDate(billingPeriod.renewsOn)}. Upgrade to keep generating without interruption.`}
              />
            )}

            <VStack gap={6}>
              <SectionHeading title="Current plan" />
              <Card padding={6}>
                <HStack gap={6} vAlign="center" wrap="wrap">
                  <StackItem size="fill">
                    <VStack gap={2}>
                      <HStack gap={2} vAlign="center">
                        <Heading level={3}>{currentPlan.name}</Heading>
                        <Badge variant="success" label="Active" />
                      </HStack>
                      <Text color="secondary">{currentPlan.description}</Text>
                      <Text type="supporting">
                        {currentPlan.songsPerMonth.toLocaleString('en-US')} songs a month · up to{' '}
                        {currentPlan.songsPerPlaylist} per playlist · {currentPlan.storageGb} GB storage
                      </Text>
                    </VStack>
                  </StackItem>
                  <Button
                    label="Compare plans"
                    variant="primary"
                    icon={<Icon icon={ArrowUpCircleIcon} size="sm" />}
                    href="#plans"
                  />
                </HStack>
              </Card>
            </VStack>

            <VStack gap={6}>
              <SectionHeading
                title="Usage this period"
                hint={`Resets on ${formatDate(billingPeriod.renewsOn)}`}
              />
              <Card padding={6}>
                <VStack gap={6}>
                  {rows.map((row, i) => (
                    <VStack gap={6} key={row.label}>
                      {i > 0 && <Divider />}
                      <UsageRow {...row} />
                    </VStack>
                  ))}
                </VStack>
              </Card>
            </VStack>

            <VStack gap={6}>
              <SectionHeading
                title="Songs generated per day"
                hint={
                  projected > currentPlan.songsPerMonth
                    ? `About ${songsPerDay.toFixed(0)} a day · on track for ~${projected}, over the ${currentPlan.songsPerMonth}-song limit`
                    : `About ${songsPerDay.toFixed(0)} a day · on track for ~${projected} this month`
                }
              />
              <Card padding={5}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailySongs} margin={{top: 8, right: 8, left: 0, bottom: 0}}>
                    <CartesianGrid vertical={false} stroke="var(--color-border)" />
                    <XAxis
                      dataKey="day"
                      tick={{fontSize: 'var(--font-size-sm)', fill: 'var(--color-text-secondary)'}}
                      tickFormatter={(d: string) => `${d} Nov`}
                      axisLine={false}
                      tickLine={false}
                      interval={1}
                      tickMargin={8}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{fontSize: 'var(--font-size-sm)', fill: 'var(--color-text-secondary)'}}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                      tickMargin={8}
                    />
                    <Tooltip
                      cursor={{fill: 'var(--color-background-muted)'}}
                      content={<DailyTooltip />}
                    />
                    <Bar dataKey="songs" fill="var(--color-data-blue-3)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </VStack>

            <VStack gap={6}>
              <SectionHeading id="plans" title="Plans" hint="Limits per plan · demo" />
              {/* Shown here, next to the button that raised it, not at the top of a long page. */}
              {chosenPlan && (
                <Banner
                  key={chosenPlan.id}
                  status="info"
                  title="Plan changes are not connected in this demo"
                  description={`Moving to ${chosenPlan.name} will be handled by an admin once accounts and plans are set up.`}
                  isDismissable
                />
              )}
              <Grid columns={{minWidth: 300, repeat: 'fit'}} gap={4} align="stretch">
                {PLANS.map(plan => (
                  <PlanCard key={plan.id} plan={plan} onChoose={setChosenPlan} />
                ))}
              </Grid>
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
