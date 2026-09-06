export interface ShortcutHandler {
  key: string;
  ctrlOrCmd?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: (e: KeyboardEvent) => void;
  allowInInputs?: boolean;
}

export function registerGlobalShortcuts(handlers: ShortcutHandler[]): () => void {
  const listener = (event: KeyboardEvent) => {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const hasCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
    const target = event.target as HTMLElement | null;
    const isInput =
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable);

    for (const h of handlers) {
      if (h.ctrlOrCmd && !hasCtrlOrCmd) continue;
      if (!h.ctrlOrCmd && hasCtrlOrCmd) continue;
      if (h.shift && !event.shiftKey) continue;
      if (h.alt && !event.altKey) continue;

      const eventKey = event.key.toLowerCase();
      const targetKey = h.key.toLowerCase();

      // Special key normalization
      const match =
        eventKey === targetKey ||
        (targetKey === 'space' && (eventKey === ' ' || event.code === 'Space'));

      if (match) {
        // If inside input, only execute if explicitly allowed (like Ctrl+Space or Ctrl+K or Esc)
        if (isInput && !h.allowInInputs) {
          continue;
        }

        event.preventDefault();
        h.action(event);
        break;
      }
    }
  };

  window.addEventListener('keydown', listener);
  return () => window.removeEventListener('keydown', listener);
}
