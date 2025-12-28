import { useState, useEffect, useRef } from 'react';
import { Channel, SeriesDetails, VodDetails, Episode } from '../types/channel.types';
import type { TMDBRecommendation } from '../services/tmdb';

interface TMDBMovieDetails {
  overview?: string;
  cast?: string;
  director?: string;
  genres?: string;
  releaseDate?: string;
  runtime?: number;
  backdrop?: string;
  poster?: string;
  rating?: number;
  country?: string;
}

interface ContentDetailsProps {
  content: Channel;
  onPlay: (episode?: Episode) => void;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  seriesDetails?: SeriesDetails | null;
  vodDetails?: VodDetails | null;
  tmdbMovieDetails?: TMDBMovieDetails | null;
  loadingDetails?: boolean;
  tmdbRecommendations?: TMDBRecommendation[];
  tmdbRating?: number | null;
  loadingTmdbRating?: boolean;
  omdbAwards?: string;
}

export default function ContentDetails({
  content,
  onPlay,
  onClose,
  isFavorite,
  onToggleFavorite,
  seriesDetails,
  vodDetails,
  tmdbMovieDetails,
  loadingDetails,
  tmdbRecommendations = [],
  tmdbRating,
  loadingTmdbRating = false,
  omdbAwards,
}: ContentDetailsProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const episodesRef = useRef<HTMLDivElement>(null);

  const isMovie = content.streamType === 'vod';
  const isSeries = content.streamType === 'series';

  const seriesInfo = isSeries && seriesDetails ? seriesDetails : null;
  const movieInfo = isMovie && vodDetails ? vodDetails : null;
  const details = seriesInfo;
  
  const extractYear = () => {
    if (tmdbMovieDetails?.releaseDate) {
      const match = tmdbMovieDetails.releaseDate.match(/\d{4}/);
      return match ? match[0] : null;
    }
    if (movieInfo?.releaseDate) {
      const match = movieInfo.releaseDate.match(/\d{4}/);
      return match ? match[0] : null;
    }
    if (details?.releaseDate) {
      const match = details.releaseDate.match(/\d{4}/);
      return match ? match[0] : null;
    }
    if (content.releaseDate) {
      const match = content.releaseDate.match(/\d{4}/);
      return match ? match[0] : null;
    }
    const nameMatch = content.name.match(/\((\d{4})\)/);
    return nameMatch ? nameMatch[1] : null;
  };
  const year = extractYear();

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m} min`;
  };
  const duration = tmdbMovieDetails?.runtime 
    ? formatRuntime(tmdbMovieDetails.runtime) 
    : (movieInfo?.duration || details?.episodeRunTime || content.duration);

  const rawName = movieInfo?.name || (details?.name && details.name !== 'Série inconnue') ? (movieInfo?.name || details?.name || content.name) : content.name;
  const cleanName = rawName
    .replace(/\s*\(\d{4}\)\s*$/, '')
    .replace(/\s*\[MULTI[-\s]?(SUB|LANG|AUDIO|SUBS)?\]/gi, '')
    .replace(/\s*\[(FR|EN|ES|DE|IT|PT|VF|VOSTFR|VO)\]/gi, '')
    .replace(/\s*\[(4K|UHD|HD|FHD|SD|1080p|720p)\]/gi, '')
    .replace(/\s*\[.*?\]/g, '')
    .trim();

  const genres = (tmdbMovieDetails?.genres || movieInfo?.genre || details?.genre || content.genre || '')
    .split(/[,\/]/)
    .map(g => g.trim())
    .filter(g => g.length > 0)
    .slice(0, 5);

  const rating = loadingTmdbRating ? null : (tmdbRating || tmdbMovieDetails?.rating || movieInfo?.rating5 || details?.rating5 || content.rating5);
  const awards = omdbAwards;

  const plot = tmdbMovieDetails?.overview || movieInfo?.plot || details?.plot || content.plot;
  const cast = tmdbMovieDetails?.cast || movieInfo?.cast || details?.cast || content.cast;
  const director = tmdbMovieDetails?.director || movieInfo?.director || details?.director || content.director;
  const country = tmdbMovieDetails?.country || movieInfo?.country;

  const currentSeasonEpisodes = details?.seasons.find(s => s.seasonNumber === selectedSeason)?.episodes || [];

  const getValidUrl = (url: string | undefined | null): string | null => {
    if (!url || url.trim() === '' || url === 'null' || url === 'undefined') return null;
    return url;
  };
  
  const imageUrls = [
    getValidUrl(tmdbMovieDetails?.backdrop),
    getValidUrl(tmdbMovieDetails?.poster),
    getValidUrl(movieInfo?.backdrop),
    getValidUrl(movieInfo?.cover),
    getValidUrl(details?.backdrop),
    getValidUrl(details?.cover),
    getValidUrl(content.backdrop),
    getValidUrl(content.logo),
  ].filter((url): url is string => url !== null);
  
  const backdropUrl = imageUrls[currentImageIndex] || null;
  
  const handleImageError = () => {
    setImageLoaded(false);
    if (currentImageIndex < imageUrls.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    }
  };
  
  useEffect(() => {
    setCurrentImageIndex(0);
    setImageLoaded(false);
  }, [content.id]);

  useEffect(() => {
    if (episodesRef.current) {
      episodesRef.current.scrollLeft = 0;
    }
  }, [selectedSeason]);

  // Navigation TV - Escape pour fermer, Backspace pour retour
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        // Ne pas interférer avec les inputs
        if (document.activeElement?.tagName === 'INPUT') return;
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="hide-scrollbar"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        zIndex: 100,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {/* Backdrop Image or Premium Gradient */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
      }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(ellipse 150% 100% at 0% 0%, rgba(249, 115, 22, 0.2), transparent 50%),
              radial-gradient(ellipse 120% 100% at 100% 0%, rgba(234, 88, 12, 0.15), transparent 45%),
              radial-gradient(ellipse 100% 80% at 50% 100%, rgba(249, 115, 22, 0.1), transparent 50%),
              linear-gradient(180deg, #0a0a0c 0%, #0f0f14 30%, #0a0a0c 70%, #08080a 100%)
            `,
          }}
        />
        
        {backdropUrl && (
          <img
            key={backdropUrl}
            src={backdropUrl}
            alt=""
            onLoad={() => setImageLoaded(true)}
            onError={handleImageError}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center top',
              opacity: imageLoaded ? 1 : 0,
              transition: 'opacity 0.5s',
            }}
          />
        )}
        
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.3) 100%)',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 30%, transparent 60%)',
        }} />
      </div>

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header - Back button only */}
        <header style={{
          padding: '24px 48px',
        }}>
          <button
            onClick={onClose}
            tabIndex={0}
            data-tv-focusable="true"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none',
            }}
            onFocus={(e) => e.currentTarget.style.outline = '2px solid rgba(255,255,255,0.5)'}
            onBlur={(e) => e.currentTarget.style.outline = 'none'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Retour
          </button>
        </header>

        {/* Main Content */}
        <div style={{
          padding: '40px 48px 60px',
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 700,
          gap: 20,
        }}>
          {/* Genre Tags */}
          {genres.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {genres.map((genre, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '6px 14px',
                    background: 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(10px)',
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 style={{
            fontSize: 36,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            textShadow: '0 4px 30px rgba(0,0,0,0.5)',
          }}>
            {cleanName}
          </h1>

          {/* Metadata Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}>
            {year && (
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 500 }}>
                {year}
              </span>
            )}
            
            {isSeries && details && (
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                {details.seasons.length} Saison{details.seasons.length > 1 ? 's' : ''}
              </span>
            )}

            {rating && rating > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                background: 'rgba(249,115,22,0.15)',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#f97316">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span style={{ color: '#f97316', fontWeight: 600, fontSize: 13 }}>
                  {rating.toFixed(1)}
                </span>
              </div>
            )}

            {awards && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 12px',
                background: 'rgba(16,185,129,0.15)',
                color: '#34d399',
                fontSize: 12,
                maxWidth: 380,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 3h-2V2a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v1H7a1 1 0 0 0-1 1v3a5 5 0 0 0 4 4.9V15H8a1 1 0 1 0 0 2h3v2.126a2.001 2.001 0 1 0 2 0V17h3a1 1 0 1 0 0-2h-2V11.9a5 5 0 0 0 4-4.9V4a1 1 0 0 0-1-1Zm-1 4a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3V5h8Z"/>
                </svg>
                <span style={{ fontWeight: 600, lineHeight: 1.4 }}>
                  {awards}
                </span>
              </div>
            )}

            {duration && (
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                {duration} {!duration.includes('min') && 'min'}
              </span>
            )}

            {country && (
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                {country}
              </span>
            )}
          </div>

          {/* Synopsis */}
          {plot && (
            <p style={{
              fontSize: 12,
            lineHeight: 1.6,
              color: 'rgba(255,255,255,0.6)',
              maxWidth: 550,
            }}>
              {plot.length > 300 ? plot.slice(0, 300) + '...' : plot}
            </p>
          )}

          {/* Action Buttons - Play + Favorite only */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            {(isMovie || (isSeries && details && details.totalEpisodes > 0)) && (
              <button
                onClick={() => {
                  if (isSeries && details) {
                    const firstEpisode = details.seasons[0]?.episodes[0];
                    if (firstEpisode) onPlay(firstEpisode);
                  } else {
                    onPlay();
                  }
                }}
                autoFocus
                tabIndex={0}
                data-tv-focusable="true"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  color: '#000',
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 8px 30px rgba(249,115,22,0.3)',
                  outline: 'none',
                }}
                onFocus={(e) => e.currentTarget.style.outline = '3px solid rgba(255,255,255,0.8)'}
                onBlur={(e) => e.currentTarget.style.outline = 'none'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                {isSeries ? 'Lire S1 E1' : 'Lecture'}
              </button>
            )}

            <button
              onClick={onToggleFavorite}
              tabIndex={0}
              data-tv-focusable="true"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '16px 24px',
                background: isFavorite ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
                border: `1px solid ${isFavorite ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.1)'}`,
                color: isFavorite ? '#f97316' : '#fff',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none',
              }}
              onFocus={(e) => e.currentTarget.style.outline = '2px solid rgba(255,255,255,0.5)'}
              onBlur={(e) => e.currentTarget.style.outline = 'none'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            </button>
          </div>
        </div>

        {/* Bottom Section - Episodes or Recommendations */}
        <div style={{
          padding: '24px 48px 60px',
          marginTop: 40,
          background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.95) 20px, rgba(0,0,0,0.98) 100%)',
          position: 'relative',
        }}>
          {/* Gradient separator */}
          <div style={{
            position: 'absolute',
            top: -60,
            left: 0,
            right: 0,
            height: 80,
            background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.9) 100%)',
            pointerEvents: 'none'
          }} />
          {/* Series Episodes */}
          {isSeries && (
            <>
              {details && details.seasons.length > 0 ? (
                <>
                  <div 
                    className="hide-scrollbar"
                    style={{
                      display: 'flex',
                      gap: 4,
                      marginBottom: 20,
                      overflowX: 'auto',
                    }}
                  >
                    {details.seasons.map(season => (
                      <button
                        key={season.seasonNumber}
                        onClick={() => setSelectedSeason(season.seasonNumber)}
                        style={{
                          padding: '10px 20px',
                          background: selectedSeason === season.seasonNumber 
                            ? 'rgba(249,115,22,0.15)' 
                            : 'transparent',
                          border: 'none',
                          borderBottom: selectedSeason === season.seasonNumber 
                            ? '2px solid #f97316' 
                            : '2px solid transparent',
                          color: selectedSeason === season.seasonNumber 
                            ? '#f97316' 
                            : 'rgba(255,255,255,0.5)',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Saison {season.seasonNumber}
                      </button>
                    ))}
                  </div>

                  <div
                    ref={episodesRef}
                    className="hide-scrollbar"
                    style={{
                      display: 'flex',
                      gap: 16,
                      overflowX: 'auto',
                      paddingBottom: 8,
                    }}
                  >
                    {currentSeasonEpisodes.length > 0 ? (
                      currentSeasonEpisodes.map(episode => (
                        <EpisodeCard
                          key={episode.id}
                          episode={episode}
                          onPlay={() => onPlay(episode)}
                        />
                      ))
                    ) : (
                      <p style={{ color: 'rgba(255,255,255,0.5)', padding: '20px 0' }}>
                        Aucun épisode disponible pour cette saison
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  gap: 16, 
                  padding: '40px 20px',
                  color: 'rgba(255,255,255,0.6)',
                  textAlign: 'center',
                }}>
                  {loadingDetails ? (
                    <>
                      <div style={{
                        width: 32,
                        height: 32,
                        border: '3px solid rgba(249,115,22,0.2)',
                        borderTopColor: '#f97316',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      <span>Chargement des saisons et épisodes...</span>
                    </>
                  ) : (
                    <>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                        <path d="M8 21h8M12 17v4"/>
                      </svg>
                      <span style={{ maxWidth: 400 }}>
                        Cette série n'a pas d'épisodes disponibles sur ce serveur.<br/>
                        <span style={{ fontSize: 12, opacity: 0.7 }}>
                          Le fournisseur IPTV n'a pas configuré le contenu pour cette série.
                        </span>
                      </span>
                      <button
                        onClick={onClose}
                        style={{
                          marginTop: 8,
                          padding: '10px 24px',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff',
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                      >
                        Retour à la liste
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* TMDB Recommendations */}
          {tmdbRecommendations.length > 0 && (
            <>
              <h3 style={{
                fontSize: 15,
                fontWeight: 600,
                marginBottom: 16,
                color: 'rgba(255,255,255,0.8)',
              }}>
                Recommandations
              </h3>
              <div
                className="hide-scrollbar"
                style={{
                  display: 'flex',
                  gap: 12,
                  overflowX: 'auto',
                  paddingBottom: 8,
                }}
              >
                {tmdbRecommendations.map(item => (
                  <RecommendationCard key={item.id} recommendation={item} />
                ))}
              </div>
            </>
          )}

        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function EpisodeCard({ episode, onPlay }: { episode: Episode; onPlay: () => void }) {
  const [imageError, setImageError] = useState(false);

  return (
    <button
      onClick={onPlay}
      style={{
        flexShrink: 0,
        width: 280,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s',
      }}
    >
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16/9',
        background: '#0f0f14',
      }}>
        {episode.thumbnail && !imageError ? (
          <img
            src={episode.thumbnail}
            alt={episode.title}
            onError={() => setImageError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a24 0%, #0a0a0f 100%)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <path d="M8 21h8M12 17v4"/>
            </svg>
          </div>
        )}
        
        <div style={{
          position: 'absolute',
          top: 8,
          left: 8,
          padding: '4px 10px',
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(4px)',
          fontSize: 12,
          fontWeight: 600,
          color: '#fff',
        }}>
          E{episode.episodeNum}
        </div>

        {episode.duration && (
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: '4px 10px',
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
            fontSize: 11,
            color: 'rgba(255,255,255,0.8)',
          }}>
            {episode.duration}
          </div>
        )}

        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.3)',
          opacity: 0,
          transition: 'opacity 0.2s',
        }} className="play-overlay">
          <div style={{
            width: 48,
            height: 48,
            background: '#f97316',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#000">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      </div>

      <div style={{ padding: 12 }}>
        <p style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#fff',
          marginBottom: 4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {episode.title}
        </p>
        {episode.plot && (
          <p style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.4,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {episode.plot}
          </p>
        )}
      </div>
    </button>
  );
}

function RecommendationCard({ recommendation }: { recommendation: TMDBRecommendation }) {
  const [imageError, setImageError] = useState(false);

  const year = recommendation.releaseDate?.substring(0, 4);
  const rating = recommendation.voteAverage 
    ? (recommendation.voteAverage / 2).toFixed(1) 
    : null;

  return (
    <div style={{
      flexShrink: 0,
      width: 140,
    }}>
      <div style={{
        position: 'relative',
        aspectRatio: '2/3',
        overflow: 'hidden',
        background: '#0f0f14',
        marginBottom: 8,
      }}>
        {recommendation.posterPath && !imageError ? (
          <img
            src={recommendation.posterPath}
            alt={recommendation.title}
            onError={() => setImageError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a24 0%, #0a0a0f 100%)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
              <path d="M7 2v20M17 2v20M2 12h20"/>
            </svg>
          </div>
        )}
        
        {rating && (
          <div style={{
            position: 'absolute',
            top: 6,
            left: 6,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
            padding: '2px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#f97316">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#fff',
            }}>
              {rating}
            </span>
          </div>
        )}
        
        {year && (
          <div style={{
            position: 'absolute',
            bottom: 6,
            right: 6,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
            padding: '2px 6px',
          }}>
            <span style={{
              fontSize: 10,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.8)',
            }}>
              {year}
            </span>
          </div>
        )}
      </div>
      <p style={{
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {recommendation.title}
      </p>
    </div>
  );
}
