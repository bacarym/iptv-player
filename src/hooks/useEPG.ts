import { useState, useEffect, useCallback, useRef } from 'react';
import { Channel, EpgProgram } from '../types/channel.types';
import { XtreamAPI } from '../parsers/xtreamApi';

// Cache global pour l'EPG
const epgCache = new Map<string, { programs: EpgProgram[]; fetchedAt: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useEPG(
  channels: Channel[],
  api: XtreamAPI | null,
  enabled: boolean = true
) {
  const [epgData, setEpgData] = useState<Map<string, EpgProgram[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const fetchedRef = useRef<Set<string>>(new Set());

  const fetchEpgForChannel = useCallback(async (channel: Channel) => {
    if (!api || !channel.isLive) return null;
    
    // Extraire l'ID de stream depuis l'ID du channel
    const streamIdMatch = channel.id.match(/xtream-live-(\d+)/);
    if (!streamIdMatch) return null;
    
    const streamId = streamIdMatch[1];
    const cacheKey = `epg-${streamId}`;
    
    // Vérifier le cache
    const cached = epgCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_DURATION) {
      return { channelId: channel.id, programs: cached.programs };
    }
    
    try {
      const programs = await api.getShortEpg(streamId);
      epgCache.set(cacheKey, { programs, fetchedAt: Date.now() });
      return { channelId: channel.id, programs };
    } catch (error) {
      console.warn(`Erreur EPG pour ${channel.name}:`, error);
      return null;
    }
  }, [api]);

  const fetchEpgBatch = useCallback(async (channelsToFetch: Channel[]) => {
    if (!api || channelsToFetch.length === 0) return;
    
    setIsLoading(true);
    
    // Fetch en parallèle par batch de 5
    const batchSize = 5;
    const allResults: { channelId: string; programs: EpgProgram[] }[] = [];
    
    for (let i = 0; i < channelsToFetch.length; i += batchSize) {
      const batch = channelsToFetch.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(fetchEpgForChannel));
      
      results.forEach(result => {
        if (result && result.programs.length > 0) {
          allResults.push(result);
          fetchedRef.current.add(result.channelId);
        }
      });
    }
    
    // Mise à jour unique à la fin avec le pattern fonctionnel
    if (allResults.length > 0) {
      setEpgData(prev => {
        const newMap = new Map(prev);
        allResults.forEach(result => {
          newMap.set(result.channelId, result.programs);
        });
        return newMap;
      });
    }
    
    setIsLoading(false);
  }, [api, fetchEpgForChannel]);

  // Ref pour éviter les doubles appels
  const isFetchingRef = useRef(false);
  const channelIdsRef = useRef<string>('');
  
  useEffect(() => {
    if (!enabled || !api) return;
    
    // Créer une clé unique basée sur les IDs des chaînes
    const currentIds = channels.filter(ch => ch.isLive).map(ch => ch.id).sort().join(',');
    
    // Si les chaînes n'ont pas changé et qu'on est déjà en train de fetcher, ne rien faire
    if (isFetchingRef.current && currentIds === channelIdsRef.current) return;
    
    channelIdsRef.current = currentIds;
    
    // Filtrer les chaînes live qui n'ont pas encore d'EPG
    const liveChannels = channels.filter(ch => 
      ch.isLive && !fetchedRef.current.has(ch.id)
    );
    
    if (liveChannels.length > 0) {
      console.log(`[EPG] Récupération EPG pour ${liveChannels.length} chaînes...`);
      isFetchingRef.current = true;
      
      // Charger TOUTES les chaînes en arrière-plan (par lots de 50)
      const loadAll = async () => {
        const batchSize = 50;
        for (let i = 0; i < liveChannels.length; i += batchSize) {
          const batch = liveChannels.slice(i, i + batchSize);
          await fetchEpgBatch(batch);
          // Petite pause entre les lots pour ne pas surcharger
          if (i + batchSize < liveChannels.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        isFetchingRef.current = false;
      };
      
      loadAll();
    }
  }, [channels, api, enabled, fetchEpgBatch]);

  // Rafraîchir l'EPG toutes les 5 minutes
  useEffect(() => {
    if (!enabled || !api) return;
    
    const interval = setInterval(() => {
      const liveChannels = channels.filter(ch => ch.isLive);
      if (liveChannels.length > 0) {
        // Rafraîchir uniquement le cache, pas le fetchedRef
        // Le prochain fetch récupérera les données depuis le cache mis à jour
        epgCache.clear();
        fetchedRef.current.clear();
        console.log(`[EPG] Rafraîchissement EPG pour ${liveChannels.length} chaînes...`);
      }
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [channels, api, enabled]);

  const getCurrentProgram = useCallback((channelId: string): EpgProgram | null => {
    const programs = epgData.get(channelId);
    if (!programs || programs.length === 0) return null;
    
    const now = Date.now();
    return programs.find(p => now >= p.startTimestamp && now <= p.endTimestamp) || null;
  }, [epgData]);

  const getNextProgram = useCallback((channelId: string): EpgProgram | null => {
    const programs = epgData.get(channelId);
    if (!programs || programs.length === 0) return null;
    
    const now = Date.now();
    return programs.find(p => p.startTimestamp > now) || null;
  }, [epgData]);

  return {
    epgData,
    isLoading,
    getCurrentProgram,
    getNextProgram,
    refreshEpg: () => {
      epgCache.clear();
      fetchedRef.current.clear();
      channelIdsRef.current = '';
      console.log('[EPG] Rafraîchissement manuel demandé');
    },
  };
}

// Hook simplifié pour une seule chaîne
export function useChannelEPG(
  channel: Channel | null,
  api: XtreamAPI | null
) {
  const [currentProgram, setCurrentProgram] = useState<EpgProgram | null>(null);
  const [nextProgram, setNextProgram] = useState<EpgProgram | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!channel || !api || !channel.isLive) {
      setCurrentProgram(null);
      setNextProgram(null);
      return;
    }

    const streamIdMatch = channel.id.match(/xtream-live-(\d+)/);
    if (!streamIdMatch) return;

    const streamId = streamIdMatch[1];
    const cacheKey = `epg-${streamId}`;

    const fetchEpg = async () => {
      // Vérifier le cache
      const cached = epgCache.get(cacheKey);
      if (cached && Date.now() - cached.fetchedAt < CACHE_DURATION) {
        const now = Date.now();
        const current = cached.programs.find(p => now >= p.startTimestamp && now <= p.endTimestamp);
        const next = cached.programs.find(p => p.startTimestamp > now);
        setCurrentProgram(current || null);
        setNextProgram(next || null);
        return;
      }

      setIsLoading(true);
      try {
        const programs = await api.getShortEpg(streamId);
        epgCache.set(cacheKey, { programs, fetchedAt: Date.now() });
        
        const now = Date.now();
        const current = programs.find(p => now >= p.startTimestamp && now <= p.endTimestamp);
        const next = programs.find(p => p.startTimestamp > now);
        setCurrentProgram(current || null);
        setNextProgram(next || null);
      } catch (error) {
        console.warn(`Erreur EPG:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEpg();

    // Rafraîchir toutes les minutes
    const interval = setInterval(fetchEpg, 60 * 1000);
    return () => clearInterval(interval);
  }, [channel, api]);

  return { currentProgram, nextProgram, isLoading };
}

