import React from 'react';
import { Bold, Italic, List, ListOrdered, Palette, RotateCcw } from 'lucide-react';
import { ItemFormatting, ItemFontFamily, ItemListStyle } from '../types';
import { useSideleaf } from '../hooks/useSideleaf';

interface FormattingToolbarProps {
  formatting: ItemFormatting;
  onChange: (formatting: ItemFormatting) => void;
}

const fontOptions: Array<{ value: ItemFontFamily; label: string }> = [
  { value: 'sans', label: 'Sans' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Mono' },
];

const colorOptions = ['#111827', '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed'];

const emptyFormatting: ItemFormatting = {};

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({ formatting, onChange }) => {
  const { t } = useSideleaf();

  const update = (updates: Partial<ItemFormatting>) => {
    onChange({ ...formatting, ...updates });
  };

  const listStyle: ItemListStyle = formatting.listStyle || 'none';

  return (
    <div
      className="flex items-center gap-1 flex-wrap"
      role="toolbar"
      aria-label={t.item.formattingToolbar}
    >
      <button
        type="button"
        onClick={() => update({ bold: !formatting.bold })}
        className={`p-1.5 rounded-md transition-colors focus-ring ${
          formatting.bold
            ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
            : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
        }`}
        aria-label={t.item.bold}
        title={t.item.bold}
        aria-pressed={Boolean(formatting.bold)}
      >
        <Bold className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => update({ italic: !formatting.italic })}
        className={`p-1.5 rounded-md transition-colors focus-ring ${
          formatting.italic
            ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
            : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
        }`}
        aria-label={t.item.italic}
        title={t.item.italic}
        aria-pressed={Boolean(formatting.italic)}
      >
        <Italic className="w-3.5 h-3.5" />
      </button>

      <label
        className="relative p-1.5 rounded-md text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer focus-within:ring-2 focus-within:ring-blue-500/50"
        title={t.item.textColor}
        aria-label={t.item.textColor}
      >
        <Palette className="w-3.5 h-3.5" />
        <input
          type="color"
          value={formatting.color || '#111827'}
          onChange={(event) => update({ color: event.target.value })}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label={t.item.textColor}
        />
      </label>

      <div className="flex items-center gap-1 pl-1 border-l border-neutral-200 dark:border-neutral-700">
        {colorOptions.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => update({ color })}
            className="w-3.5 h-3.5 rounded-full border border-white dark:border-neutral-900 ring-1 ring-neutral-300 dark:ring-neutral-600 focus-ring"
            style={{ backgroundColor: color }}
            aria-label={`${t.item.textColor}: ${color}`}
            title={`${t.item.textColor}: ${color}`}
          />
        ))}
      </div>

      <select
        value={formatting.fontFamily || 'sans'}
        onChange={(event) => update({ fontFamily: event.target.value as ItemFontFamily })}
        className="ml-1 h-7 rounded-md border border-neutral-200 dark:border-neutral-700 bg-transparent px-1.5 text-[11px] text-neutral-600 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        aria-label={t.item.fontFamily}
        title={t.item.fontFamily}
      >
        {fontOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-0.5 pl-1 border-l border-neutral-200 dark:border-neutral-700">
        <button
          type="button"
          onClick={() => update({ listStyle: listStyle === 'bullet' ? 'none' : 'bullet' })}
          className={`p-1.5 rounded-md transition-colors focus-ring ${
            listStyle === 'bullet'
              ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
              : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
          aria-label={t.item.bulletList}
          title={t.item.bulletList}
          aria-pressed={listStyle === 'bullet'}
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => update({ listStyle: listStyle === 'numbered' ? 'none' : 'numbered' })}
          className={`p-1.5 rounded-md transition-colors focus-ring ${
            listStyle === 'numbered'
              ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
              : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
          aria-label={t.item.numberedList}
          title={t.item.numberedList}
          aria-pressed={listStyle === 'numbered'}
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
      </div>

      {Object.keys(formatting).length > 0 && (
        <button
          type="button"
          onClick={() => onChange(emptyFormatting)}
          className="ml-1 p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
          aria-label={t.item.resetFormatting}
          title={t.item.resetFormatting}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
