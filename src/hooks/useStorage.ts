import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import { Playlist, AppSettings, Channel } from '../types/channel.types';

/**
 * Generic storage hook
 */
export function useStorage<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage error:', error);
    }
  }, [key, value]);

  return [value, setValue];
}

const STORAGE_KEYS = {
  PLAYLISTS: 'iptv_playlists',
  FAVORITES: 'iptv_favorites',
  LAST_WATCHED: 'iptv_last_watched',
  SETTINGS: 'iptv_settings',
  XTREAM_CREDENTIALS: 'iptv_xtream_credentials',
};

const DEFAULT_SETTINGS: AppSettings = {
  volume: 100,
  autoplay: true,
  defaultView: 'grid',
  theme: 'dark',
};

/**
 * Hook pour gérer le stockage local des playlists
 */
export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les playlists au démarrage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
      if (stored) {
        setPlaylists(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des playlists:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sauvegarder les playlists quand elles changent
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des playlists:', error);
      }
    }
  }, [playlists, isLoading]);

  const addPlaylist = useCallback((playlist: Playlist) => {
    setPlaylists(prev => [...prev, playlist]);
  }, []);

  const removePlaylist = useCallback((playlistId: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
  }, []);

  const updatePlaylist = useCallback((playlistId: string, updates: Partial<Playlist>) => {
    setPlaylists(prev => prev.map(p => 
      p.id === playlistId ? { ...p, ...updates, lastUpdated: Date.now() } : p
    ));
  }, []);

  const clearPlaylists = useCallback(() => {
    setPlaylists([]);
  }, []);

  return {
    playlists,
    isLoading,
    addPlaylist,
    removePlaylist,
    updatePlaylist,
    clearPlaylists,
  };
}

/**
 * Hook pour gérer les favoris
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des favoris:', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify([...favorites]));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des favoris:', error);
    }
  }, [favorites]);

  const toggleFavorite = useCallback((channelId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback((channelId: string) => {
    return favorites.has(channelId);
  }, [favorites]);

  const clearFavorites = useCallback(() => {
    setFavorites(new Set());
  }, []);

  return {
    favorites: [...favorites],
    toggleFavorite,
    isFavorite,
    clearFavorites,
  };
}

/**
 * Hook pour mémoriser la dernière chaîne regardée
 */
export function useLastWatched() {
  const [lastWatched, setLastWatchedState] = useState<Channel | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LAST_WATCHED);
      if (stored) {
        setLastWatchedState(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la dernière chaîne:', error);
    }
  }, []);

  const setLastWatched = useCallback((channel: Channel) => {
    setLastWatchedState(channel);
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_WATCHED, JSON.stringify(channel));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  }, []);

  const clearLastWatched = useCallback(() => {
    setLastWatchedState(null);
    localStorage.removeItem(STORAGE_KEYS.LAST_WATCHED);
  }, []);

  return {
    lastWatched,
    setLastWatched,
    clearLastWatched,
  };
}

/**
 * Hook pour les paramètres de l'application
 */
export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) {
        setSettingsState({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    }
  }, []);

  const setSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(next));
      } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
      }
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettingsState(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  }, []);

  return {
    settings,
    setSettings,
    resetSettings,
  };
}

/**
 * Hook pour stocker les credentials Xtream (optionnel)
 */
export function useXtreamCredentials() {
  const [credentials, setCredentialsState] = useState<{
    serverUrl: string;
    username: string;
    password: string;
  } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.XTREAM_CREDENTIALS);
      if (stored) {
        setCredentialsState(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des credentials:', error);
    }
  }, []);

  const saveCredentials = useCallback((creds: {
    serverUrl: string;
    username: string;
    password: string;
  }) => {
    setCredentialsState(creds);
    try {
      localStorage.setItem(STORAGE_KEYS.XTREAM_CREDENTIALS, JSON.stringify(creds));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  }, []);

  const clearCredentials = useCallback(() => {
    setCredentialsState(null);
    localStorage.removeItem(STORAGE_KEYS.XTREAM_CREDENTIALS);
  }, []);

  return {
    credentials,
    saveCredentials,
    clearCredentials,
  };
}

