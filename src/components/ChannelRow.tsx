import { useRef, useMemo, useState, useContext, createContext } from 'react';
import { Channel, EpgProgram } from '../types/channel.types';
import { useTMDBEnrichment } from '../hooks/useTMDBEnrichment';
import { TMDBClient } from '../services/tmdb';
import { OMDBClient } from '../services/omdb';

// Context pour passer le client TMDB aux Posters
const TMDBContext = createContext<TMDBClient | null>(null);
// Context pour l'EPG
const EPGContext = createContext<Map<string, EpgProgram[]>>(new Map());

interface ChannelRowProps {
  title: string;
  channels: Channel[];
  onChannelSelect: (channel: Channel) => void;
  favorites: string[];
  onToggleFavorite: (channelId: string) => void;
  onViewAll?: (category: string) => void;
  tmdbClient?: TMDBClient | null;
  omdbClient?: OMDBClient | null;
  epgData?: Map<string, EpgProgram[]>;
  // TV Navigation
  isFocused?: boolean;
  focusedIndex?: number;
  onItemFocus?: (index: number) => void;
}

const MAX_VISIBLE_ROW = 20;

export default function ChannelRow({ 
  title, 
  channels, 
  onChannelSelect, 
  favorites, 
  onToggleFavorite, 
  onViewAll, 
  tmdbClient, 
  omdbClient, 
  epgData,
  isFocused = false,
  focusedIndex = -1,
  onItemFocus,
}: ChannelRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  if (channels.length === 0) return null;

  const hasMore = channels.length > MAX_VISIBLE_ROW;
  const rowChannels = channels.slice(0, MAX_VISIBLE_ROW);
  
  // Auto-scroll vers l'élément focusé
  if (isFocused && focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
    itemRefs.current[focusedIndex]?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'nearest',
      inline: 'center'
    });
  }

  return (
    <TMDBContext.Provider value={tmdbClient || null}>
    <EPGContext.Provider value={epgData || new Map()}>
      <section style={{ marginBottom: 48 }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: 20, 
          paddingRight: 8 
        }}>
          <h3 style={{ 
            fontSize: 13, 
            fontWeight: 600, 
            paddingLeft: 4, 
            color: 'rgba(255,255,255,0.9)',
            letterSpacing: '-0.01em'
          }}>
            {title}
          </h3>
          {hasMore && onViewAll && (
            <button
              onClick={() => onViewAll(title)}
              style={{
                background: 'none',
                border: 'none',
                color: '#f97316',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.03em'
              }}
            >
              Voir tout
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
        <div
          ref={scrollRef}
          className="hide-scrollbar"
          style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}
        >
          {rowChannels.map((channel, index) => (
            <div
              key={channel.id}
              ref={el => itemRefs.current[index] = el}
              onMouseEnter={() => onItemFocus?.(index)}
            >
              <Poster
                channel={channel}
                isFavorite={favorites.includes(channel.id)}
                onSelect={() => onChannelSelect(channel)}
                onFavorite={() => onToggleFavorite(channel.id)}
                omdbClient={omdbClient}
                isTVFocused={isFocused && focusedIndex === index}
              />
            </div>
          ))}
        </div>
      </section>
    </EPGContext.Provider>
    </TMDBContext.Provider>
  );
}

