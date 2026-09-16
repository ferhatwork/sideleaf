import React, { ReactNode, useState } from 'react';
import { Item } from '../types';

export interface SortableItemRenderProps {
  isDraggable: boolean;
  isDragOver: boolean;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: (id: string) => void;
  onDragEnd: () => void;
}

interface SortableItemListProps {
  items: Item[];
  onReorder: (itemIds: string[]) => Promise<void>;
  renderItem: (item: Item, dragProps: SortableItemRenderProps) => ReactNode;
  className?: string;
  visibleCount?: number;
}

/** Renders a note group with a small drag handle and persists visual order. */
export const SortableItemList: React.FC<SortableItemListProps> = ({
  items,
  onReorder,
  renderItem,
  className = '',
  visibleCount,
}) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const visibleItems = visibleCount === undefined ? items : items.slice(0, visibleCount);
  const isDraggable = items.length > 1;

  const handleDragStart = (id: string) => {
    if (!isDraggable) return;
    setDraggedId(id);
    setDragOverId(null);
  };

  const handleDragOver = (id: string) => {
    if (!draggedId || draggedId === id) return;
    setDragOverId(id);
  };

  const handleDrop = async (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const orderedIds = items.map((item) => item.id);
    const sourceIndex = orderedIds.indexOf(draggedId);
    const targetIndex = orderedIds.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const [movedId] = orderedIds.splice(sourceIndex, 1);
    orderedIds.splice(orderedIds.indexOf(targetId), 0, movedId);

    setDraggedId(null);
    setDragOverId(null);
    await onReorder(orderedIds);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div className={className}>
      {visibleItems.map((item) => (
        <React.Fragment key={item.id}>
          {renderItem(item, {
            isDraggable,
            isDragOver: dragOverId === item.id,
            onDragStart: handleDragStart,
            onDragOver: handleDragOver,
            onDrop: handleDrop,
            onDragEnd: handleDragEnd,
          })}
        </React.Fragment>
      ))}
    </div>
  );
};
