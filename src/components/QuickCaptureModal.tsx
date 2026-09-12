import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ItemType, Workspace, BulkParseResult } from '../types';
import { X, ArrowRight, ChevronDown, Link as LinkIcon, Check } from 'lucide-react';
import { extractUrls } from '../utils/format';
import { parseBulkInput } from '../utils/linkParser';
import { useSideleaf } from '../hooks/useSideleaf';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (params: {
    content: string;
    type: ItemType;
    workspaceId: string | null;
    sectionId?: string | null;
    sourceUrl?: string;
    sourceTitle?: string;
  }) => Promise<unknown>;
  workspaces: Workspace[];
  activeWorkspaceId?: string | null;
}

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({
  isOpen,
  onClose,
  onSave,
  workspaces,
  activeWorkspaceId = null,
}) => {
  const { t, sections, addBulkItems } = useSideleaf();
  const [content, setContent] = useState('');
  const [type, setType] = useState<ItemType>('text');
  const [workspaceId, setWorkspaceId] = useState<string | null>(activeWorkspaceId);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isSectionMenuOpen, setIsSectionMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedMultiLink, setDetectedMultiLink] = useState<BulkParseResult | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const sectionMenuRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const selectedWorkspace = useMemo(() => {
    if (!workspaceId) return null;
    return workspaces.find((w) => w.id === workspaceId) || null;
  }, [workspaces, workspaceId]);

  const workspaceSections = useMemo(() => {
    if (!workspaceId) return [];
    return sections
      .filter((s) => s.workspaceId === workspaceId)
      .sort((a, b) => a.order - b.order);
  }, [sections, workspaceId]);

  const selectedSection = useMemo(() => {
    if (!sectionId) return null;
    return workspaceSections.find((s) => s.id === sectionId) || null;
  }, [workspaceSections, sectionId]);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setContent('');
      setType('text');
      setWorkspaceId(activeWorkspaceId);
      setSectionId(null);
      setIsWorkspaceMenuOpen(false);
      setIsSectionMenuOpen(false);
      setDetectedMultiLink(null);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 30);
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen, activeWorkspaceId]);

  // Click outside to close dropdown popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        workspaceMenuRef.current &&
        !workspaceMenuRef.current.contains(e.target as Node)
      ) {
        setIsWorkspaceMenuOpen(false);
      }
      if (
        sectionMenuRef.current &&
        !sectionMenuRef.current.contains(e.target as Node)
      ) {
        setIsSectionMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Window Escape key handler (closes open popover first, then closes modal)
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isWorkspaceMenuOpen || isSectionMenuOpen) {
          e.preventDefault();
          e.stopPropagation();
          setIsWorkspaceMenuOpen(false);
          setIsSectionMenuOpen(false);
          return;
        }
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [isOpen, isWorkspaceMenuOpen, isSectionMenuOpen, onClose]);

  // Reset section if workspace changes and section does not belong to new workspace
  useEffect(() => {
    if (sectionId && !workspaceSections.some((s) => s.id === sectionId)) {
      setSectionId(null);
    }
  }, [workspaceId, workspaceSections, sectionId]);

  if (!isOpen) return null;

  const handleSave = async (overrideType?: ItemType) => {
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) {
      onClose();
      return;
    }
    try {
      setIsSubmitting(true);
      await onSave({
        content: trimmed,
        type: overrideType || type,
        workspaceId,
        sectionId: sectionId || undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSeparateLinks = async () => {
    if (!detectedMultiLink || isSubmitting) return;
    try {
      setIsSubmitting(true);
      await addBulkItems(
        detectedMultiLink.links.map((link) => ({
          content: link.title || link.url,
          type: 'link',
          workspaceId,
          sectionId: sectionId || undefined,
          sourceUrl: link.url,
          sourceTitle: link.title,
        }))
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasteAsText = () => {
    if (!detectedMultiLink) return;
    setContent(detectedMultiLink.originalText);
    setDetectedMultiLink(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Focus trapping
    if (e.key === 'Tab') {
      if (!modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
      return;
    }

    // Ctrl+Enter converts/saves immediately as a checklist task!
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave('checklist');
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      if (isWorkspaceMenuOpen || isSectionMenuOpen) {
        e.preventDefault();
        e.stopPropagation();
        setIsWorkspaceMenuOpen(false);
        setIsSectionMenuOpen(false);
        return;
      }
      e.preventDefault();
      onClose();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;

    // Check for multi-link paste
    const parsed = parseBulkInput(pasted);
    if (parsed.isMultiLink) {
      e.preventDefault();
      setDetectedMultiLink(parsed);
      return;
    }

    const trimmed = pasted.trim();
    const urls = extractUrls(trimmed);

    if (trimmed === '---' || trimmed === '***') {
      setType('divider');
    } else if (urls.length === 1 && trimmed === urls[0]) {
      setType('link');
    } else if (trimmed.startsWith('>') || /^["“].*["”]$/s.test(trimmed)) {
      setType('quote');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-capture-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-xl rounded-xl border border-neutral-200 dark:border-sideleaf-dark-border bg-white dark:bg-sideleaf-dark-surface shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              id="quick-capture-title"
              className="text-xs font-semibold text-neutral-500 uppercase tracking-wider"
            >
              {t.capture.quickCaptureTitle}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-400 font-mono">
              Ctrl+Space
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label={t.common.close}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded focus-ring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          {/* Multi-link detected notification banner */}
          {detectedMultiLink ? (
            <div className="p-3 mb-3 rounded-lg border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/25 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-blue-900 dark:text-blue-200">
                <LinkIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>
                  {detectedMultiLink.links.length} {t.bulk.linksDetected}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleAddSeparateLinks}
                  disabled={isSubmitting}
                  className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium focus-ring transition-colors"
                >
                  {t.bulk.addAsSeparateLinks}
                </button>
                <button
                  type="button"
                  onClick={handlePasteAsText}
                  disabled={isSubmitting}
                  className="px-2.5 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-xs focus-ring transition-colors"
                >
                  {t.bulk.pasteAsText}
                </button>
                <button
                  type="button"
                  onClick={() => setDetectedMultiLink(null)}
                  className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 px-2 py-1 rounded focus-ring"
                >
                  {t.common.cancel}
                </button>
              </div>
            </div>
          ) : null}

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={handlePaste}
            placeholder={t.capture.focusedPlaceholder}
            rows={3}
            aria-label={t.capture.focusedPlaceholder}
            className="w-full bg-transparent resize-none text-base text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none"
          />

          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {type !== 'text' && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 capitalize">
                  {t.types[type] || type}
                </span>
              )}

              {/* Destination selector: Native Sideleaf dropdown menus */}
              <div className="relative flex items-center gap-1 text-xs">
                {/* Workspace selector */}
                <div className="relative" ref={workspaceMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen);
                      setIsSectionMenuOpen(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus-ring"
                    aria-label={t.item.moveToWorkspace}
                    aria-expanded={isWorkspaceMenuOpen}
                    aria-haspopup="true"
                  >
                    {selectedWorkspace ? (
                      <>
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: selectedWorkspace.color || '#3b82f6' }}
                          aria-hidden="true"
                        />
                        <span className="max-w-[130px] sm:max-w-[180px] truncate font-medium">
                          {selectedWorkspace.name}
                        </span>
                      </>
                    ) : (
                      <span className="font-medium">{t.item.scratchOption}</span>
                    )}
                    <ChevronDown className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                  </button>

                  {isWorkspaceMenuOpen && (
                    <div
                      role="menu"
                      className="absolute bottom-full mb-1.5 left-0 w-48 max-h-60 overflow-y-auto py-1 rounded-lg bg-white dark:bg-sideleaf-dark-elevated shadow-xl border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 z-50 animate-in fade-in zoom-in-95 duration-100"
                    >
                      <div className="px-3 py-1 font-semibold text-[10px] text-neutral-400 uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800">
                        {t.item.moveToWorkspace}
                      </div>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setWorkspaceId(null);
                          setSectionId(null);
                          setIsWorkspaceMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between transition-colors"
                      >
                        <span>{t.item.scratchOption}</span>
                        {!workspaceId && (
                          <Check className="w-3 h-3 text-blue-500 flex-shrink-0" />
                        )}
                      </button>
                      {workspaces.map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setWorkspaceId(w.id);
                            setIsWorkspaceMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between transition-colors truncate"
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: w.color || '#3b82f6' }}
                            />
                            <span className="truncate">{w.name}</span>
                          </span>
                          {workspaceId === w.id && (
                            <Check className="w-3 h-3 text-blue-500 flex-shrink-0 ml-1.5" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section selector (if workspace has sections) */}
                {selectedWorkspace && workspaceSections.length > 0 && (
                  <>
                    <span className="text-neutral-300 dark:text-neutral-600 text-xs select-none">
                      ›
                    </span>
                    <div className="relative" ref={sectionMenuRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSectionMenuOpen(!isSectionMenuOpen);
                          setIsWorkspaceMenuOpen(false);
                        }}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus-ring"
                        aria-label={t.section.section}
                        aria-expanded={isSectionMenuOpen}
                        aria-haspopup="true"
                      >
                        <span className="max-w-[120px] sm:max-w-[160px] truncate font-medium">
                          {selectedSection ? selectedSection.name : t.section.unsectioned}
                        </span>
                        <ChevronDown className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                      </button>

                      {isSectionMenuOpen && (
                        <div
                          role="menu"
                          className="absolute bottom-full mb-1.5 left-0 w-44 max-h-60 overflow-y-auto py-1 rounded-lg bg-white dark:bg-sideleaf-dark-elevated shadow-xl border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 z-50 animate-in fade-in zoom-in-95 duration-100"
                        >
                          <div className="px-3 py-1 font-semibold text-[10px] text-neutral-400 uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800">
                            {t.section.section}
                          </div>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setSectionId(null);
                              setIsSectionMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between transition-colors"
                          >
                            <span>{t.section.unsectioned}</span>
                            {!sectionId && (
                              <Check className="w-3 h-3 text-blue-500 flex-shrink-0" />
                            )}
                          </button>
                          {workspaceSections.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setSectionId(s.id);
                                setIsSectionMenuOpen(false);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between transition-colors truncate"
                            >
                              <span className="truncate">{s.name}</span>
                              {sectionId === s.id && (
                                <Check className="w-3 h-3 text-blue-500 flex-shrink-0 ml-1.5" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono hidden sm:inline">
                {t.capture.saveHint} · {t.capture.taskHint}
              </span>
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={!content.trim() || isSubmitting}
                className="px-3 py-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring flex items-center gap-1.5"
                title={`${t.common.save} (${t.capture.saveHint})`}
                aria-label={t.common.save}
              >
                <span>{t.common.save}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
