import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Check, X } from 'lucide-react';
import { ItemFormatting } from '../types';
import { plainTextToRichHtml, richTextToPlainText, sanitizeRichText } from '../utils/richText';
import { FormattingToolbar, RichTextCommand } from './FormattingToolbar';
import { useSideleaf } from '../hooks/useSideleaf';

export interface RichTextEditorHandle {
  focus: () => void;
  setContent: (content: string, richContent?: string) => void;
}

interface RichTextEditorProps {
  initialContent: string;
  initialRichContent?: string;
  legacyFormatting?: ItemFormatting;
  autoList?: boolean;
  autoFocus?: boolean;
  showActions?: boolean;
  saveOnBlur?: boolean;
  ariaLabel: string;
  onChange: (content: string, richContent: string) => void;
  onPaste?: (event: React.ClipboardEvent<HTMLDivElement>) => void;
  onSave: (content?: string, richContent?: string) => void;
  onCancel: () => void;
  onSubmitTask?: (content?: string, richContent?: string) => void;
}

interface ActiveFormatting {
  bold: boolean;
  italic: boolean;
  bulletList: boolean;
  numberedList: boolean;
}

const defaultActiveFormatting: ActiveFormatting = {
  bold: false,
  italic: false,
  bulletList: false,
  numberedList: false,
};

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  (
    {
      initialContent,
      initialRichContent,
      legacyFormatting,
      autoList = false,
      autoFocus = true,
      showActions = true,
      saveOnBlur = true,
      ariaLabel,
      onChange,
      onPaste,
      onSave,
      onCancel,
      onSubmitTask,
    },
    ref
  ) => {
    const { t } = useSideleaf();
    const editorRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const savedSelectionRef = useRef<Range | null>(null);
    const [active, setActive] = useState<ActiveFormatting>(defaultActiveFormatting);

    useImperativeHandle(ref, () => ({
      focus: () => editorRef.current?.focus(),
      setContent: (content: string, richContent?: string) => {
        const editor = editorRef.current;
        if (!editor) return;
        const cleanHtml = richContent
          ? sanitizeRichText(richContent)
          : plainTextToRichHtml(content);
        editor.innerHTML = cleanHtml;
        onChange(richTextToPlainText(cleanHtml), cleanHtml);
        editor.focus();
      },
    }));

    useEffect(() => {
      if (!editorRef.current) return;
      const startingHtml = initialRichContent
        ? sanitizeRichText(initialRichContent)
        : plainTextToRichHtml(initialContent, legacyFormatting, autoList);
      editorRef.current.innerHTML = startingHtml;
      if (autoFocus) editorRef.current.focus();
      updateActiveFormatting();
      // The editor owns its DOM while mounted; syncing props here would reset the caret
      // after every keystroke.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isInsideEditor = (node: Node | null): boolean =>
      Boolean(node && editorRef.current?.contains(node));

    const saveSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !isInsideEditor(selection.anchorNode)) return;
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    };

    const restoreSelection = () => {
      const editor = editorRef.current;
      const savedSelection = savedSelectionRef.current;
      if (!editor) return;

      editor.focus();
      if (!savedSelection || !editor.contains(savedSelection.commonAncestorContainer)) return;
      const selection = window.getSelection();
      if (!selection) return;
      selection.removeAllRanges();
      selection.addRange(savedSelection);
    };

    function updateActiveFormatting() {
      if (!editorRef.current) return;
      const readCommandState = (command: string): boolean => {
        try {
          return document.queryCommandState(command);
        } catch {
          return false;
        }
      };

      setActive({
        bold: readCommandState('bold'),
        italic: readCommandState('italic'),
        bulletList: readCommandState('insertUnorderedList'),
        numberedList: readCommandState('insertOrderedList'),
      });
    }

    const readCurrentValue = () => {
      const editor = editorRef.current;
      if (!editor) return { content: '', richContent: '' };
      const cleanHtml = sanitizeRichText(editor.innerHTML);
      return {
        content: richTextToPlainText(cleanHtml),
        richContent: cleanHtml,
      };
    };

    const emitChange = () => {
      const currentValue = readCurrentValue();
      const { content: plainText, richContent: cleanHtml } = currentValue;
      onChange(plainText, cleanHtml);
      saveSelection();
      updateActiveFormatting();
      return currentValue;
    };

    const handleCommand = (command: RichTextCommand, value?: string) => {
      restoreSelection();
      try {
        document.execCommand('styleWithCSS', false, 'true');
      } catch {
        // Some browsers do not expose styleWithCSS; the command still works without it.
      }
      try {
        if (command === 'removeFormat') {
          document.execCommand('removeFormat', false);
          if (document.queryCommandState('insertUnorderedList')) {
            document.execCommand('insertUnorderedList', false);
          }
          if (document.queryCommandState('insertOrderedList')) {
            document.execCommand('insertOrderedList', false);
          }
        } else {
          document.execCommand(command, false, value);
        }
      } catch {
        return;
      }
      emitChange();
    };

    const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
      saveSelection();
      const nextTarget = event.relatedTarget as Node | null;
      if (saveOnBlur && (!nextTarget || !containerRef.current?.contains(nextTarget))) {
        const currentValue = emitChange();
        onSave(currentValue.content, currentValue.richContent);
      }
    };

    return (
      <div ref={containerRef} className="space-y-2">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel}
          data-placeholder={ariaLabel}
          onInput={emitChange}
          onPaste={onPaste}
          onBlur={handleBlur}
          onFocus={updateActiveFormatting}
          onKeyUp={updateActiveFormatting}
          onMouseUp={updateActiveFormatting}
          onSelect={saveSelection}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && onSubmitTask) {
              event.preventDefault();
              const currentValue = emitChange();
              onSubmitTask(currentValue.content, currentValue.richContent);
            } else if (event.key === 'Escape') {
              event.preventDefault();
              onCancel();
            }
          }}
          className="rich-text-editor min-h-[1.5rem] w-full bg-transparent resize-none text-sm leading-relaxed text-neutral-900 dark:text-neutral-100 focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-400 dark:empty:before:text-neutral-500"
        />

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
          <FormattingToolbar active={active} onCommand={handleCommand} />
          {showActions && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={onCancel}
                className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
                aria-label={t.common.cancel}
                title={t.common.cancel}
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentValue = emitChange();
                  onSave(currentValue.content, currentValue.richContent);
                }}
                className="p-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 focus-ring"
                aria-label={t.common.save}
                title={t.common.save}
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';
