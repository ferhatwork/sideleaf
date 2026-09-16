import React from 'react';
import { Bold, Italic, List, ListOrdered, Palette, RotateCcw } from 'lucide-react';
import { useSideleaf } from '../hooks/useSideleaf';

export type RichTextCommand =
  | 'bold'
  | 'italic'
  | 'foreColor'
  | 'fontName'
  | 'insertUnorderedList'
  | 'insertOrderedList'
  | 'removeFormat';

interface FormattingToolbarProps {
  active?: {
    bold?: boolean;
    italic?: boolean;
    bulletList?: boolean;
    numberedList?: boolean;
  };
  onCommand: (command: RichTextCommand, value?: string) => void;
}

const colorOptions = ['#111827', '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed'];
const fontOptions = ['Arial', 'Georgia', 'Courier New', 'Verdana'];

const preventSelectionLoss = (event: React.MouseEvent<HTMLButtonElement>) => {
  event.preventDefault();
};

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({ active = {}, onCommand }) => {
  const { t } = useSideleaf();

  return (
    <div className="flex items-center gap-1 flex-wrap" role="toolbar" aria-label={t.item.formattingToolbar}>
      <button
        type="button"
        onMouseDown={preventSelectionLoss}
        onClick={() => onCommand('bold')}
        className={`p-1.5 rounded-md transition-colors focus-ring ${
          active.bold
            ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
            : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
        }`}
        aria-label={t.item.bold}
        title={t.item.bold}
        aria-pressed={Boolean(active.bold)}
      >
        <Bold className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={preventSelectionLoss}
        onClick={() => onCommand('italic')}
        className={`p-1.5 rounded-md transition-colors focus-ring ${
          active.italic
            ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
            : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
        }`}
        aria-label={t.item.italic}
        title={t.item.italic}
        aria-pressed={Boolean(active.italic)}
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
          defaultValue="#111827"
          onChange={(event) => onCommand('foreColor', event.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label={t.item.textColor}
        />
      </label>

      <div className="flex items-center gap-1 pl-1 border-l border-neutral-200 dark:border-neutral-700">
        {colorOptions.map((color) => (
          <button
            key={color}
            type="button"
            onMouseDown={preventSelectionLoss}
            onClick={() => onCommand('foreColor', color)}
            className="w-3.5 h-3.5 rounded-full border border-white dark:border-neutral-900 ring-1 ring-neutral-300 dark:ring-neutral-600 focus-ring"
            style={{ backgroundColor: color }}
            aria-label={`${t.item.textColor}: ${color}`}
            title={`${t.item.textColor}: ${color}`}
          />
        ))}
      </div>

      <select
        defaultValue=""
        onChange={(event) => {
          if (event.target.value) onCommand('fontName', event.target.value);
          event.target.value = '';
        }}
        className="ml-1 h-7 rounded-md border border-neutral-200 dark:border-neutral-700 bg-transparent px-1.5 text-[11px] text-neutral-600 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        aria-label={t.item.fontFamily}
        title={t.item.fontFamily}
      >
        <option value="">{t.item.fontFamily}</option>
        {fontOptions.map((font) => (
          <option key={font} value={font}>
            {font}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-0.5 pl-1 border-l border-neutral-200 dark:border-neutral-700">
        <button
          type="button"
          onMouseDown={preventSelectionLoss}
          onClick={() => onCommand('insertUnorderedList')}
          className={`p-1.5 rounded-md transition-colors focus-ring ${
            active.bulletList
              ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
              : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
          aria-label={t.item.bulletList}
          title={t.item.bulletList}
          aria-pressed={Boolean(active.bulletList)}
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={preventSelectionLoss}
          onClick={() => onCommand('insertOrderedList')}
          className={`p-1.5 rounded-md transition-colors focus-ring ${
            active.numberedList
              ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
              : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
          aria-label={t.item.numberedList}
          title={t.item.numberedList}
          aria-pressed={Boolean(active.numberedList)}
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        type="button"
        onMouseDown={preventSelectionLoss}
        onClick={() => onCommand('removeFormat')}
        className="ml-1 p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
        aria-label={t.item.resetFormatting}
        title={t.item.resetFormatting}
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
