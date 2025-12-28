import { useEffect, useCallback, useRef } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right';

interface UseKeyboardNavOptions {
  onSelect?: () => void;
  onBack?: () => void;
  onDirection?: (direction: Direction) => void;
  enabled?: boolean;
}

/**
 * Hook pour la navigation au clavier style TV
 * Gère les flèches directionnelles, Entrée pour sélectionner, Escape/Backspace pour retour
 */
export function useKeyboardNav(options: UseKeyboardNavOptions = {}) {
  const { onSelect, onBack, onDirection, enabled = true } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        onDirection?.('up');
        break;
      case 'ArrowDown':
        event.preventDefault();
        onDirection?.('down');
        break;
      case 'ArrowLeft':
        event.preventDefault();
        onDirection?.('left');
        break;
      case 'ArrowRight':
        event.preventDefault();
        onDirection?.('right');
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect?.();
        break;
      case 'Escape':
      case 'Backspace':
        // Ne pas prévenir le défaut pour Backspace si on est dans un input
        if (event.key === 'Backspace' && 
            (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
          return;
        }
        event.preventDefault();
        onBack?.();
        break;
    }
  }, [enabled, onSelect, onBack, onDirection]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook pour gérer le focus dans une grille/liste d'éléments
 */
export function useFocusGrid<T extends HTMLElement = HTMLElement>(
  itemCount: number,
  columns: number = 1,
  options: {
    loop?: boolean;
    onItemSelect?: (index: number) => void;
    enabled?: boolean;
  } = {}
) {
  const { loop = true, onItemSelect, enabled = true } = options;
  const focusedIndexRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const focusItem = useCallback((index: number) => {
    if (index < 0 || index >= itemCount) return;
    
    focusedIndexRef.current = index;
    
    const container = containerRef.current;
    if (!container) return;
    
    const items = container.querySelectorAll<T>('[data-focusable="true"]');
    const item = items[index];
    
    if (item) {
      item.focus();
      // Scroll into view si nécessaire
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [itemCount]);

  const handleDirection = useCallback((direction: Direction) => {
    const currentIndex = focusedIndexRef.current;
    let nextIndex = currentIndex;

    switch (direction) {
      case 'up':
        nextIndex = currentIndex - columns;
        break;
      case 'down':
        nextIndex = currentIndex + columns;
        break;
      case 'left':
        nextIndex = currentIndex - 1;
        break;
      case 'right':
        nextIndex = currentIndex + 1;
        break;
    }

    // Gestion du loop
    if (loop) {
      if (nextIndex < 0) {
        nextIndex = itemCount + nextIndex;
      } else if (nextIndex >= itemCount) {
        nextIndex = nextIndex - itemCount;
      }
    }

    // Vérifier les limites
    if (nextIndex >= 0 && nextIndex < itemCount) {
      focusItem(nextIndex);
    }
  }, [itemCount, columns, loop, focusItem]);

  const handleSelect = useCallback(() => {
    onItemSelect?.(focusedIndexRef.current);
  }, [onItemSelect]);

  useKeyboardNav({
    onDirection: handleDirection,
    onSelect: handleSelect,
    enabled,
  });

  // Focus le premier élément au montage
  useEffect(() => {
    if (enabled && itemCount > 0) {
      // Petit délai pour s'assurer que le DOM est prêt
      const timeout = setTimeout(() => focusItem(0), 100);
      return () => clearTimeout(timeout);
    }
  }, [enabled, itemCount, focusItem]);

  return {
    containerRef,
    focusedIndex: focusedIndexRef.current,
    focusItem,
  };
}

/**
 * Hook pour gérer le focus d'un élément individuel
 */
export function useFocusable(
  onFocus?: () => void,
  onBlur?: () => void
) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocus = () => onFocus?.();
    const handleBlur = () => onBlur?.();

    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);

    return () => {
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    };
  }, [onFocus, onBlur]);

  return ref;
}

/**
 * Hook pour détecter si un élément est focusé
 */
export function useIsFocused() {
  const ref = useRef<HTMLElement>(null);
  const isFocusedRef = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocus = () => { isFocusedRef.current = true; };
    const handleBlur = () => { isFocusedRef.current = false; };

    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);

    return () => {
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    };
  }, []);

  return { ref, isFocused: isFocusedRef };
}

/**
 * Composant wrapper pour rendre un élément focusable avec navigation TV
 */
export function getFocusableProps(tabIndex: number = 0) {
  return {
    tabIndex,
    'data-focusable': 'true',
  };
}

