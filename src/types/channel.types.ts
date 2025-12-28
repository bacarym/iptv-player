// Types pour les chaînes IPTV

export interface Channel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
  tvgId?: string;
  tvgName?: string;
  epgUrl?: string;
  catchup?: string;
  catchupDays?: number;
  catchupSource?: string;
  userAgent?: string;
  referrer?: string;
  isLive?: boolean;
  streamType?: 'live' | 'vod' | 'series';
  // Métadonnées VOD/Séries
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  releaseDate?: string;
  rating?: string;
  rating5?: number;
  duration?: string;
  youtubeTrailer?: string;
  backdrop?: string;
  // Enrichissements TMDB/OMDb
  tmdbGenres?: string[];
  tmdbPopularity?: number;
  tmdbOriginalLanguage?: string;
  tmdbRating?: number;
  tmdbYear?: string;
  tmdbDuration?: string;
  omdbAwards?: string | null;
  tmdbId?: number;
  // Pour les séries
  seriesId?: number;
  seasonNum?: number;
  episodeNum?: number;
}

export interface Category {
  id: string;
  name: string;
  channelCount: number;
}

export interface Playlist {
  id: string;
  name: string;
  source: 'file' | 'url' | 'xtream';
  channels: Channel[];
  categories: Category[];
  addedAt: number;
  lastUpdated?: number;
}

// Types pour Xtream Codes API
export interface XtreamCredentials {
  serverUrl: string;
  username: string;
  password: string;
}

export interface XtreamUserInfo {
  username: string;
  password: string;
  message?: string;
  auth: number;
  status: string;
  exp_date: string;
  is_trial: string;
  active_cons: string;
  created_at: string;
  max_connections: string;
  allowed_output_formats: string[];
}

export interface XtreamServerInfo {
  url: string;
  port: string;
  https_port: string;
  server_protocol: string;
  rtmp_port: string;
  timezone: string;
  timestamp_now: number;
  time_now: string;
}

export interface XtreamAuthResponse {
  user_info: XtreamUserInfo;
  server_info: XtreamServerInfo;
}

export interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export interface XtreamLiveStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string;
  added: string;
  category_id: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
}

export interface XtreamVodStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  rating: string;
  rating_5based: number;
  added: string;
  category_id: string;
  container_extension: string;
  custom_sid: string;
  direct_source: string;
}

export interface XtreamSeriesInfo {
  num: number;
  name: string;
  series_id: number;
  cover: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  releaseDate: string;
  last_modified: string;
  rating: string;
  rating_5based: number;
  backdrop_path: string[];
  youtube_trailer: string;
  episode_run_time: string;
  category_id: string;
}

// Types pour les épisodes et séries détaillées
export interface Episode {
  id: string;
  episodeNum: number;
  title: string;
  url: string;
  thumbnail?: string;
  plot?: string;
  duration?: string;
  rating?: number;
  releaseDate?: string;
}

export interface Season {
  seasonNumber: number;
  name?: string;
  episodeCount?: number;
  episodes: Episode[];
}

export interface SeriesDetails {
  seriesId: number;
  name: string;
  cover?: string;
  backdrop?: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  releaseDate?: string;
  rating5?: number;
  episodeRunTime?: string;
  seasons: Season[];
  totalEpisodes: number;
  tmdbRating?: number;
}

export interface VodDetails {
  streamId: number;
  name: string;
  cover?: string;
  backdrop?: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  releaseDate?: string;
  rating5?: number;
  duration?: string;
  durationSecs?: number;
  youtubeTrailer?: string;
  tmdbId?: number;
  country?: string;
  videoCodec?: string;
  videoResolution?: string;
  audioCodec?: string;
}

export interface XtreamVodInfo {
  info: {
    movie_image?: string;
    tmdb_id?: number;
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    releasedate?: string;
    rating?: string;
    rating_5based?: number;
    duration?: string;
    duration_secs?: number;
    youtube_trailer?: string;
    backdrop_path?: string | string[];
    country?: string;
    video?: {
      width?: number;
      height?: number;
      codec_name?: string;
    };
    audio?: {
      codec_name?: string;
    };
  };
  movie_data?: {
    name?: string;
    stream_id?: number;
    added?: string;
    category_id?: string;
    container_extension?: string;
  };
}

// Types pour l'état de l'application
export interface AppState {
  playlists: Playlist[];
  currentPlaylist: Playlist | null;
  currentChannel: Channel | null;
  favorites: string[]; // IDs des chaînes favorites
  lastWatched: string | null; // ID de la dernière chaîne regardée
  settings: AppSettings;
}

export interface AppSettings {
  volume: number;
  autoplay: boolean;
  defaultView: 'grid' | 'list';
  theme: 'dark' | 'light';
}

// Types pour le lecteur vidéo
export interface PlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  isFullscreen: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  error: string | null;
  quality: string;
  availableQualities: string[];
}

export type PlayerAction =
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'LOADING'; payload: boolean }
  | { type: 'FULLSCREEN'; payload: boolean }
  | { type: 'SET_TIME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_QUALITY'; payload: string }
  | { type: 'SET_QUALITIES'; payload: string[] };

// Types pour EPG (Guide des programmes)
export interface EpgProgram {
  id: string;
  channelId: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  startTimestamp: number;
  endTimestamp: number;
  isLive?: boolean;
  progress?: number; // 0-100
}

