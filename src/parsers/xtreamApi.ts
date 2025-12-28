import {
  XtreamCredentials,
  XtreamAuthResponse,
  XtreamCategory,
  XtreamLiveStream,
  XtreamVodStream,
  XtreamSeriesInfo,
  Channel,
  Category,
  Playlist,
  SeriesDetails,
  Season,
  Episode,
  VodDetails,
  XtreamVodInfo,
  EpgProgram,
} from '../types/channel.types';

// Interface pour la réponse EPG Xtream
interface XtreamEpgResponse {
  epg_listings?: Array<{
    id: string;
    epg_id: string;
    title: string;
    lang: string;
    start: string;
    end: string;
    description: string;
    channel_id: string;
    start_timestamp: string;
    stop_timestamp: string;
  }>;
}

/**
 * Client API Xtream Codes
 * Gère la connexion et la récupération des données depuis un serveur Xtream
 */

export class XtreamAPI {
  private credentials: XtreamCredentials;
  private baseUrl: string;
  private authInfo: XtreamAuthResponse | null = null;

  constructor(credentials: XtreamCredentials) {
    this.credentials = credentials;
    // Normaliser l'URL du serveur
    let serverUrl = credentials.serverUrl.trim();
    if (serverUrl.endsWith('/')) {
      serverUrl = serverUrl.slice(0, -1);
    }
    if (!serverUrl.startsWith('http')) {
      serverUrl = `http://${serverUrl}`;
    }
    this.baseUrl = serverUrl;
  }

