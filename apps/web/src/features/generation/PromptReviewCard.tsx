'use client';

import {Card} from '@astryxdesign/core/Card';
import {HStack, VStack, StackItem} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {Button} from '@astryxdesign/core/Button';
import {IconButton} from '@astryxdesign/core/IconButton';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Divider} from '@astryxdesign/core/Divider';
import {ArrowPathIcon, DocumentTextIcon, MusicalNoteIcon, TrashIcon} from '@heroicons/react/24/outline';
import type {PlannedPrompt} from './types';

/** Step 1 result: the planned song prompts, editable before anything is generated. */
export function PromptReviewCard({
  prompts,
  onChange,
  onRemove,
  onReplan,
  onGenerate,
}: {
  prompts: PlannedPrompt[];
  onChange: (id: string, prompt: string) => void;
  onRemove: (id: string) => void;
  onReplan: () => void;
  onGenerate: () => void;
}) {
  return (
    <Card padding={5}>
      <VStack gap={4}>
        <HStack hAlign="between" vAlign="center" gap={3} wrap="wrap">
          <HStack gap={2} vAlign="center">
            <Icon icon={DocumentTextIcon} color="accent" />
            <Heading level={3}>Review Prompts</Heading>
            <Text color="secondary">({prompts.length})</Text>
          </HStack>
          <Button
            label="Plan again"
            size="sm"
            variant="ghost"
            icon={<Icon icon={ArrowPathIcon} />}
            onClick={onReplan}
          />
        </HStack>
        <Text type="supporting">
          The AI planned one prompt per song. Edit any of them or remove the ones you do not want,
          then generate.
        </Text>

        <VStack gap={3}>
          {prompts.map((p, i) => (
            <VStack key={p.id} gap={2}>
              {i > 0 && <Divider />}
              <HStack gap={2} vAlign="center">
                <Text color="secondary" hasTabularNumbers>
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <StackItem size="fill">
                  <Text weight="semibold">{p.title}</Text>
                </StackItem>
                <IconButton
                  label={`Remove ${p.title}`}
                  variant="ghost"
                  size="sm"
                  icon={<Icon icon={TrashIcon} />}
                  isDisabled={prompts.length <= 1}
                  onClick={() => onRemove(p.id)}
                />
              </HStack>
              <TextArea
                label={`Prompt for ${p.title}`}
                isLabelHidden
                rows={2}
                value={p.prompt}
                onChange={value => onChange(p.id, value)}
              />
            </VStack>
          ))}
        </VStack>

        <Button
          label={`Generate ${prompts.length} songs`}
          variant="primary"
          size="lg"
          width="100%"
          icon={<Icon icon={MusicalNoteIcon} />}
          onClick={onGenerate}
        />
      </VStack>
    </Card>
  );
}
