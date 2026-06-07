'use client';

import { useState } from 'react';
import type { Block } from '@/lib/api';

const BLOCK_TYPES = ['hero', 'text', 'features', 'cta'] as const;
type BlockType = (typeof BLOCK_TYPES)[number];

function defaultData(type: BlockType): Record<string, unknown> {
  switch (type) {
    case 'hero':
      return { heading: '', subheading: '', ctaText: '', ctaHref: '' };
    case 'text':
      return { content: '' };
    case 'features':
      return { items: [{ title: '', body: '' }] };
    case 'cta':
      return { heading: '', buttonText: '', href: '' };
  }
}

interface FeatureItem {
  title: string;
  body: string;
  icon?: string;
}

interface HeroBlockEditorProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

function HeroBlockEditor({ data, onChange }: HeroBlockEditorProps) {
  const field = (key: string) => (data[key] as string) ?? '';
  const set = (key: string, value: string) => onChange({ ...data, [key]: value });

  return (
    <div className="space-y-3">
      <input
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
        placeholder="Heading"
        value={field('heading')}
        onChange={(e) => set('heading', e.target.value)}
      />
      <input
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
        placeholder="Subheading (optional)"
        value={field('subheading')}
        onChange={(e) => set('subheading', e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          className="px-3 py-2 border border-gray-300 rounded text-sm"
          placeholder="CTA text (optional)"
          value={field('ctaText')}
          onChange={(e) => set('ctaText', e.target.value)}
        />
        <input
          className="px-3 py-2 border border-gray-300 rounded text-sm"
          placeholder="CTA href (optional)"
          value={field('ctaHref')}
          onChange={(e) => set('ctaHref', e.target.value)}
        />
      </div>
    </div>
  );
}

function TextBlockEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  return (
    <textarea
      className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-mono"
      placeholder="HTML content"
      rows={6}
      value={(data.content as string) ?? ''}
      onChange={(e) => onChange({ ...data, content: e.target.value })}
    />
  );
}

function FeaturesBlockEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const items: FeatureItem[] = Array.isArray(data.items) ? (data.items as FeatureItem[]) : [];

  const setItems = (newItems: FeatureItem[]) => onChange({ ...data, items: newItems });

  const updateItem = (idx: number, field: keyof FeatureItem, value: string) => {
    const updated = items.map((item, i) => (i === idx ? { ...item, [field]: value } : item));
    setItems(updated);
  };

  const addItem = () => setItems([...items, { title: '', body: '' }]);

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="border border-gray-200 rounded p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Feature {idx + 1}</span>
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            placeholder="Title"
            value={item.title}
            onChange={(e) => updateItem(idx, 'title', e.target.value)}
          />
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            placeholder="Body"
            rows={2}
            value={item.body}
            onChange={(e) => updateItem(idx, 'body', e.target.value)}
          />
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            placeholder="Icon (optional)"
            value={item.icon ?? ''}
            onChange={(e) => updateItem(idx, 'icon', e.target.value)}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="text-sm text-primary hover:underline"
      >
        + Add feature item
      </button>
    </div>
  );
}

function CtaBlockEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const field = (key: string) => (data[key] as string) ?? '';
  const set = (key: string, value: string) => onChange({ ...data, [key]: value });

  return (
    <div className="space-y-3">
      <input
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
        placeholder="Heading"
        value={field('heading')}
        onChange={(e) => set('heading', e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          className="px-3 py-2 border border-gray-300 rounded text-sm"
          placeholder="Button text"
          value={field('buttonText')}
          onChange={(e) => set('buttonText', e.target.value)}
        />
        <input
          className="px-3 py-2 border border-gray-300 rounded text-sm"
          placeholder="href"
          value={field('href')}
          onChange={(e) => set('href', e.target.value)}
        />
      </div>
    </div>
  );
}

interface BlockEditorProps {
  initialBlocks?: Block[];
  onChange?: (blocks: Block[]) => void;
  /** The name of the hidden input to serialize blocks into */
  name?: string;
}

export default function BlockEditor({
  initialBlocks = [],
  onChange,
  name = 'blocks',
}: BlockEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);

  const updateBlocks = (newBlocks: Block[]) => {
    setBlocks(newBlocks);
    onChange?.(newBlocks);
  };

  const addBlock = (type: BlockType) => {
    updateBlocks([...blocks, { type, data: defaultData(type) }]);
  };

  const removeBlock = (idx: number) => {
    updateBlocks(blocks.filter((_, i) => i !== idx));
  };

  const updateBlockData = (idx: number, data: Record<string, unknown>) => {
    updateBlocks(blocks.map((b, i) => (i === idx ? { ...b, data } : b)));
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const arr = [...blocks];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    updateBlocks(arr);
  };

  const moveDown = (idx: number) => {
    if (idx === blocks.length - 1) return;
    const arr = [...blocks];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    updateBlocks(arr);
  };

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={JSON.stringify(blocks)} />

      {blocks.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400">
          No blocks yet. Add one below.
        </div>
      )}

      {blocks.map((block, idx) => (
        <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Block header */}
          <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {block.type}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-sm px-1"
                title="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveDown(idx)}
                disabled={idx === blocks.length - 1}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-sm px-1"
                title="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeBlock(idx)}
                className="text-red-400 hover:text-red-600 text-xs"
              >
                Remove
              </button>
            </div>
          </div>

          {/* Block body */}
          <div className="p-4">
            {block.type === 'hero' && (
              <HeroBlockEditor
                data={block.data}
                onChange={(d) => updateBlockData(idx, d)}
              />
            )}
            {block.type === 'text' && (
              <TextBlockEditor
                data={block.data}
                onChange={(d) => updateBlockData(idx, d)}
              />
            )}
            {block.type === 'features' && (
              <FeaturesBlockEditor
                data={block.data}
                onChange={(d) => updateBlockData(idx, d)}
              />
            )}
            {block.type === 'cta' && (
              <CtaBlockEditor
                data={block.data}
                onChange={(d) => updateBlockData(idx, d)}
              />
            )}
          </div>
        </div>
      ))}

      {/* Add block */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-gray-500 self-center">Add block:</span>
        {BLOCK_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => addBlock(type)}
            className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded hover:bg-gray-50 transition-colors capitalize"
          >
            + {type}
          </button>
        ))}
      </div>
    </div>
  );
}
