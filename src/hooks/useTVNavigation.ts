import { useState, useEffect, useCallback, useRef } from 'react';

export type FocusZone = 'sidebar' | 'content';

interface TVNavigationState {
  focusZone: FocusZone;
  sidebarIndex: number;
  contentRow: number;
  contentCol: number;
}

interface UseTVNavigationProps {
  sidebarItemCount: number;
  contentCols: number;
  contentRowCount: number;
  onSidebarSelect: (index: number) => void;
  onContentSelect: (row: number, col: number) => void;
  enabled?: boolean;
}

export function useTVNavigation({
  sidebarItemCount,
  contentCols,
  contentRowCount,
  onSidebarSelect,
  onContentSelect,
  enabled = true,
}: UseTVNavigationProps) {
  const [state, setState] = useState<TVNavigationState>({
    focusZone: 'sidebar',
    sidebarIndex: 0,
    contentRow: 0,
    contentCol: 0,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const setFocusZone = useCallback((zone: FocusZone) => {
    setState(prev => ({ ...prev, focusZone: zone }));
  }, []);

  const setSidebarIndex = useCallback((index: number) => {
    setState(prev => ({ ...prev, sidebarIndex: index }));
  }, []);

  const setContentPosition = useCallback((row: number, col: number) => {
    setState(prev => ({ ...prev, contentRow: row, contentCol: col }));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const { focusZone, sidebarIndex, contentRow, contentCol } = stateRef.current;

      // Ignore si un input est focus
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA' ||
          document.activeElement?.tagName === 'SELECT') {
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (focusZone === 'sidebar') {
            const newIndex = Math.max(0, sidebarIndex - 1);
            setState(prev => ({ ...prev, sidebarIndex: newIndex }));
          } else {
            const newRow = Math.max(0, contentRow - 1);
            setState(prev => ({ ...prev, contentRow: newRow }));
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (focusZone === 'sidebar') {
            const newIndex = Math.min(sidebarItemCount - 1, sidebarIndex + 1);
            setState(prev => ({ ...prev, sidebarIndex: newIndex }));
          } else {
            const newRow = Math.min(contentRowCount - 1, contentRow + 1);
            setState(prev => ({ ...prev, contentRow: newRow }));
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (focusZone === 'content') {
            if (contentCol > 0) {
              setState(prev => ({ ...prev, contentCol: contentCol - 1 }));
            } else {
              // Retour au sidebar
              setState(prev => ({ ...prev, focusZone: 'sidebar' }));
            }
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (focusZone === 'sidebar') {
            // Aller au contenu
            setState(prev => ({ ...prev, focusZone: 'content' }));
          } else {
            const newCol = Math.min(contentCols - 1, contentCol + 1);
            setState(prev => ({ ...prev, contentCol: newCol }));
          }
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusZone === 'sidebar') {
            onSidebarSelect(sidebarIndex);
          } else {
            onContentSelect(contentRow, contentCol);
          }
          break;

        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          if (focusZone === 'content') {
            setState(prev => ({ ...prev, focusZone: 'sidebar' }));
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, sidebarItemCount, contentCols, contentRowCount, onSidebarSelect, onContentSelect]);

  return {
    ...state,
    setFocusZone,
    setSidebarIndex,
    setContentPosition,
  };
}

// Hook simplifié pour les grilles de contenu
export function useGridNavigation(
  itemCount: number,
  cols: number,
  onSelect: (index: number) => void,
  onBack?: () => void,
  enabled = true
) {
  const [focusIndex, setFocusIndex] = useState(0);
  const focusIndexRef = useRef(focusIndex);
  focusIndexRef.current = focusIndex;

  const rows = Math.ceil(itemCount / cols);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA' ||
          document.activeElement?.tagName === 'SELECT') {
        return;
      }

      const currentIndex = focusIndexRef.current;
      const currentRow = Math.floor(currentIndex / cols);
      const currentCol = currentIndex % cols;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (currentRow > 0) {
            setFocusIndex(currentIndex - cols);
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (currentRow < rows - 1) {
            const newIndex = Math.min(itemCount - 1, currentIndex + cols);
            setFocusIndex(newIndex);
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (currentCol > 0) {
            setFocusIndex(currentIndex - 1);
          } else if (onBack) {
            onBack();
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (currentCol < cols - 1 && currentIndex < itemCount - 1) {
            setFocusIndex(currentIndex + 1);
          }
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect(currentIndex);
          break;

        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          if (onBack) onBack();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, itemCount, cols, rows, onSelect, onBack]);

  return { focusIndex, setFocusIndex };
}


