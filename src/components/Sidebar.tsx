import { useEffect, useRef } from 'react';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  focusedIndex?: number;
  isFocused?: boolean;
  onFocusChange?: (index: number) => void;
}

const navItems = [
  { id: 'search', icon: SearchIcon, label: 'Recherche' },
  { id: 'favorites', icon: HeartIcon, label: 'Favoris' },
  { id: 'tv', icon: TvIcon, label: 'TV' },
  { id: 'movies', icon: FilmIcon, label: 'Films' },
  { id: 'series', icon: SeriesIcon, label: 'Séries' },
  { id: 'anime', icon: AnimeIcon, label: 'Animés' },
  { id: 'settings', icon: SettingsIcon, label: 'Paramètres' },
];

export default function Sidebar({ 
  activeSection, 
  onSectionChange,
  focusedIndex = -1,
  isFocused = false,
  onFocusChange,
}: SidebarProps) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Scroll le bouton focusé en vue
  useEffect(() => {
    if (isFocused && focusedIndex >= 0 && buttonRefs.current[focusedIndex]) {
      buttonRefs.current[focusedIndex]?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    }
  }, [focusedIndex, isFocused]);

  return (
    <aside style={{
      width: 70,
      minWidth: 70,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 12,
      paddingBottom: 8,
      background: 'linear-gradient(180deg, #0f0f14 0%, #08080a 100%)',
      borderRight: '1px solid rgba(255,255,255,0.04)',
      overflow: 'hidden'
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <div style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3" fill="#000"/>
          </svg>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2, 
        width: '100%', 
        padding: '0 6px',
      }}>
        {navItems.map((item, index) => {
          const isActive = activeSection === item.id;
          const isNavFocused = isFocused && focusedIndex === index;
          
          return (
            <button
              key={item.id}
              ref={el => buttonRefs.current[index] = el}
              onClick={() => onSectionChange(item.id)}
              onFocus={() => onFocusChange?.(index)}
              tabIndex={0}
              title={item.label}
              style={{
                width: '100%',
                padding: '6px 2px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                background: isActive 
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)'
                  : 'transparent',
                border: 'none',
                outline: isActive ? '1px solid rgba(255,255,255,0.2)' : (isNavFocused ? '1px solid rgba(255,255,255,0.4)' : 'none'),
                color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                }
              }}
            >
              <item.icon />
              <span style={{ 
                fontSize: 9, 
                fontWeight: 500,
                letterSpacing: '0.01em',
                textTransform: 'uppercase',
                textAlign: 'center',
                lineHeight: 1.1
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Version */}
      <div style={{ 
        fontSize: 9, 
        color: 'rgba(255,255,255,0.2)',
        letterSpacing: '0.03em',
        flexShrink: 0,
        marginTop: 4
      }}>
        v1.0
      </div>
    </aside>
  );
}

// Exporter le nombre d'items pour la navigation
export const SIDEBAR_ITEM_COUNT = navItems.length;
export const SIDEBAR_ITEMS = navItems;

function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TvIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="4" width="20" height="14"/>
      <path d="M8 21h8M12 18v3" strokeLinecap="round"/>
    </svg>
  );
}

function FilmIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="20" height="20"/>
      <path d="M7 2v20M17 2v20M2 7h5M17 7h5M2 12h20M2 17h5M17 17h5"/>
    </svg>
  );
}

function SeriesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="20" height="14"/>
      <path d="M8 21h8M12 17v4"/>
      <path d="M10 8l4 2.5-4 2.5V8Z" fill="currentColor"/>
    </svg>
  );
}

function AnimeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="10" r="7"/>
      <path d="M8 8.5a1 1 0 1 1 2 0 1 1 0 0 1-2 0M14 8.5a1 1 0 1 1 2 0 1 1 0 0 1-2 0" fill="currentColor" stroke="none"/>
      <path d="M9 12.5c1 1 4 1 5 0" strokeLinecap="round"/>
      <path d="M5 5L3 3M19 5l2-2" strokeLinecap="round"/>
      <path d="M12 17v4M8 21h8" strokeLinecap="round"/>
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="7"/>
      <path d="m20 20-4-4" strokeLinecap="round"/>
    </svg>
  );
}