  /**
   * Construit l'URL de l'API avec les paramètres d'authentification
   */
  private buildApiUrl(action?: string): string {
    const { username, password } = this.credentials;
    let url = `${this.baseUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    if (action) {
      url += `&action=${action}`;
    }
    return url;
  }

  /**
   * Effectue une requête à l'API
   */
  private async fetchApi<T>(action?: string): Promise<T> {
    const url = this.buildApiUrl(action);
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Erreur API Xtream: ${error.message}`);
      }
      throw new Error('Erreur inconnue lors de la connexion au serveur');
    }
  }

  /**
   * Authentification au serveur Xtream
   */
  async authenticate(): Promise<XtreamAuthResponse> {
    const response = await this.fetchApi<XtreamAuthResponse>();
    
    if (!response.user_info || response.user_info.auth !== 1) {
      throw new Error('Authentification échouée. Vérifiez vos identifiants.');
    }
    
    this.authInfo = response;
    return response;
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   */
  isAuthenticated(): boolean {
    return this.authInfo !== null;
  }

  /**
   * Récupère les informations de l'utilisateur
   */
  getUserInfo(): XtreamAuthResponse | null {
    return this.authInfo;
  }

  /**
   * Récupère les catégories de chaînes live
   */
  async getLiveCategories(): Promise<XtreamCategory[]> {
    return this.fetchApi<XtreamCategory[]>('get_live_categories');
  }

  /**
   * Récupère les catégories VOD
   */
  async getVodCategories(): Promise<XtreamCategory[]> {
    return this.fetchApi<XtreamCategory[]>('get_vod_categories');
  }

  /**
   * Récupère les catégories de séries
   */
  async getSeriesCategories(): Promise<XtreamCategory[]> {
    return this.fetchApi<XtreamCategory[]>('get_series_categories');
  }

  /**
   * Récupère toutes les chaînes live
   */
  async getLiveStreams(categoryId?: string): Promise<XtreamLiveStream[]> {
    let url = this.buildApiUrl('get_live_streams');
    if (categoryId) {
      url += `&category_id=${categoryId}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Récupère les films VOD
   */
  async getVodStreams(categoryId?: string): Promise<XtreamVodStream[]> {
    let url = this.buildApiUrl('get_vod_streams');
    if (categoryId) {
      url += `&category_id=${categoryId}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Récupère les séries
   */
  async getSeries(categoryId?: string): Promise<XtreamSeriesInfo[]> {
    let url = this.buildApiUrl('get_series');
    if (categoryId) {
      url += `&category_id=${categoryId}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Construit l'URL de streaming pour une chaîne live
   */
  buildLiveStreamUrl(streamId: number | string, extension: string = 'm3u8'): string {
    const { username, password } = this.credentials;
    return `${this.baseUrl}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${streamId}.${extension}`;
  }

  /**
   * Construit l'URL de streaming pour un film VOD
   */
  buildVodStreamUrl(streamId: number | string, extension: string = 'mp4'): string {
    const { username, password } = this.credentials;
    return `${this.baseUrl}/movie/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${streamId}.${extension}`;
  }

  /**
   * Construit l'URL de streaming pour un épisode de série
   */
  buildSeriesStreamUrl(streamId: number | string, extension: string = 'mp4'): string {
    const { username, password } = this.credentials;
    return `${this.baseUrl}/series/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${streamId}.${extension}`;
  }

  /**
   * Convertit un XtreamLiveStream en Channel
   */
  private liveStreamToChannel(stream: XtreamLiveStream, categoryName: string): Channel {
    return {
      id: `xtream-live-${stream.stream_id}`,
      name: stream.name,
      url: this.buildLiveStreamUrl(stream.stream_id),
      logo: stream.stream_icon || undefined,
      group: categoryName,
      tvgId: stream.epg_channel_id || undefined,
      isLive: true,
      streamType: 'live',
    };
  }

  /**
   * Convertit un XtreamVodStream en Channel
   */
  private vodStreamToChannel(stream: XtreamVodStream, categoryName: string): Channel {
    return {
      id: `xtream-vod-${stream.stream_id}`,
      name: stream.name,
      url: this.buildVodStreamUrl(stream.stream_id, stream.container_extension),
      logo: stream.stream_icon || undefined,
      group: categoryName,
      isLive: false,
      streamType: 'vod',
      rating: stream.rating || undefined,
      rating5: stream.rating_5based || undefined,
    };
  }

  /**
   * Convertit un XtreamSeriesInfo en Channel (représentation de la série)
   */
  private seriesToChannel(series: XtreamSeriesInfo, categoryName: string): Channel {
    return {
      id: `xtream-series-${series.series_id}`,
      name: series.name,
      url: '', // Les séries n'ont pas d'URL directe, on utilise l'API pour les épisodes
      logo: series.cover || undefined,
      group: categoryName,
      isLive: false,
      streamType: 'series',
      seriesId: series.series_id,
      plot: series.plot || undefined,
      cast: series.cast || undefined,
      director: series.director || undefined,
      genre: series.genre || undefined,
      releaseDate: series.releaseDate || undefined,
      rating: series.rating || undefined,
      rating5: series.rating_5based || undefined,
      duration: series.episode_run_time || undefined,
      youtubeTrailer: series.youtube_trailer || undefined,
      backdrop: series.backdrop_path?.[0] || undefined,
    };
  }

  /**
   * Récupère les informations détaillées d'une série (saisons et épisodes)
   */
  async getSeriesInfo(seriesId: number): Promise<SeriesDetails> {
    const url = `${this.buildApiUrl('get_series_info')}&series_id=${seriesId}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 secondes timeout
    
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.episodes) {
        return {
          seriesId,
          name: data?.info?.name || 'Série inconnue',
          seasons: [],
          totalEpisodes: 0,
        };
      }
      
      const info = data.info || {};
      const seriesCover = info.cover || '';
      
      // Construire les saisons à partir des épisodes
      const seasons: Season[] = [];
      const episodesBySeason = data.episodes || {};
      
      // Si data.seasons existe, l'utiliser, sinon créer depuis les clés d'épisodes
      const seasonNumbers = data.seasons && data.seasons.length > 0
        ? data.seasons.map((s: { season_number: number }) => s.season_number)
        : Object.keys(episodesBySeason).map(Number).sort((a, b) => a - b);
      
      for (const seasonNum of seasonNumbers) {
        const seasonEpisodes = episodesBySeason[seasonNum.toString()] || [];
        
        const episodes: Episode[] = seasonEpisodes.map((ep: {
          id: string | number;
          episode_num: number;
          title: string;
          info?: {
            movie_image?: string;
            cover?: string;
            cover_big?: string;
            plot?: string;
            duration?: string;
            rating?: number;
            releasedate?: string;
          };
          container_extension?: string;
        }) => ({
          id: `ep-${ep.id}`,
          episodeNum: ep.episode_num,
          title: ep.title || `Épisode ${ep.episode_num}`,
          url: this.buildSeriesStreamUrl(ep.id, ep.container_extension || 'mp4'),
          thumbnail: ep.info?.movie_image || ep.info?.cover || ep.info?.cover_big || seriesCover,
          plot: ep.info?.plot,
          duration: ep.info?.duration,
          rating: ep.info?.rating,
          releaseDate: ep.info?.releasedate,
        }));
        
        const seasonInfo = data.seasons?.find((s: { season_number: number }) => s.season_number === seasonNum);
        
        seasons.push({
          seasonNumber: seasonNum,
          name: seasonInfo?.name || `Saison ${seasonNum}`,
          episodeCount: episodes.length,
          episodes,
        });
      }
      
      // Gérer backdrop_path qui peut être string ou array
      let backdrop: string | undefined;
      if (Array.isArray(info.backdrop_path) && info.backdrop_path.length > 0) {
        backdrop = info.backdrop_path[0];
      } else if (typeof info.backdrop_path === 'string') {
        backdrop = info.backdrop_path;
      }
      
      return {
        seriesId,
        name: info.name || 'Série inconnue',
        cover: info.cover,
        backdrop,
        plot: info.plot,
        cast: info.cast,
        director: info.director,
        genre: info.genre,
        releaseDate: info.releaseDate,
        rating5: info.rating_5based,
        episodeRunTime: info.episode_run_time,
        seasons,
        totalEpisodes: seasons.reduce((sum, s) => sum + s.episodes.length, 0),
      };
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`Erreur lors de la récupération des infos série ${seriesId}:`, error);
      return {
        seriesId,
        name: 'Série inconnue',
        seasons: [],
        totalEpisodes: 0,
      };
    }
  }

  /**
   * Récupère l'EPG court pour une chaîne (programme actuel + suivants)
   */
  async getShortEpg(streamId: number | string): Promise<EpgProgram[]> {
    const url = `${this.buildApiUrl('get_short_epg')}&stream_id=${streamId}&limit=3`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return [];
      }
      
      const data: XtreamEpgResponse = await response.json();
      
      if (!data.epg_listings || data.epg_listings.length === 0) {
        return [];
      }
      
      const now = Date.now();
      
      return data.epg_listings.map(listing => {
        const startTs = parseInt(listing.start_timestamp) * 1000;
        const endTs = parseInt(listing.stop_timestamp) * 1000;
        const isLive = now >= startTs && now <= endTs;
        const progress = isLive ? Math.round(((now - startTs) / (endTs - startTs)) * 100) : 0;
        
        // Décoder les titres et descriptions qui sont souvent en base64
        let title = listing.title || '';
        let description = listing.description || '';
        
        try {
          // Vérifier si c'est du base64 valide
          if (title && /^[A-Za-z0-9+/=]+$/.test(title) && title.length > 4) {
            const decoded = atob(title);
            // Vérifier si le résultat est lisible (UTF-8)
            if (!/[\x00-\x08\x0E-\x1F]/.test(decoded)) {
              title = decodeURIComponent(escape(decoded));
            }
          }
        } catch {
          // Garder le titre original si le décodage échoue
        }
        
        try {
          if (description && /^[A-Za-z0-9+/=]+$/.test(description) && description.length > 4) {
            const decoded = atob(description);
            if (!/[\x00-\x08\x0E-\x1F]/.test(decoded)) {
              description = decodeURIComponent(escape(decoded));
            }
          }
        } catch {
          // Garder la description originale si le décodage échoue
        }
        
        return {
          id: listing.id,
          channelId: listing.channel_id,
          title,
          description,
          start: new Date(startTs),
          end: new Date(endTs),
          startTimestamp: startTs,
          endTimestamp: endTs,
          isLive,
          progress,
        };
      });
    } catch (error) {
      console.warn(`Erreur EPG pour stream ${streamId}:`, error);
      return [];
    }
  }

  /**
   * Récupère l'EPG pour plusieurs chaînes en batch
   */
  async getBatchEpg(streamIds: (number | string)[]): Promise<Map<string, EpgProgram[]>> {
    const results = new Map<string, EpgProgram[]>();
    
    // Limiter les requêtes parallèles à 10 à la fois
    const batchSize = 10;
    for (let i = 0; i < streamIds.length; i += batchSize) {
      const batch = streamIds.slice(i, i + batchSize);
      const promises = batch.map(async (id) => {
        const epg = await this.getShortEpg(id);
        results.set(String(id), epg);
      });
      await Promise.all(promises);
    }
    
    return results;
  }

  /**
   * Récupère les informations détaillées d'un film VOD
   */
  async getVodInfo(vodId: number): Promise<VodDetails> {
    const url = `${this.buildApiUrl('get_vod_info')}&vod_id=${vodId}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 secondes timeout
    
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data: XtreamVodInfo = await response.json();
      
      if (!data || !data.info) {
        return { streamId: vodId, name: '' };
      }
      
      const info = data.info;
      
      // Construire la résolution vidéo
      let videoResolution: string | undefined;
      if (info.video?.width && info.video?.height) {
        videoResolution = `${info.video.width}x${info.video.height}`;
      }
      
      // Gérer backdrop_path qui peut être string ou array
      let backdrop: string | undefined;
      if (Array.isArray(info.backdrop_path) && info.backdrop_path.length > 0) {
        backdrop = info.backdrop_path[0];
      } else if (typeof info.backdrop_path === 'string') {
        backdrop = info.backdrop_path;
      }
      
      return {
        streamId: vodId,
        name: data.movie_data?.name || '',
        cover: info.movie_image,
        backdrop,
        plot: info.plot,
        cast: info.cast,
        director: info.director,
        genre: info.genre,
        releaseDate: info.releasedate,
        rating5: info.rating_5based,
        duration: info.duration,
        durationSecs: info.duration_secs,
        youtubeTrailer: info.youtube_trailer,
        tmdbId: info.tmdb_id,
        country: info.country,
        videoCodec: info.video?.codec_name,
        videoResolution,
        audioCodec: info.audio?.codec_name,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`Erreur lors de la récupération des détails VOD ${vodId}:`, error);
      return { streamId: vodId, name: '' };
    }
  }

  /**
   * Charge toutes les données et les convertit en Playlist
   */
  async loadFullPlaylist(options: {
    includeLive?: boolean;
    includeVod?: boolean;
    includeSeries?: boolean;
  } = { includeLive: true, includeVod: true, includeSeries: true }): Promise<Playlist> {
    // S'assurer qu'on est authentifié
    if (!this.isAuthenticated()) {
      await this.authenticate();
    }

    const channels: Channel[] = [];
    const categories: Category[] = [];
    const categoryMap = new Map<string, string>(); // id -> name

    // Charger les chaînes live
    if (options.includeLive) {
      try {
        const liveCategories = await this.getLiveCategories();
        
        for (const cat of liveCategories) {
          categoryMap.set(cat.category_id, cat.category_name);
        }
        
        const liveStreams = await this.getLiveStreams();
        
        for (const stream of liveStreams) {
          const categoryName = categoryMap.get(stream.category_id) || 'Live TV';
          channels.push(this.liveStreamToChannel(stream, categoryName));
        }
      } catch (error) {
        console.warn('Erreur lors du chargement des chaînes live:', error);
      }
    }

    // Charger les VOD
    if (options.includeVod) {
      try {
        const vodCategories = await this.getVodCategories();
        
        for (const cat of vodCategories) {
          categoryMap.set(`vod-${cat.category_id}`, cat.category_name);
        }
        
        const vodStreams = await this.getVodStreams();
        
        for (const stream of vodStreams) {
          const categoryName = categoryMap.get(`vod-${stream.category_id}`) || 'Films';
          channels.push(this.vodStreamToChannel(stream, `📽 ${categoryName}`));
        }
      } catch (error) {
        console.warn('Erreur lors du chargement des VOD:', error);
      }
    }

    // Charger les séries
    if (options.includeSeries) {
      try {
        const seriesCategories = await this.getSeriesCategories();
        
        for (const cat of seriesCategories) {
          categoryMap.set(`series-${cat.category_id}`, cat.category_name);
        }
        
        const seriesList = await this.getSeries();
        
        for (const series of seriesList) {
          const categoryName = categoryMap.get(`series-${series.category_id}`) || 'Séries';
          channels.push(this.seriesToChannel(series, `📺 ${categoryName}`));
        }
      } catch (error) {
        console.warn('Erreur lors du chargement des séries:', error);
      }
    }

    // Construire les catégories
    const categoryCount = new Map<string, number>();
    for (const channel of channels) {
      const group = channel.group || 'Non classé';
      categoryCount.set(group, (categoryCount.get(group) || 0) + 1);
    }

    for (const [name, count] of categoryCount) {
      categories.push({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        channelCount: count,
      });
    }

    categories.sort((a, b) => a.name.localeCompare(b.name));

    return {
      id: `xtream-${this.credentials.serverUrl}-${Date.now()}`,
      name: `Xtream - ${this.credentials.username}`,
      source: 'xtream',
      channels,
      categories,
      addedAt: Date.now(),
    };
  }
}

/**
 * Teste la connexion à un serveur Xtream
 */
export async function testXtreamConnection(credentials: XtreamCredentials): Promise<{
  success: boolean;
  message: string;
  userInfo?: XtreamAuthResponse;
}> {
  try {
    const api = new XtreamAPI(credentials);
    const authInfo = await api.authenticate();
    
    return {
      success: true,
      message: `Connecté avec succès! Expire le: ${new Date(parseInt(authInfo.user_info.exp_date) * 1000).toLocaleDateString()}`,
      userInfo: authInfo,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erreur de connexion',
    };
  }
}

