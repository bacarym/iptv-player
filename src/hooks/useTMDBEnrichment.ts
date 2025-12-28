import { useState, useEffect, useMemo } from 'react';
import { Channel } from '../types/channel.types';
import { TMDBClient } from '../services/tmdb';
import { OMDBClient } from '../services/omdb';

export interface TMDBEnrichedData {
  rating?: number;
  year?: string;
  duration?: string;
  genres?: string[];
  popularity?: number;
  originalLanguage?: string;
  awards?: string | null;
  tmdbId?: number;
}

// Cache pour stocker les résultats TMDB enrichis
const tmdbCache = new Map<string, TMDBEnrichedData | null>();

// Export du cache pour utilisation externe
export const getTMDBCache = () => tmdbCache;

export function useTMDBEnrichment(
  channel: Channel,
  tmdbClient: TMDBClient | null,
  omdbClient?: OMDBClient | null
): { tmdbData: TMDBEnrichedData | null; isLoading: boolean } {
  const [tmdbData, setTmdbData] = useState<TMDBEnrichedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const cacheKey = useMemo(
    () => `${channel.streamType}-${channel.id}`,
    [channel.streamType, channel.id]
  );

  useEffect(() => {
    if (!tmdbClient || channel.isLive) {
      setTmdbData(null);
      return;
    }

    // Vérifier le cache
    if (tmdbCache.has(cacheKey)) {
      setTmdbData(tmdbCache.get(cacheKey) || null);
      return;
    }

    const fetchTmdbData = async () => {
      setIsLoading(true);
      try {
        const extractYear = () => {
          if (channel.releaseDate) {
            const match = channel.releaseDate.match(/\d{4}/);
            if (match) return parseInt(match[0]);
          }
          const nameMatch = channel.name.match(/\((\d{4})\)/);
          if (nameMatch && nameMatch[1]) return parseInt(nameMatch[1]);
          return undefined;
        };
        const year = extractYear();

        const cleanNameForSearch = channel.name
          .replace(/\s*\(\d{4}\)\s*$/, '')
          .replace(/\s*\[.*?\]/g, '')
          .trim();

        let tmdbId: number | null = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let details: any = null;

        if (channel.streamType === 'series') {
          tmdbId = await tmdbClient.searchSeries(cleanNameForSearch, year);
          if (tmdbId) {
            details = await tmdbClient.getSeriesDetails(tmdbId);
          }
        } else if (channel.streamType === 'vod') {
          tmdbId = await tmdbClient.searchMovie(cleanNameForSearch, year);
          if (tmdbId) {
            details = await tmdbClient.getMovieDetails(tmdbId);
          }
        }

        if (details) {
          const newTmdbData: TMDBEnrichedData = {};
          if (details.vote_average) {
            newTmdbData.rating = TMDBClient.convertRating(details.vote_average);
          }
          if (details.release_date || details.first_air_date) {
            newTmdbData.year = (details.release_date || details.first_air_date).substring(0, 4);
          }
          if (details.runtime) {
            const hours = Math.floor(details.runtime / 60);
            const minutes = details.runtime % 60;
            newTmdbData.duration = `${hours > 0 ? `${hours}h` : ''}${minutes > 0 ? `${minutes}min` : ''}`;
          } else if (details.episode_run_time && details.episode_run_time.length > 0) {
            const avgRuntime = details.episode_run_time[0];
            const hours = Math.floor(avgRuntime / 60);
            const minutes = avgRuntime % 60;
            newTmdbData.duration = `${hours > 0 ? `${hours}h` : ''}${minutes > 0 ? `${minutes}min` : ''}`;
          }
          // Nouvelles données pour catégorisation
          if (details.genres && Array.isArray(details.genres)) {
            newTmdbData.genres = details.genres.map((g: { name: string }) => g.name);
          }
          if (details.popularity) {
            newTmdbData.popularity = details.popularity;
          }
          if (details.original_language) {
            newTmdbData.originalLanguage = details.original_language;
          }
          if (details.id) {
            newTmdbData.tmdbId = details.id;
          }

          // Récompenses via OMDb (facultatif)
          if (omdbClient) {
            try {
              const awards = await omdbClient.getAwards(cleanNameForSearch, year, channel.streamType === 'series' ? 'series' : 'movie');
              if (awards) {
                newTmdbData.awards = awards;
              }
            } catch {
              // Ignorer silencieusement pour éviter de bloquer l'enrichissement
            }
          }
          setTmdbData(newTmdbData);
          tmdbCache.set(cacheKey, newTmdbData);
        } else {
          setTmdbData(null);
          tmdbCache.set(cacheKey, null);
        }
      } catch (error) {
        console.error(`Erreur lors de l'enrichissement TMDB pour ${channel.name}:`, error);
        setTmdbData(null);
        tmdbCache.set(cacheKey, null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTmdbData();
  }, [channel, tmdbClient, cacheKey]);

  return { tmdbData, isLoading };
}

