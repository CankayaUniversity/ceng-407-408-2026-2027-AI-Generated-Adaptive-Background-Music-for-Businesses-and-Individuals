'use client';

import {GenerateScreen} from '../../features/generation/GenerateScreen';
import {currentAnalysis} from '../../features/dashboard/mockData';

export default function GeneratePage() {
  return <GenerateScreen currentMood={currentAnalysis.mood} />;
}
