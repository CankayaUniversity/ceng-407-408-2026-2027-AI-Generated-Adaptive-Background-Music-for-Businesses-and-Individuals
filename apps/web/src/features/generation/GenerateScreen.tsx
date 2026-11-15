'use client';

import {useCallback, useRef, useState} from 'react';
import {Layout, LayoutContent, VStack} from '@astryxdesign/core/Layout';
import {Grid} from '@astryxdesign/core/Grid';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {Banner} from '@astryxdesign/core/Banner';
import {Spinner} from '@astryxdesign/core/Spinner';
import {MusicalNoteIcon} from '@heroicons/react/24/outline';
import type {MoodVector} from '../mood/types';
import {GenerationSettingsCard} from './GenerationSettingsCard';
import {PromptReviewCard} from './PromptReviewCard';
import {GenerationProgressCard} from './GenerationProgressCard';
import {generationService, MIN_SONGS} from './service';
import type {GenerationJob, GenerationRequest, PlannedPrompt} from './types';

type Phase = 'setup' | 'planning' | 'review' | 'generating';

function EmptyState({isPlanning}: {isPlanning: boolean}) {
  return (
    <Card padding={8} variant="muted">
      <VStack gap={3} hAlign="center">
        {isPlanning ? <Spinner size="xl" /> : <Icon icon={MusicalNoteIcon} size="lg" color="accent" />}
        <Heading level={3} justify="center">
          {isPlanning ? 'Planning your playlist…' : 'No songs yet'}
        </Heading>
        <Text color="secondary" justify="center">
          {isPlanning
            ? 'The AI is writing one prompt per song from your mood.'
            : 'Pick a mood on the left and press “Plan songs”. You will review the prompts before anything is generated.'}
        </Text>
      </VStack>
    </Card>
  );
}

/**
 * Generate screen: mood -> planned prompts (editable) -> generated songs.
 * Talks only to `generationService`, which is a mock until the API exists.
 */
export function GenerateScreen({currentMood}: {currentMood: MoodVector}) {
  const [request, setRequest] = useState<GenerationRequest>({
    mood: currentMood,
    description: '',
    count: MIN_SONGS,
    vocals: 'instrumental',
    durationSec: 120,
  });
  const [phase, setPhase] = useState<Phase>('setup');
  const [prompts, setPrompts] = useState<PlannedPrompt[]>([]);
  const [jobs, setJobs] = useState<Record<string, GenerationJob>>({});
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The request the current prompts were generated with; edits to the form
  // after generating start do not change songs already in flight.
  const generatingRequest = useRef(request);

  const plan = useCallback(async () => {
    setError(null);
    setPhase('planning');
    try {
      const planned = await generationService.planPrompts(request);
      setPrompts(planned);
      setPhase('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not plan the playlist.');
      setPhase('setup');
    }
  }, [request]);

  const runJob = useCallback(async (prompt: PlannedPrompt) => {
    setJobs(j => ({...j, [prompt.id]: {promptId: prompt.id, status: 'generating'}}));
    try {
      const track = await generationService.generateTrack(prompt, generatingRequest.current);
      setJobs(j => ({...j, [prompt.id]: {promptId: prompt.id, status: 'ready', track}}));
    } catch (e) {
      setJobs(j => ({
        ...j,
        [prompt.id]: {
          promptId: prompt.id,
          status: 'failed',
          error: e instanceof Error ? e.message : 'Generation failed.',
        },
      }));
    }
  }, []);

  const generate = useCallback(() => {
    generatingRequest.current = request;
    setJobs(Object.fromEntries(prompts.map(p => [p.id, {promptId: p.id, status: 'queued'}])));
    setPhase('generating');
    // Two at a time, like a worker with limited concurrency.
    const queue = [...prompts];
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        await runJob(next);
      }
    };
    void Promise.all([worker(), worker()]);
  }, [prompts, request, runJob]);

  const startOver = () => {
    setPrompts([]);
    setJobs({});
    setPlayingId(null);
    setPhase('setup');
  };

  return (
    <Layout
      height="fill"
      content={
        <LayoutContent padding={6}>
          <VStack gap={6}>
            <VStack gap={1}>
              <Heading level={1}>Generate Music</Heading>
              <Text color="secondary">
                Turn a mood into a playlist of original songs. Review the AI’s plan, then generate.
              </Text>
            </VStack>

            <Banner
              status="info"
              title="Demo mode"
              description="Generation is simulated until the music service is connected. Songs become “ready” after a few seconds and have no audio yet; about one in eight fails on purpose so you can try Retry."
              isDismissable
            />

            {error && <Banner status="error" title="Something went wrong" description={error} />}

            <Grid columns={{minWidth: 400, repeat: 'fit'}} gap={5} align="start">
              <GenerationSettingsCard
                request={request}
                onChange={setRequest}
                currentMood={currentMood}
                onPlan={plan}
                isPlanning={phase === 'planning'}
                isLocked={phase === 'generating'}
              />

              {(phase === 'setup' || phase === 'planning') && (
                <EmptyState isPlanning={phase === 'planning'} />
              )}

              {phase === 'review' && (
                <PromptReviewCard
                  prompts={prompts}
                  onChange={(id, text) =>
                    setPrompts(ps => ps.map(p => (p.id === id ? {...p, prompt: text} : p)))
                  }
                  onRemove={id => setPrompts(ps => ps.filter(p => p.id !== id))}
                  onReplan={plan}
                  onGenerate={generate}
                />
              )}

              {phase === 'generating' && (
                <GenerationProgressCard
                  prompts={prompts}
                  jobs={jobs}
                  mood={generatingRequest.current.mood}
                  playingId={playingId}
                  onTogglePlay={id => setPlayingId(current => (current === id ? null : id))}
                  onRetry={id => {
                    const prompt = prompts.find(p => p.id === id);
                    if (prompt) {
                      void runJob(prompt);
                    }
                  }}
                  onStartOver={startOver}
                />
              )}
            </Grid>
          </VStack>
        </LayoutContent>
      }
    />
  );
}

export default GenerateScreen;
