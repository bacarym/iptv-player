import type { Season } from '../types/channel.types';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/';

type TMDBSearchResult = {
  id: number;
  name?: string;
  title?: string; // Pour les films
  first_air_date?: string;
  release_date?: string; // Pour les films
  vote_average?: number;
};

type TMDBDetails = {
  id: number;
  name?: string;
  title?: string;
  vote_average: number;
  vote_count: number;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  genres?: { id: number; name: string }[];
  first_air_date?: string;
  release_date?: string;
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
  // Enrichi avec credits
  cast?: string;
  director?: string;
  production_countries?: { iso_3166_1: string; name: string }[];
};

type TMDBCredits = {
  cast: { name: string; character: string; order: number }[];
  crew: { name: string; job: string; department: string }[];
};

type TMDBEpisode = {
  episode_number: number;
  still_path: string | null;
  overview?: string;
  vote_average?: number;
  runtime?: number;
};

// Types pour les recommandations
type TMDBRecommendationResult = {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  overview?: string;
};

export type TMDBRecommendation = {
  id: number;
  title: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: string;
  voteAverage?: number;
  overview?: string;
};

// Petites caches mémoire pour éviter de re-frapper l'API
const searchCache = new Map<string, number | null>();
const detailsCache = new Map<string, TMDBDetails | null>();

