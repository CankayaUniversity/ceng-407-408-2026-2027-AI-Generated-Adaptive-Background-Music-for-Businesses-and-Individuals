'use client';

import {useState} from 'react';
import {Card} from '@astryxdesign/core/Card';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {Button} from '@astryxdesign/core/Button';
import {TabList, Tab} from '@astryxdesign/core/TabList';
import {FileInput} from '@astryxdesign/core/FileInput';
import {TextArea} from '@astryxdesign/core/TextArea';
import {AspectRatio} from '@astryxdesign/core/AspectRatio';
import {
  CameraIcon,
  PencilSquareIcon,
  PhotoIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import {CameraCapture} from './CameraCapture';
import type {AnalysisInput} from './types';

type Source = 'upload' | 'camera' | 'text';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Left column: choose how to describe the room, then analyze. */
export function AnalysisInputCard({
  onAnalyze,
  isAnalyzing,
}: {
  onAnalyze: (input: AnalysisInput) => void;
  isAnalyzing: boolean;
}) {
  const [source, setSource] = useState<Source>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState('');

  const input: AnalysisInput | null =
    source === 'text'
      ? text.trim().length >= 3
        ? {kind: 'text', text}
        : null
      : image
        ? {kind: 'image', dataUrl: image}
        : null;

  return (
    <Card padding={5}>
      <VStack gap={5}>
        <VStack gap={1}>
          <HStack gap={2} vAlign="center">
            <Icon icon={SparklesIcon} color="accent" />
            <Heading level={3}>Read the Room</Heading>
          </HStack>
          <Text type="supporting">
            Show the AI your venue with a photo or a camera snapshot, or describe it in words.
          </Text>
        </VStack>

        <TabList
          value={source}
          onChange={v => {
            setSource(v as Source);
            setImage(null);
            setFile(null);
          }}>
          <Tab value="upload" label="Upload photo" icon={<Icon icon={PhotoIcon} />} />
          <Tab value="camera" label="Camera" icon={<Icon icon={CameraIcon} />} />
          <Tab value="text" label="Describe" icon={<Icon icon={PencilSquareIcon} />} />
        </TabList>

        {source === 'upload' && (
          <VStack gap={3}>
            <FileInput
              label="Venue photo"
              isLabelHidden
              mode="dropzone"
              accept="image/jpeg,image/png,image/webp"
              maxSize={MAX_UPLOAD_BYTES}
              placeholder="Drop a photo here or click to choose (JPG, PNG, WebP, up to 10 MB)"
              value={file}
              onChange={async next => {
                const picked = Array.isArray(next) ? (next[0] ?? null) : next;
                setFile(picked);
                setImage(picked ? await readAsDataUrl(picked) : null);
              }}
            />
          </VStack>
        )}

        {source === 'camera' && !image && <CameraCapture onCapture={setImage} />}

        {source !== 'text' && image && (
          <VStack gap={2}>
            <AspectRatio ratio={16 / 9} fit="cover">
              {/* A local data: URL preview; next/image has nothing to optimize here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="Selected venue photo" />
            </AspectRatio>
            <HStack hAlign="end">
              <Button
                label={source === 'camera' ? 'Retake' : 'Remove photo'}
                size="sm"
                variant="ghost"
                onClick={() => {
                  setImage(null);
                  setFile(null);
                }}
              />
            </HStack>
          </VStack>
        )}

        {source === 'text' && (
          <TextArea
            label="Describe the room"
            description="Mention light, how busy it is, the time of day and the feel you want."
            placeholder="e.g. Rainy evening, candles on the tables, a few couples talking quietly"
            rows={4}
            maxLength={400}
            value={text}
            onChange={setText}
          />
        )}

        <HStack gap={2} vAlign="start">
          <Icon icon={ShieldCheckIcon} size="sm" color="success" />
          <Text type="supporting">
            {source === 'text'
              ? 'No camera or photo is used: only your text is analyzed.'
              : 'Faces are blurred and the image is shrunk before analysis, then deleted. Nothing is stored. In demo mode the photo never leaves your browser.'}
          </Text>
        </HStack>

        <Button
          label="Analyze mood"
          variant="primary"
          size="lg"
          width="100%"
          icon={<Icon icon={SparklesIcon} />}
          isDisabled={!input}
          isLoading={isAnalyzing}
          onClick={() => input && onAnalyze(input)}
        />
      </VStack>
    </Card>
  );
}
