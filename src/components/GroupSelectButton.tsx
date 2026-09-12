import React from 'react';

interface GroupSelectButtonProps {
  itemIds: string[];
  selectedIds: Set<string>;
  onToggle: (ids: string[]) => void;
  selectAllLabel: string;
  clearSelectionLabel: string;
  className?: string;
  alwaysVisible?: boolean;
}

export const GroupSelectButton: React.FC<GroupSelectButtonProps> = ({
  itemIds,
  selectedIds,
  onToggle,
  selectAllLabel,
  clearSelectionLabel,
  className = '',
  alwaysVisible = true,
}) => {
  if (itemIds.length === 0) return null;

  const allSelected = itemIds.length > 0 && itemIds.every((id) => selectedIds.has(id));
  const someSelected = itemIds.some((id) => selectedIds.has(id));

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle(itemIds);
      }}
      className={`text-[11px] font-medium transition-colors focus-ring rounded px-1.5 py-0.5 select-none ${
        allSelected || someSelected
          ? 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
          : 'text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-200'
      } ${
        alwaysVisible || someSelected
          ? 'opacity-100'
          : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100'
      } ${className}`}
      aria-label={allSelected ? clearSelectionLabel : selectAllLabel}
      title={allSelected ? clearSelectionLabel : selectAllLabel}
    >
      {allSelected ? clearSelectionLabel : selectAllLabel}
    </button>
  );
};