export class TMDBClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private buildUrl(path: string, params: Record<string, string> = {}): string {
    const url = new URL(`${TMDB_API_BASE}${path}`);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('language', 'fr-FR');
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return url.toString();
  }

  /**
   * Construit l'URL complète d'une image TMDB
   */
  getImageUrl(path: string | null, size: string = 'original'): string | undefined {
    if (!path) return undefined;
    return `${IMAGE_BASE}${size}${path}`;
  }

  /**
   * Convertit une note TMDB (sur 10) en note sur 5
   */
  static convertRating(tmdbRating: number): number {
    return tmdbRating / 2;
  }

  /**
   * Recherche une série TV par nom et année
   */
  async searchSeries(name: string, year?: number): Promise<number | null> {
    const key = `series-${name}-${year || ''}`;
    if (searchCache.has(key)) return searchCache.get(key) ?? null;

    const params: Record<string, string> = { query: name };
    if (year) params.first_air_date_year = String(year);

    const url = this.buildUrl('/search/tv', params);
    const res = await fetch(url);
    if (!res.ok) {
      searchCache.set(key, null);
      return null;
    }

    const data = await res.json();
    const results: TMDBSearchResult[] = data.results || [];
    const tmdbId = results.length > 0 ? results[0].id : null;
    searchCache.set(key, tmdbId);
    return tmdbId;
  }

  /**
   * Recherche un film par nom et année
   */
  async searchMovie(name: string, year?: number): Promise<number | null> {
    const key = `movie-${name}-${year || ''}`;
    if (searchCache.has(key)) return searchCache.get(key) ?? null;

    const params: Record<string, string> = { query: name };
    if (year) params.year = String(year);

    const url = this.buildUrl('/search/movie', params);
    const res = await fetch(url);
    if (!res.ok) {
      searchCache.set(key, null);
      return null;
    }

    const data = await res.json();
    const results: TMDBSearchResult[] = data.results || [];
    const tmdbId = results.length > 0 ? results[0].id : null;
    searchCache.set(key, tmdbId);
    return tmdbId;
  }

  /**
   * Récupère les détails d'une série TV (incluant vote_average pour la note)
   */
  async getSeriesDetails(tmdbId: number): Promise<TMDBDetails | null> {
    const key = `series-details-${tmdbId}`;
    if (detailsCache.has(key)) return detailsCache.get(key) ?? null;

    const url = this.buildUrl(`/tv/${tmdbId}`);
    const res = await fetch(url);
    if (!res.ok) {
      detailsCache.set(key, null);
      return null;
    }

    const data: TMDBDetails = await res.json();
    detailsCache.set(key, data);
    return data;
  }

  async getMovieDetails(tmdbId: number): Promise<TMDBDetails | null> {
    const key = `movie-${tmdbId}`;
    if (detailsCache.has(key)) return detailsCache.get(key) ?? null;

    const url = this.buildUrl(`/movie/${tmdbId}`);
    const res = await fetch(url);
    if (!res.ok) {
      detailsCache.set(key, null);
      return null;
    }

    const data: TMDBDetails = await res.json();
    detailsCache.set(key, data);
    return data;
  }

  /**
   * Récupère les recommandations TMDB pour un film
   */
  async getMovieRecommendations(tmdbId: number): Promise<TMDBRecommendation[]> {
    const url = this.buildUrl(`/movie/${tmdbId}/recommendations`);
    const res = await fetch(url);
    if (!res.ok) return [];
    
    const data = await res.json();
    const results = data.results || [];
    
    // Retourner les 10 premières recommandations avec les infos essentielles
    return results.slice(0, 10).map((movie: TMDBRecommendationResult) => ({
      id: movie.id,
      title: movie.title,
      posterPath: movie.poster_path ? this.getImageUrl(movie.poster_path, 'w342') : undefined,
      backdropPath: movie.backdrop_path ? this.getImageUrl(movie.backdrop_path, 'w780') : undefined,
      releaseDate: movie.release_date,
      voteAverage: movie.vote_average,
      overview: movie.overview,
    }));
  }

  /**
   * Récupère les recommandations TMDB pour une série
   */
  async getSeriesRecommendations(tmdbId: number): Promise<TMDBRecommendation[]> {
    const url = this.buildUrl(`/tv/${tmdbId}/recommendations`);
    const res = await fetch(url);
    if (!res.ok) return [];
    
    const data = await res.json();
    const results = data.results || [];
    
    return results.slice(0, 10).map((series: TMDBRecommendationResult) => ({
      id: series.id,
      title: series.name || series.title,
      posterPath: series.poster_path ? this.getImageUrl(series.poster_path, 'w342') : undefined,
      backdropPath: series.backdrop_path ? this.getImageUrl(series.backdrop_path, 'w780') : undefined,
      releaseDate: series.first_air_date || series.release_date,
      voteAverage: series.vote_average,
      overview: series.overview,
    }));
  }

  /**
   * Récupère les crédits d'un film (cast et crew)
   */
  async getMovieCredits(tmdbId: number): Promise<TMDBCredits | null> {
    const url = this.buildUrl(`/movie/${tmdbId}/credits`);
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  }

  /**
   * Récupère les détails complets d'un film (détails + crédits)
   */
  async getFullMovieDetails(tmdbId: number): Promise<TMDBDetails | null> {
    const [details, credits] = await Promise.all([
      this.getMovieDetails(tmdbId),
      this.getMovieCredits(tmdbId),
    ]);

    if (!details) return null;

    // Enrichir avec cast et director
    if (credits) {
      // Top 5 acteurs
      const topCast = credits.cast
        .sort((a, b) => a.order - b.order)
        .slice(0, 5)
        .map(c => c.name)
        .join(', ');
      
      // Réalisateur
      const director = credits.crew.find(c => c.job === 'Director')?.name;

      return {
        ...details,
        cast: topCast || undefined,
        director: director || undefined,
      };
    }

    return details;
  }

  /**
   * Récupère les détails d'un épisode
   */
  async getEpisodeDetails(tmdbId: number, seasonNumber: number, episodeNumber: number): Promise<TMDBEpisode | null> {
    const url = this.buildUrl(`/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}`);
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  }

  /**
   * Recherche et récupère les détails complets d'un contenu (film ou série)
   */
  async searchAndGetDetails(name: string, type: 'movie' | 'series'): Promise<{
    id: number;
    vote_average?: number;
    release_date?: string;
    first_air_date?: string;
    runtime?: number;
    episode_run_time?: number[];
    genres?: { id: number; name: string }[];
    overview?: string;
    poster_path?: string;
    backdrop_path?: string;
    production_countries?: { iso_3166_1: string; name: string }[];
    credits?: {
      cast: { name: string }[];
      crew: { name: string; job: string }[];
    };
  } | null> {
    // Nettoyer le nom
    const cleanedName = name
      .replace(/\s*\(\d{4}\)\s*/g, '')
      .replace(/\s*\[.*?\]\s*/g, '')
      .trim();
    
    // Extraire l'année si présente
    const yearMatch = name.match(/\((\d{4})\)/);
    const year = yearMatch ? parseInt(yearMatch[1]) : undefined;
    
    let tmdbId: number | null = null;
    
    if (type === 'movie') {
      tmdbId = await this.searchMovie(cleanedName, year);
    } else {
      tmdbId = await this.searchSeries(cleanedName, year);
    }
    
    if (!tmdbId) return null;
    
    // Récupérer les détails avec les crédits
    const endpoint = type === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
    const url = this.buildUrl(endpoint, { append_to_response: 'credits' });
    
    const res = await fetch(url);
    if (!res.ok) return null;
    
    const data = await res.json();
    return data;
  }

  /**
   * Enrichit les épisodes avec les images "still" de TMDB
   */
  async enrichEpisodesWithTMDBStills(
    tmdbId: number,
    seasons: Season[],
    fallbackImage?: string
  ): Promise<Season[]> {
    const enrichedSeasons: Season[] = [];

    for (const season of seasons) {
      const enrichedEpisodes = await Promise.all(
        season.episodes.map(async (episode) => {
          try {
            const tmdbEpisode = await this.getEpisodeDetails(
              tmdbId,
              season.seasonNumber,
              episode.episodeNum
            );
            
            if (tmdbEpisode?.still_path) {
              return {
                ...episode,
                thumbnail: this.getImageUrl(tmdbEpisode.still_path, 'w300') || episode.thumbnail || fallbackImage,
              };
            }
          } catch {
            // Silently fail and use existing thumbnail
          }
          return {
            ...episode,
            thumbnail: episode.thumbnail || fallbackImage,
          };
        })
      );

      enrichedSeasons.push({
        ...season,
        episodes: enrichedEpisodes,
      });
    }

    return enrichedSeasons;
  }
}