function Poster({ channel, isFavorite, onSelect, onFavorite, omdbClient, isTVFocused = false }: {
  channel: Channel;
  isFavorite: boolean;
  onSelect: () => void;
  onFavorite: () => void;
  omdbClient?: OMDBClient | null;
  isTVFocused?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [focused, setFocused] = useState(false);
  
  // Combinaison hover souris + focus TV (pour la navigation mais pas le style)
  const isSelected = hover || focused;
  
  // Récupérer le client TMDB du contexte
  const tmdbClient = useContext(TMDBContext);
  // Récupérer l'EPG du contexte
  const epgData = useContext(EPGContext);
  
  // Enrichissement TMDB pour les films et séries
  const { tmdbData } = useTMDBEnrichment(channel, tmdbClient, omdbClient || null);
  
  // Données à afficher (priorité: tmdbData hook > données pré-enrichies sur channel > fallback)
  const displayRating = tmdbData?.rating || channel.tmdbRating || channel.rating5;
  
  // Année : plusieurs sources possibles
  const yearFromTmdb = tmdbData?.year;
  const yearFromChannel = channel.tmdbYear || channel.releaseDate?.match(/\d{4}/)?.[0];
  const yearFromName = channel.name.match(/\((\d{4})\)/)?.[1];
  const displayYear = yearFromTmdb || yearFromChannel || yearFromName;
  
  // Durée : TMDB > channel enrichi > channel original
  const durationFromTmdb = tmdbData?.duration;
  const durationFromChannel = channel.duration 
    ? (typeof channel.duration === 'string' && channel.duration.includes('min') 
        ? channel.duration 
        : `${channel.duration}min`)
    : null;
  const displayDuration = durationFromTmdb || durationFromChannel;

  // EPG - Programme en cours pour les chaînes live
  const currentProgram = useMemo(() => {
    if (!channel.isLive) return null;
    const programs = epgData.get(channel.id);
    if (!programs || programs.length === 0) return null;
    const now = Date.now();
    const prog = programs.find(p => now >= p.startTimestamp && now <= p.endTimestamp);
    if (prog) {
      const progress = ((now - prog.startTimestamp) / (prog.endTimestamp - prog.startTimestamp)) * 100;
      return { ...prog, progress };
    }
    return null;
  }, [channel.id, channel.isLive, epgData]);

  const gradient = useMemo(() => {
    const colors = [
      ['#1a1a2e', '#0f0f18'],
      ['#1a2332', '#0f1520'],
      ['#2a1a2e', '#18101c'],
      ['#1a2a28', '#101c1a'],
      ['#2a2a1a', '#1c1c10'],
    ];
    const i = channel.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
    const color = colors[i] ?? ['#1a1a2e', '#0f0f18'];
    return `linear-gradient(145deg, ${color[0]} 0%, ${color[1]} 100%)`;
  }, [channel.name]);

  const isVodOrSeries = channel.streamType === 'vod' || channel.streamType === 'series';
  const isLiveChannel = channel.isLive || channel.streamType === 'live';

  // Nettoyer le nom de la chaîne
  const cleanChannelName = useMemo(() => {
    let name = channel.name;
    name = name.replace(/^[A-Z]{2,3}\s*\|\s*/i, '');
    name = name.replace(/\s+(FHD|UHD|4K|HD|SD|HEVC|H265)$/i, '');
    return name.trim();
  }, [channel.name]);

  return (
    <div
      style={{
        flexShrink: 0,
        width: isLiveChannel ? 220 : 160,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Carte principale */}
      <div
        onClick={onSelect}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        tabIndex={0}
        data-tv-focusable="true"
        onKeyDown={(e) => e.key === 'Enter' && onSelect()}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: isLiveChannel ? '16/9' : '2/3',
          overflow: 'hidden',
          cursor: 'pointer',
          outline: focused ? '2px solid rgba(255,255,255,0.5)' : 'none',
          border: '1px solid rgba(255,255,255,0.06)',
          transform: isSelected ? 'translateY(-4px)' : 'translateY(0)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: gradient,
        }}
      >
        {/* Image ou Gradient */}
        {channel.logo && !imgError ? (
          <img
            src={channel.logo}
            alt=""
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              transition: 'transform 0.3s ease',
              transform: isSelected ? 'scale(1.05)' : 'scale(1)'
            }}
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
            <div style={{
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              {isLiveChannel ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5">
                  <rect x="2" y="4" width="20" height="14"/>
                  <path d="M8 21h8M12 18v3"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20"/>
                  <path d="M10 8l6 4-6 4V8Z" fill="rgba(255,255,255,0.4)"/>
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Rating badge (pour films/séries) */}
        {isVodOrSeries && displayRating && displayRating > 0 && (
          <div style={{
            position: 'absolute',
            top: 10,
            left: 10,
            padding: '4px 8px',
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#f97316">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>
              {displayRating.toFixed(1)}
            </span>
          </div>
        )}

        {/* Badge New pour les contenus des 2 derniers mois */}
        {isVodOrSeries && channel.releaseDate && (() => {
          const releaseDate = new Date(channel.releaseDate);
          const twoMonthsAgo = new Date();
          twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
          return releaseDate >= twoMonthsAgo;
        })() && (
          <div style={{
            position: 'absolute',
            top: 10,
            right: 10,
            padding: '3px 8px',
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            fontSize: 9,
            fontWeight: 700,
            color: '#000',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            New
          </div>
        )}

        {/* Bottom gradient */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
          pointerEvents: 'none'
        }} />

        {/* Title + Metadata */}
        <div style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          right: 12
        }}>
          {/* Année + Durée (pour films/séries) */}
          {isVodOrSeries && (displayYear || displayDuration) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
            }}>
              {displayYear && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.5)',
                }}>
                  {displayYear}
                </span>
              )}
              {displayYear && displayDuration && (
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
              )}
              {displayDuration && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.5)',
                }}>
                  {displayDuration}
                </span>
              )}
            </div>
          )}
          <p style={{
            fontSize: 11,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: '#fff'
          }}>
            {isLiveChannel ? cleanChannelName : channel.name.replace(/\s*\(\d{4}\)\s*$/, '').replace(/\s*\[.*?\]/g, '').trim()}
          </p>
        </div>

        {/* Hover overlay - contour premium blanc dégradé (sans fond noir) */}
        {isSelected && (
          <div style={{
            position: 'absolute',
            inset: 0,
            border: '2px solid rgba(255,255,255,0.4)',
            pointerEvents: 'none',
            zIndex: 10
          }} />
        )}

        {/* Favorite - toujours visible si favori */}
        {isFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onFavorite(); }}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 28,
              height: 28,
              border: 'none',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 15
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth="2">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </button>
        )}
      </div>

      {/* EPG - Programme en cours (affiché sous la carte) */}
      {isLiveChannel && (
        <div style={{
          marginTop: 10,
          padding: '0 2px',
        }}>
          {currentProgram ? (
            <>
              <p style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.7)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginBottom: 6,
              }}>
                {currentProgram.title}
              </p>
              {/* Barre de progression */}
              <div style={{
                height: 2,
                background: 'rgba(255,255,255,0.1)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${currentProgram.progress || 0}%`,
                  background: 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </>
          ) : (
            <p style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.3)',
            }}>
              Pas de programme
            </p>
          )}
        </div>
      )}
    </div>
  );
}
