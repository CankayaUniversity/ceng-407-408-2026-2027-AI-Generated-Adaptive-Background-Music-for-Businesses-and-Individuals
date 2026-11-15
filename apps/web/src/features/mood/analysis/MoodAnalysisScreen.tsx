'use client';

import {useState} from 'react';
import {Layout, LayoutContent, VStack} from '@astryxdesign/core/Layout';
import {Grid} from '@astryxdesign/core/Grid';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {Banner} from '@astryxdesign/core/Banner';
import {Spinner} from '@astryxdesign/core/Spinner';
import {SparklesIcon} from '@heroicons/react/24/outline';
import type {MoodAnalysis, MoodVector} from '../types';
import {AnalysisInputCard} from './AnalysisInputCard';
import {AnalysisResultCard} from './AnalysisResultCard';
import {ClosestTracksCard} from './ClosestTracksCard';
import {moodAnalysisService} from './service';
import type {AnalysisInput} from './types';

function Placeholder({isAnalyzing}: {isAnalyzing: boolean}) {
  return (
    <Card padding={8} variant="muted">
      <VStack gap={3} hAlign="center">
        {isAnalyzing ? (
          <Spinner size="xl" />
        ) : (
          <Icon icon={SparklesIcon} size="lg" color="accent" />
        )}
        <Heading level={3} justify="center">
          {isAnalyzing ? 'Reading the room…' : 'No analysis yet'}
        </Heading>
        <Text color="secondary" justify="center">
          {isAnalyzing
            ? 'Checking the light, how busy it looks and the time of day.'
            : 'Add a photo, take a snapshot or describe the room, then press “Analyze mood”.'}
        </Text>
      </VStack>
    </Card>
  );
}

/**
 * Mood Analysis: photo / snapshot / text -> mood, which the user can tune and
 * send to the Generate screen. Talks only to `moodAnalysisService`.
 */
export function MoodAnalysisScreen() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<MoodAnalysis | null>(null);
  const [mood, setMood] = useState<MoodVector | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (input: AnalysisInput) => {
    setError(null);
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const result = await moodAnalysisService.analyze(input);
      setAnalysis(result);
      setMood(result.mood);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The mood could not be analyzed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Layout
      height="fill"
      content={
        <LayoutContent padding={6}>
          <VStack gap={6}>
            <VStack gap={1}>
              <Heading level={1}>Mood Analysis</Heading>
              <Text color="secondary">
                Let the AI read your venue’s atmosphere, adjust it if needed, then turn it into music.
              </Text>
            </VStack>

            <Banner
              status="info"
              title="Demo mode"
              description="The mood is estimated in your browser from the photo’s light and colour (or keywords in your text) until the vision AI is connected."
              isDismissable
            />

            {error && <Banner status="error" title="Analysis failed" description={error} />}

            <Grid columns={{minWidth: 400, repeat: 'fit'}} gap={5} align="start">
              <VStack gap={5}>
                <AnalysisInputCard onAnalyze={analyze} isAnalyzing={isAnalyzing} />
                {analysis && mood && <ClosestTracksCard mood={mood} />}
              </VStack>
              {analysis && mood ? (
                <AnalysisResultCard analysis={analysis} mood={mood} onMoodChange={setMood} />
              ) : (
                <Placeholder isAnalyzing={isAnalyzing} />
              )}
            </Grid>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
