import { useState, useMemo, useCallback, useEffect } from 'react';
import { Channel, Playlist, XtreamCredentials } from './types/channel.types';
import { UserPreferences } from './types/preferences.types';
import { useStorage } from './hooks/useStorage';
import { usePreferences } from './hooks/usePreferences';
import { parseM3UFromFile, parseM3UFromUrl } from './parsers/m3uParser';
import { XtreamAPI, testXtreamConnection } from './parsers/xtreamApi';

import Sidebar, { SIDEBAR_ITEM_COUNT } from './components/Sidebar';
import HeroSection from './components/HeroSection';
import ChannelRow from './components/ChannelRow';
import VideoPlayer from './components/VideoPlayer';
import ContentDetails from './components/ContentDetails';
import Settings from './components/Settings';
import SearchOverlay from './components/SearchOverlay';
import Onboarding from './components/Onboarding';

const MAX_GROUPS = 10;

export default function App() {
  const [playlists, setPlaylists] = useStorage<Playlist[]>('iptv_playlists', []);
  const [favorites, setFavorites] = useStorage<string[]>('iptv_favorites', []);
  const [savedCredentials, setSavedCredentials] = useStorage<XtreamCredentials | null>('iptv_xtream_credentials', null);
  
  const { preferences, updatePreferences, completeOnboarding, resetPreferences } = usePreferences();

  const [activeSection, setActiveSection] = useState('tv');
  const [showSearch, setShowSearch] = useState(false);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [selectedContent, setSelectedContent] = useState<Channel | null>(null); // Pour la page de détails
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [pendingPlaylist, setPendingPlaylist] = useState<Playlist | null>(null);
  const [movieLangFilter, setMovieLangFilter] = useState<string>('MULTI');
  const [seriesLangFilter, setSeriesLangFilter] = useState<string>('MULTI');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Navigation TV
  const [focusZone, setFocusZone] = useState<'sidebar' | 'content'>('sidebar');
  const [sidebarFocusIndex, setSidebarFocusIndex] = useState(0);
  const allChannels = useMemo(() => playlists.flatMap(p => p.channels), [playlists]);

  // Séparer les contenus par type
  const tvChannels = useMemo(() => allChannels.filter(ch => ch.isLive), [allChannels]);
  const movieChannels = useMemo(() => allChannels.filter(ch => !ch.isLive && ch.streamType === 'vod'), [allChannels]);
  const seriesChannels = useMemo(() => allChannels.filter(ch => !ch.isLive && ch.streamType === 'series'), [allChannels]);

  // Filtrer selon la section active et la langue
  const filteredChannels = useMemo(() => {
    let channels: Channel[] = [];
    
    switch (activeSection) {
      case 'favorites':
        channels = allChannels.filter(ch => favorites.includes(ch.id));
        break;
      case 'tv':
        channels = tvChannels;
        break;
      case 'movies':
        channels = movieChannels;
        // Filtrer par langue sur le nom de la catégorie
        if (movieLangFilter) {
          channels = channels.filter(ch => {
            const group = (ch.group || '').toUpperCase();
            if (movieLangFilter === 'MULTI') return group.includes('MULTI');
            if (movieLangFilter === 'VF') return /\bFR\b|\bVF\b|FRENCH|FRANÇAIS|FRANCAIS/.test(group);
            if (movieLangFilter === 'VOSTFR') return group.includes('VOSTFR');
            if (movieLangFilter === 'VO') return /\bEN\b|\bVO\b|ENGLISH|ANGLAIS/.test(group) && !group.includes('VOSTFR');
            return true;
          });
        }
        break;
      case 'series':
        channels = seriesChannels;
        // Filtrer par langue sur le nom de la catégorie
        if (seriesLangFilter) {
          channels = channels.filter(ch => {
            const group = (ch.group || '').toUpperCase();
            if (seriesLangFilter === 'MULTI') return group.includes('MULTI');
            if (seriesLangFilter === 'VF') return /\bFR\b|\bVF\b|FRENCH|FRANÇAIS|FRANCAIS/.test(group);
            if (seriesLangFilter === 'VOSTFR') return group.includes('VOSTFR');
            if (seriesLangFilter === 'VO') return /\bEN\b|\bVO\b|ENGLISH|ANGLAIS/.test(group) && !group.includes('VOSTFR');
            return true;
          });
        }
        break;
      default:
        channels = [];
    }
    
    return channels;
  }, [activeSection, allChannels, tvChannels, movieChannels, seriesChannels, favorites, movieLangFilter, seriesLangFilter]);

  // Fonction pour nettoyer les noms de groupe (supprimer emojis, "Multi-lang" et préfixes de langue)
  const cleanGroupName = (name: string): string => {
    // Trim d'abord pour éviter les problèmes d'espaces en début
    let cleaned = name.trim();
    // Supprimer les emojis
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '').trim();
    // Supprimer "Multi-lang", "MULTI-LANG", etc.
    cleaned = cleaned.replace(/multi[-\s]?lang(ue)?s?/gi, '').trim();
    // Supprimer les préfixes de langue (2-3 lettres) suivis d'un séparateur non-alphanumérique
    // Applique plusieurs fois pour gérer les cas comme "FR| NETFLIX" -> "|NETFLIX" -> "NETFLIX"
    cleaned = cleaned.replace(/^(FR|EN|ES|DE|IT|PT|AR|RU|TR|NL|PL|JP|KR|CN|VOSTFR|VF|VO)\b[^A-Za-z0-9]*/gi, '').trim();
    // Supprimer les pipes et séparateurs au début après le premier nettoyage
    cleaned = cleaned.replace(/^[\|\-:\/\s]+/, '').trim();
    // Supprimer les pipes et barres verticales isolées dans le texte
    cleaned = cleaned.replace(/\s*\|\s*/g, ' ');
    // Nettoyer les espaces multiples
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned || 'Autres';
  };

  const channelsByGroup = useMemo(() => {
    const groups: Record<string, Channel[]> = {};
    filteredChannels.forEach(ch => {
      const rawGroup = ch.group || 'Autres';
      const g = cleanGroupName(rawGroup);
      if (!groups[g]) groups[g] = [];
      groups[g].push(ch);
    });
    return groups;
  }, [filteredChannels]);

  const groupEntries = useMemo(() => {
    const entries = Object.entries(channelsByGroup);
    return showAllGroups ? entries : entries.slice(0, MAX_GROUPS);
  }, [channelsByGroup, showAllGroups]);

  const hasMoreGroups = Object.keys(channelsByGroup).length > MAX_GROUPS;

  // Channels de la catégorie sélectionnée (doit être avant les returns conditionnels)
  const categoryChannels = useMemo(() => {
    if (!selectedCategory) return [];
    return channelsByGroup[selectedCategory] || [];
  }, [selectedCategory, channelsByGroup]);

  const handleToggleFavorite = useCallback((id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  }, [setFavorites]);

  // Gère la sélection d'un contenu : TV = lecture directe, Film/Série = page de détails
  const handleContentSelect = useCallback((channel: Channel) => {
    if (channel.isLive || channel.streamType === 'live') {
      // TV en direct : lecture directe
      setCurrentChannel(channel);
    } else {
      // Film ou Série : afficher la page de détails
      setSelectedContent(channel);
    }
  }, []);

  const handleChannelChange = useCallback((direction: 'prev' | 'next') => {
    if (!currentChannel) return;
    const idx = filteredChannels.findIndex(ch => ch.id === currentChannel.id);
    if (idx === -1) return;
    const next = direction === 'prev'
      ? (idx - 1 + filteredChannels.length) % filteredChannels.length
      : (idx + 1) % filteredChannels.length;
    const ch = filteredChannels[next];
    if (ch) setCurrentChannel(ch);
  }, [currentChannel, filteredChannels]);

  const handleAddPlaylist = useCallback((playlist: Playlist) => {
    if (playlists.length === 0 && !preferences.onboardingCompleted) {
      setPendingPlaylist(playlist);
      setShowOnboarding(true);
    } else {
      setIsLoading(true);
      setTimeout(() => {
        setPlaylists(prev => [...prev, playlist]);
        setIsLoading(false);
      }, 0);
    }
  }, [playlists.length, preferences.onboardingCompleted, setPlaylists]);

  const handleOnboardingComplete = useCallback((newPreferences: UserPreferences) => {
    updatePreferences(newPreferences);
    completeOnboarding();
    setShowOnboarding(false);
    
    if (pendingPlaylist) {
      setIsLoading(true);
      setTimeout(() => {
        setPlaylists(prev => [...prev, pendingPlaylist]);
        setPendingPlaylist(null);
        setIsLoading(false);
      }, 100);
    }
  }, [pendingPlaylist, updatePreferences, completeOnboarding, setPlaylists]);

  const handleOnboardingSkip = useCallback(() => {
    completeOnboarding();
    setShowOnboarding(false);
    
    if (pendingPlaylist) {
      setIsLoading(true);
      setTimeout(() => {
        setPlaylists(prev => [...prev, pendingPlaylist]);
        setPendingPlaylist(null);
        setIsLoading(false);
      }, 100);
    }
  }, [pendingPlaylist, completeOnboarding, setPlaylists]);

  const handleResetOnboarding = useCallback(() => {
    resetPreferences();
    if (allChannels.length > 0) {
      setPendingPlaylist({ id: 'temp', name: 'temp', source: 'file', channels: allChannels, categories: [], addedAt: Date.now() });
      setShowOnboarding(true);
    }
  }, [resetPreferences, allChannels]);

  const handleSectionChange = useCallback((section: string) => {
    if (section === 'settings') {
      // Settings est géré séparément, pas besoin de changer activeSection
      return;
    }
    setActiveSection(section);
    setShowAllGroups(false);
  }, []);

  // ===== NAVIGATION TV PRINCIPALE =====
  // Gère la navigation entre le menu sidebar et le contenu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer si un input/textarea est focusé
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA' ||
          document.activeElement?.tagName === 'SELECT') {
        return;
      }

      // Ignorer si on est dans un overlay (search, details, player) - mais pas settings
      if (currentChannel || selectedContent || showSearch) {
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          if (focusZone === 'sidebar') {
            e.preventDefault();
            setSidebarFocusIndex(prev => Math.max(0, prev - 1));
          }
          break;

        case 'ArrowDown':
          if (focusZone === 'sidebar') {
            e.preventDefault();
            setSidebarFocusIndex(prev => Math.min(SIDEBAR_ITEM_COUNT - 1, prev + 1));
          }
          break;

        case 'ArrowRight':
          if (focusZone === 'sidebar') {
            e.preventDefault();
            setFocusZone('content');
            // Focus le premier élément focusable dans le contenu (pas dans le sidebar)
            setTimeout(() => {
              const mainContent = document.querySelector('main');
              const firstFocusable = mainContent?.querySelector('[data-tv-focusable="true"]') as HTMLElement;
              if (firstFocusable) {
                firstFocusable.focus();
              }
            }, 50);
          }
          break;

        case 'ArrowLeft':
          if (focusZone === 'content') {
            e.preventDefault();
            setFocusZone('sidebar');
            // Retour au sidebar : focus l'élément actif du menu
            setTimeout(() => {
              const sidebarButtons = document.querySelectorAll('aside button[tabindex="0"]');
              const btn = sidebarButtons[sidebarFocusIndex] as HTMLElement;
              btn?.focus();
            }, 50);
          }
          break;

        case 'Enter':
        case ' ':
          if (focusZone === 'sidebar') {
            e.preventDefault();
            // Simuler le click sur l'élément du menu
            const sidebarButtons = document.querySelectorAll('aside nav button');
            const btn = sidebarButtons[sidebarFocusIndex] as HTMLElement;
            btn?.click();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusZone, sidebarFocusIndex, currentChannel, selectedContent, showSearch, activeSection]);

  // Onboarding
  if (showOnboarding && pendingPlaylist) {
    return (
      <Onboarding
        channels={pendingPlaylist.channels}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  // Player vidéo
  if (currentChannel) {
    return (
      <VideoPlayer
        channel={currentChannel}
        onClose={() => setCurrentChannel(null)}
        onChannelChange={handleChannelChange}
        autoplay
      />
    );
  }

  // Page de détails (Films/Séries)
  if (selectedContent) {
    return (
      <ContentDetails
        content={selectedContent}
        onPlay={() => {
          setCurrentChannel(selectedContent);
          setSelectedContent(null);

        }}
        onClose={() => setSelectedContent(null)}
        isFavorite={favorites.includes(selectedContent.id)}
        onToggleFavorite={() => handleToggleFavorite(selectedContent.id)}
      />
    );
  }

  const titles: Record<string, string> = {
    favorites: 'Favoris',
    tv: 'TV en direct',
    movies: 'Films',
    series: 'Séries',
  };

  const isSettingsOpen = activeSection === 'settings';

  // Vue de catégorie dédiée
  if (selectedCategory && categoryChannels.length > 0) {
    return (
      <div style={{ height: '100vh', display: 'flex', background: '#000' }}>
        <Sidebar
          activeSection={activeSection}
          onSectionChange={(section) => {
            setSelectedCategory(null);
            if (section === 'settings') {
              setActiveSection('settings');
            } else {
              handleSectionChange(section);
            }
          }}
        />
        <main className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 48 }}>
          {/* Header avec bouton retour */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <h2 style={{ fontSize: 28, fontWeight: 600 }}>{selectedCategory}</h2>
              <span style={{ color: '#555', fontSize: 14 }}>{categoryChannels.length} éléments</span>
            </div>
            <button
              onClick={() => setSelectedCategory(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                background: '#1a1a1a',
                border: 'none',
                color: '#fff',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#222'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#1a1a1a'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Retour
            </button>
          </div>

          {/* Grille de contenu */}
          <CategoryGridView
            channels={categoryChannels}
            onChannelSelect={handleContentSelect}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        </main>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#000' }}>
      <Sidebar
        activeSection={activeSection}
        onSectionChange={(section) => {
          if (section === 'settings') {
            setActiveSection('settings');
          } else {
            handleSectionChange(section);
          }
        }}
      />

      <main className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
        {allChannels.length > 0 && activeSection !== 'settings' ? (
          <>
            {/* Hero uniquement pour TV et Favoris */}
            {(activeSection === 'tv' || activeSection === 'favorites') && filteredChannels.length > 0 && (
              <HeroSection channels={filteredChannels} onPlay={setCurrentChannel} />
            )}

            <div style={{ padding: (activeSection === 'movies' || activeSection === 'series') ? '48px 48px 64px' : '0 48px 64px' }}>
              {/* Header avec titre et compteur */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 28, fontWeight: 600 }}>{titles[activeSection]}</h2>
                  <span style={{ color: '#444', fontSize: 12 }}>{filteredChannels.length} éléments</span>
                </div>
                
                {/* Filtres de langue pour Films et Séries */}
                {(activeSection === 'movies' || activeSection === 'series') && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['MULTI', 'VF', 'VOSTFR', 'VO'].map(lang => {
                      const isActive = activeSection === 'movies' 
                        ? movieLangFilter === lang 
                        : seriesLangFilter === lang;
                      return (
                        <button
                          key={lang}
                          onClick={() => {
                            // Change la langue, ne désactive pas
                            if (activeSection === 'movies') {
                              setMovieLangFilter(lang);
                            } else {
                              setSeriesLangFilter(lang);
                            }
                          }}
                          style={{
                            padding: '10px 20px',
                            background: isActive ? '#fff' : '#1a1a1a',
                            color: isActive ? '#000' : '#666',
                            border: 'none',
                            fontSize: 13,
                            fontWeight: isActive ? 600 : 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          {lang}
                          {isActive && (
                            <span style={{
                              position: 'absolute',
                              bottom: 0,
                              left: '50%',
                              transform: 'translateX(-50%)',
                              width: '60%',
                              height: 2,
                              background: '#000',
                            }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Carrousel de catégories pour Films et Séries */}
              {(activeSection === 'movies' || activeSection === 'series') && Object.keys(channelsByGroup).length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Catégories
                  </h3>
                  <div 
                    className="hide-scrollbar"
                    style={{
                      display: 'flex',
                      gap: 10,
                      overflowX: 'auto',
                      paddingBottom: 8,
                    }}
                  >
                    {Object.entries(channelsByGroup).map(([group, channels]) => (
                      <button
                        key={group}
                        onClick={() => setSelectedCategory(group)}
                        style={{
                          flexShrink: 0,
                          padding: '12px 16px',
                          background: '#111',
                          border: '1px solid #1a1a1a',
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#1a1a1a';
                          e.currentTarget.style.borderColor = '#333';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#111';
                          e.currentTarget.style.borderColor = '#1a1a1a';
                        }}
                      >
                        {group}
                        <span style={{ color: '#555', marginLeft: 8 }}>
                          {channels.length}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredChannels.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: '#444' }}>
                  <p style={{ fontSize: 14 }}>
                    {activeSection === 'favorites' ? 'Aucun favori' : 'Aucun contenu disponible'}
                  </p>
                </div>
              ) : (
                <>
                  {groupEntries.map(([group, channels]) => (
                    <div key={group} id={`section-${group}`}>
                      <ChannelRow
                        title={group}
                        channels={channels}
                        onChannelSelect={handleContentSelect}
                        favorites={favorites}
                        onToggleFavorite={handleToggleFavorite}
                        onViewAll={(category) => setSelectedCategory(category)}
                      />
                    </div>
                  ))}

                  {hasMoreGroups && !showAllGroups && (
                    <button
                      onClick={() => setShowAllGroups(true)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '12px',
                        background: '#111',
                        border: '1px solid #1a1a1a',
                        color: '#888',
                        fontSize: 12,
                        cursor: 'pointer',
                        marginTop: 16
                      }}
                    >
                      Voir toutes les catégories ({Object.keys(channelsByGroup).length})
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        ) : activeSection === 'settings' ? (
          <div style={{ padding: 48 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 32 }}>Paramètres</h2>
            <SettingsContent
              playlists={playlists}
              onAddPlaylist={handleAddPlaylist}
              onRemovePlaylist={(id) => setPlaylists(prev => prev.filter(p => p.id !== id))}
              savedCredentials={savedCredentials}
              onSaveCredentials={setSavedCredentials}
              preferences={preferences}
              onResetOnboarding={handleResetOnboarding}
            />
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', maxWidth: 320 }}>
              <div style={{
                width: 64,
                height: 64,
                margin: '0 auto 20px',
                background: '#111',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5">
                  <rect x="2" y="4" width="20" height="14" rx="1"/>
                  <path d="M8 21h8M12 18v3" strokeLinecap="round"/>
                </svg>
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Bienvenue</h2>
              <p style={{ color: '#555', fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
                Ajoutez une playlist pour commencer
              </p>
              <button
                onClick={() => setActiveSection('settings')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveSection('settings');
                  }
                }}
                tabIndex={0}
                data-tv-focusable="true"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 20px',
                  background: '#fff',
                  color: '#000',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  outline: 'none'
                }}
                onFocus={(e) => e.currentTarget.style.outline = '3px solid rgba(255,255,255,0.8)'}
                onBlur={(e) => e.currentTarget.style.outline = 'none'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5v14"/>
                </svg>
                Ajouter
              </button>
            </div>
          </div>
        )}
      </main>

      {isLoading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 32,
              height: 32,
              border: '2px solid #222',
              borderTopColor: '#fff',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px'
            }} />
            <p style={{ color: '#666', fontSize: 12 }}>Chargement...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      )}

      {/* SearchOverlay n'est plus utilisé - la recherche est dans la section search */}
    </div>
  );
}

// Category Grid View component
function CategoryGridView({ 
  channels, 
  onChannelSelect, 
  favorites, 
  onToggleFavorite 
}: {
  channels: Channel[];
  onChannelSelect: (channel: Channel) => void;
  favorites: string[];
  onToggleFavorite: (channelId: string) => void;
}) {
  const [page, setPage] = useState(1);
  const itemsPerPage = 50;
  
  const displayedChannels = channels.slice(0, page * itemsPerPage);
  const hasMore = channels.length > page * itemsPerPage;

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 12,
      }}>
        {displayedChannels.map(channel => (
          <CategoryPoster
            key={channel.id}
            channel={channel}
            isFavorite={favorites.includes(channel.id)}
            onSelect={() => onChannelSelect(channel)}
            onFavorite={() => onToggleFavorite(channel.id)}
          />
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setPage(p => p + 1)}
          style={{
            display: 'block',
            width: '100%',
            padding: '14px',
            marginTop: 24,
            background: '#111',
            border: '1px solid #1a1a1a',
            color: '#888',
            fontSize: 13,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#1a1a1a'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#111'}
        >
          Charger plus ({channels.length - displayedChannels.length} restants)
        </button>
      )}
    </>
  );
}

// Poster for category grid
function CategoryPoster({ channel, isFavorite, onSelect, onFavorite }: {
  channel: Channel;
  isFavorite: boolean;
  onSelect: () => void;
  onFavorite: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [focused, setFocused] = useState(false);

  const gradient = useMemo(() => {
    const colors = [
      ['#1a1a2e', '#16213e'],
      ['#0f3460', '#1a1a2e'],
      ['#1b262c', '#0f4c75'],
      ['#2d132c', '#801336'],
      ['#190019', '#2b124c'],
    ];
    const i = channel.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
    const color = colors[i] ?? ['#1a1a2e', '#16213e'];
    return `linear-gradient(145deg, ${color[0]} 0%, ${color[1]} 100%)`;
  }, [channel.name]);

  const isSelected = hover || focused;

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      style={{
        position: 'relative',
        aspectRatio: '2/3',
        overflow: 'hidden',
        cursor: 'pointer',
        outline: 'none',
        boxShadow: isSelected ? '0 0 0 2px #fff' : 'none',
        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
        transition: 'transform 0.15s, box-shadow 0.15s'
      }}
    >
      {channel.logo && !imgError ? (
        <img
          src={channel.logo}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: 28, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
            {channel.name.substring(0, 2).toUpperCase()}
          </span>
        </div>
      )}

      {channel.isLive && (
        <div style={{
          position: 'absolute',
          top: 8,
          left: 8,
          padding: '3px 6px',
          background: '#e50914',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.04em'
        }}>
          LIVE
        </div>
      )}

      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        right: 10
      }}>
        <p style={{
          fontSize: 12,
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {channel.name}
        </p>
      </div>

      {isSelected && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#000" style={{ marginLeft: 2 }}>
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onFavorite(); }}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 28,
          height: 28,
          border: 'none',
          background: isFavorite ? '#e50914' : 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          opacity: isSelected || isFavorite ? 1 : 0,
          transition: 'opacity 0.15s'
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill={isFavorite ? '#fff' : 'none'} stroke="#fff" strokeWidth="2">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
        </svg>
      </button>
    </div>
  );
}

// Settings inline component
function SettingsContent({
  playlists, onAddPlaylist, onRemovePlaylist, savedCredentials, onSaveCredentials, preferences, onResetOnboarding
}: {
  playlists: Playlist[];
  onAddPlaylist: (p: Playlist) => void;
  onRemovePlaylist: (id: string) => void;
  savedCredentials: XtreamCredentials | null;
  onSaveCredentials: (c: XtreamCredentials) => void;
  preferences: UserPreferences;
  onResetOnboarding: () => void;
}) {
  const [playlistTab, setPlaylistTab] = useState<'m3u' | 'xtream'>('m3u');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [url, setUrl] = useState('');
  const [xUrl, setXUrl] = useState(savedCredentials?.serverUrl || '');
  const [xUser, setXUser] = useState(savedCredentials?.username || '');
  const [xPass, setXPass] = useState(savedCredentials?.password || '');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    setLoading(true);
    try {
      const p = await parseM3UFromFile(file);
      onAddPlaylist(p);
      setMsg({ ok: true, text: `${p.channels.length} chaînes` });
    } catch (err) {
      setMsg({ ok: false, text: String(err) });
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setMsg(null);
    setLoading(true);
    try {
      const p = await parseM3UFromUrl(url);
      onAddPlaylist(p);
      setMsg({ ok: true, text: `${p.channels.length} chaînes` });
      setUrl('');
    } catch (err) {
      setMsg({ ok: false, text: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleXtream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!xUrl || !xUser || !xPass) return;
    setMsg(null);
    setLoading(true);
    const creds = { serverUrl: xUrl, username: xUser, password: xPass };
    try {
      const test = await testXtreamConnection(creds);
      if (!test.success) { setMsg({ ok: false, text: test.message }); setLoading(false); return; }
      const api = new XtreamAPI(creds);
      const p = await api.loadFullPlaylist({ includeLive: true, includeVod: true, includeSeries: true });
      onAddPlaylist(p);
      onSaveCredentials(creds);
      setMsg({ ok: true, text: `${p.channels.length} chaînes` });
    } catch (err) {
      setMsg({ ok: false, text: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: '#0a0a0a',
    border: '1px solid #1a1a1a',
    color: '#fff',
    fontSize: 12,
    outline: 'none',
    borderRadius: 0
  };

  return (
    <div className="settings-section" style={{ maxWidth: 480 }}>
      <style>{`
        .settings-section *,
        .settings-section *::before,
        .settings-section *::after {
          border-radius: 0 !important;
        }
      `}</style>
      {loading && (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ width: 24, height: 24, border: '2px solid #222', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {msg && (
        <div style={{
          marginBottom: 16,
          padding: 10,
          background: msg.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          color: msg.ok ? '#22c55e' : '#ef4444',
          fontSize: 12
        }}>
          {msg.text}
        </div>
      )}

      {/* Playlists */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 10, color: '#555', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ajouter une playlist</p>
        
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['m3u', 'xtream'].map(t => (
            <button
              key={t}
              onClick={() => setPlaylistTab(t as 'm3u' | 'xtream')}
              style={{
                padding: '8px 16px',
                background: playlistTab === t ? '#1a1a1a' : 'transparent',
                border: '1px solid',
                borderColor: playlistTab === t ? '#1a1a1a' : '#222',
                color: playlistTab === t ? '#fff' : '#555',
                fontSize: 11,
                cursor: 'pointer',
                borderRadius: 0
              }}
            >
              {t === 'm3u' ? 'M3U' : 'Xtream'}
            </button>
          ))}
        </div>

        {playlistTab === 'm3u' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 16,
              border: '1px dashed #222',
              cursor: 'pointer',
              color: '#555',
              fontSize: 12,
              borderRadius: 0
            }}>
              Importer fichier
              <input type="file" accept=".m3u,.m3u8,.txt" onChange={handleFile} style={{ display: 'none' }} />
            </label>

            <form onSubmit={handleUrl} style={{ display: 'flex', gap: 8 }}>
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL playlist" style={{ ...inputStyle, flex: 1 }} />
              <button type="submit" disabled={!url} style={{
                padding: '10px 16px',
                background: url ? '#fff' : '#1a1a1a',
                color: url ? '#000' : '#444',
                border: 'none',
                fontSize: 11,
                fontWeight: 600,
                cursor: url ? 'pointer' : 'default',
                borderRadius: 0
              }}>
                OK
              </button>
            </form>
          </div>
        )}

        {playlistTab === 'xtream' && (
          <form onSubmit={handleXtream} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="text" value={xUrl} onChange={(e) => setXUrl(e.target.value)} placeholder="http://server:port" style={inputStyle} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input type="text" value={xUser} onChange={(e) => setXUser(e.target.value)} placeholder="Username" style={inputStyle} />
              <input type="password" value={xPass} onChange={(e) => setXPass(e.target.value)} placeholder="Password" style={inputStyle} />
            </div>
            <button type="submit" disabled={!xUrl || !xUser || !xPass} style={{
              padding: '10px',
              background: xUrl && xUser && xPass ? '#fff' : '#1a1a1a',
              color: xUrl && xUser && xPass ? '#000' : '#444',
              border: 'none',
              fontSize: 11,
              borderRadius: 0,
              fontWeight: 600,
              cursor: xUrl && xUser && xPass ? 'pointer' : 'default'
            }}>
              Connexion
            </button>
          </form>
        )}
      </div>

      {/* Saved playlists */}
      {playlists.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 10, color: '#555', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Playlists enregistrées</p>
          {playlists.map(p => (
            <div key={p.id} style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 12px',
              background: '#111',
              marginBottom: 6
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 500 }}>{p.name}</p>
                <p style={{ fontSize: 10, color: '#555' }}>{p.channels.length} chaînes</p>
              </div>
              <button onClick={() => onRemovePlaylist(p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Preferences */}
      <div>
        <p style={{ fontSize: 10, color: '#555', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Préférences</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#111' }}>
            <span style={{ fontSize: 12 }}>Pays TV</span>
            <span style={{ fontSize: 12, color: '#666' }}>{preferences.channels.countries[0] || 'Tous'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#111' }}>
            <span style={{ fontSize: 12 }}>Qualité</span>
            <span style={{ fontSize: 12, color: '#666' }}>{preferences.channels.defaultQuality}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#111' }}>
            <span style={{ fontSize: 12 }}>Langue Films</span>
            <span style={{ fontSize: 12, color: '#666' }}>{preferences.movies.preferredLanguage}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#111' }}>
            <span style={{ fontSize: 12 }}>Langue Séries</span>
            <span style={{ fontSize: 12, color: '#666' }}>{preferences.series.preferredLanguage}</span>
          </div>
        </div>

        <button
          onClick={onResetOnboarding}
          style={{
            width: '100%',
            padding: '10px',
            background: 'transparent',
            border: '1px solid #222',
            color: '#888',
            fontSize: 11,
            cursor: 'pointer',
            borderRadius: 0
          }}
        >
          Reconfigurer
        </button>
      </div>
    </div>
  );
}

