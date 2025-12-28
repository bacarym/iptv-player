import { useState, useEffect, useCallback } from 'react';
import { UserPreferences, DEFAULT_PREFERENCES } from '../types/preferences.types';

const STORAGE_KEY = 'iptv_user_preferences';

export function usePreferences(): {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  updateChannelPrefs: (updates: Partial<UserPreferences['channels']>) => void;
  updateMoviePrefs: (updates: Partial<UserPreferences['movies']>) => void;
  updateSeriesPrefs: (updates: Partial<UserPreferences['series']>) => void;
  completeOnboarding: () => void;
  resetPreferences: () => void;
} {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Error loading preferences:', e);
    }
    return DEFAULT_PREFERENCES;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.error('Error saving preferences:', e);
    }
  }, [preferences]);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  const updateChannelPrefs = useCallback((updates: Partial<UserPreferences['channels']>) => {
    setPreferences(prev => ({
      ...prev,
      channels: { ...prev.channels, ...updates },
    }));
  }, []);

  const updateMoviePrefs = useCallback((updates: Partial<UserPreferences['movies']>) => {
    setPreferences(prev => ({
      ...prev,
      movies: { ...prev.movies, ...updates },
    }));
  }, []);

  const updateSeriesPrefs = useCallback((updates: Partial<UserPreferences['series']>) => {
    setPreferences(prev => ({
      ...prev,
      series: { ...prev.series, ...updates },
    }));
  }, []);

  const completeOnboarding = useCallback(() => {
    setPreferences(prev => ({ ...prev, onboardingCompleted: true }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    preferences,
    updatePreferences,
    updateChannelPrefs,
    updateMoviePrefs,
    updateSeriesPrefs,
    completeOnboarding,
    resetPreferences,
  };
}

