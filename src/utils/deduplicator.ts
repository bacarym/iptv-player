import { Channel } from '../types/channel.types';
import { DeduplicatedContent, ContentVariant, UserPreferences, Quality } from '../types/preferences.types';
import { parseContentMetadata, getContentKey, selectBestQuality } from './contentParser';

/**
 * Déduplique les chaînes TV par nom et pays
 */
export function deduplicateChannels(channels: Channel[]): DeduplicatedContent[] {
  const groups = new Map<string, Channel[]>();
  
  // Grouper par clé unique
  for (const channel of channels) {
    if (!channel.isLive) continue;
    const key = getContentKey(channel.name, 'channel');
    const existing = groups.get(key) || [];
    existing.push(channel);
    groups.set(key, existing);
  }
  
  // Convertir en DeduplicatedContent
  const result: DeduplicatedContent[] = [];
  
  for (const [, channelGroup] of groups) {
    const first = channelGroup[0];
    if (!first) continue;
    
    const metadata = parseContentMetadata(first.name);
    
    const variants: ContentVariant[] = channelGroup.map(ch => ({
      id: ch.id,
      url: ch.url,
      quality: parseContentMetadata(ch.name).quality,
      language: parseContentMetadata(ch.name).language,
    }));
    
    result.push({
      id: first.id,
      name: metadata.cleanName,
      logo: first.logo,
      group: first.group,
      type: 'channel',
      metadata,
      variants,
    });
  }
  
  return result;
}

/**
 * Déduplique les films par nom et année
 */
export function deduplicateMovies(channels: Channel[]): DeduplicatedContent[] {
  const groups = new Map<string, Channel[]>();
  
  // Filtrer les VOD (non-live)
  const movies = channels.filter(ch => !ch.isLive && ch.streamType === 'vod');
  
  for (const movie of movies) {
    const key = getContentKey(movie.name, 'movie');
    const existing = groups.get(key) || [];
    existing.push(movie);
    groups.set(key, existing);
  }
  
  const result: DeduplicatedContent[] = [];
  
  for (const [, movieGroup] of groups) {
    const first = movieGroup[0];
    if (!first) continue;
    
    const metadata = parseContentMetadata(first.name);
    
    const variants: ContentVariant[] = movieGroup.map(m => ({
      id: m.id,
      url: m.url,
      quality: parseContentMetadata(m.name).quality,
      language: parseContentMetadata(m.name).language,
    }));
    
    result.push({
      id: first.id,
      name: metadata.cleanName,
      logo: first.logo,
      group: first.group,
      type: 'movie',
      metadata,
      variants,
    });
  }
  
  return result;
}

/**
 * Déduplique les séries par nom et saison
 */
export function deduplicateSeries(channels: Channel[]): DeduplicatedContent[] {
  const groups = new Map<string, Channel[]>();
  
  const series = channels.filter(ch => !ch.isLive && ch.streamType === 'series');
  
  for (const episode of series) {
    const key = getContentKey(episode.name, 'series');
    const existing = groups.get(key) || [];
    existing.push(episode);
    groups.set(key, existing);
  }
  
  const result: DeduplicatedContent[] = [];
  
  for (const [, seriesGroup] of groups) {
    const first = seriesGroup[0];
    if (!first) continue;
    
    const metadata = parseContentMetadata(first.name);
    
    const variants: ContentVariant[] = seriesGroup.map(s => ({
      id: s.id,
      url: s.url,
      quality: parseContentMetadata(s.name).quality,
      language: parseContentMetadata(s.name).language,
    }));
    
    result.push({
      id: first.id,
      name: metadata.cleanName,
      logo: first.logo,
      group: first.group,
      type: 'series',
      metadata,
      variants,
    });
  }
  
  return result;
}

/**
 * Filtre le contenu selon les préférences utilisateur
 */
export function filterContentByPreferences(
  content: DeduplicatedContent[],
  preferences: UserPreferences
): DeduplicatedContent[] {
  return content.filter(item => {
    if (item.type === 'channel') {
      const prefs = preferences.channels;
      
      // Filtrer par pays
      if (prefs.countries.length > 0) {
        if (!item.metadata.country || !prefs.countries.includes(item.metadata.country)) {
          return false;
        }
      }
      
      // Filtrer par catégorie
      if (prefs.categories.length > 0) {
        if (!item.group || !prefs.categories.some(cat => 
          item.group?.toLowerCase().includes(cat.toLowerCase())
        )) {
          return false;
        }
      }
      
      return true;
    }
    
    if (item.type === 'movie') {
      const prefs = preferences.movies;
      
      // Filtrer par langue préférée
      if (prefs.preferredLanguage && prefs.preferredLanguage !== 'all') {
        const hasPreferredLang = item.variants.some(v => 
          v.language === prefs.preferredLanguage
        );
        // Si la langue préférée n'est pas dispo, on garde quand même
        // mais on priorisera dans l'affichage
      }
      
      // Filtrer par catégorie
      if (prefs.categories.length > 0) {
        if (!item.group || !prefs.categories.some(cat => 
          item.group?.toLowerCase().includes(cat.toLowerCase())
        )) {
          return false;
        }
      }
      
      return true;
    }
    
    if (item.type === 'series') {
      const prefs = preferences.series;
      
      // Filtrer par catégorie
      if (prefs.categories.length > 0) {
        if (!item.group || !prefs.categories.some(cat => 
          item.group?.toLowerCase().includes(cat.toLowerCase())
        )) {
          return false;
        }
      }
      
      return true;
    }
    
    return true;
  });
}

/**
 * Sélectionne le meilleur variant selon les préférences
 */
export function selectBestVariant(
  content: DeduplicatedContent,
  preferences: UserPreferences
): ContentVariant {
  const { variants } = content;
  
  if (variants.length === 1) {
    return variants[0];
  }
  
  if (content.type === 'channel') {
    const quality = preferences.channels.defaultQuality;
    const idx = selectBestQuality(variants, quality);
    return variants[idx] || variants[0];
  }
  
  if (content.type === 'movie') {
    const prefLang = preferences.movies.preferredLanguage;
    // D'abord chercher par langue
    const langMatch = variants.find(v => v.language === prefLang);
    if (langMatch) return langMatch;
    // Sinon meilleure qualité
    const idx = selectBestQuality(variants, 'FHD');
    return variants[idx] || variants[0];
  }
  
  if (content.type === 'series') {
    const prefLang = preferences.series.preferredLanguage;
    const langMatch = variants.find(v => v.language === prefLang);
    if (langMatch) return langMatch;
    const idx = selectBestQuality(variants, 'FHD');
    return variants[idx] || variants[0];
  }
  
  return variants[0];
}

/**
 * Compte les contenus par type et préférences
 */
export function countContentByPreferences(
  channels: Channel[],
  preferences: Partial<UserPreferences>
): { channels: number; movies: number; series: number } {
  let channelCount = 0;
  let movieCount = 0;
  let seriesCount = 0;
  
  const deduped = {
    channels: deduplicateChannels(channels),
    movies: deduplicateMovies(channels),
    series: deduplicateSeries(channels),
  };
  
  // Compter les chaînes filtrées
  if (preferences.channels) {
    const filtered = deduped.channels.filter(ch => {
      if (preferences.channels!.countries.length > 0) {
        if (!ch.metadata.country || !preferences.channels!.countries.includes(ch.metadata.country)) {
          return false;
        }
      }
      return true;
    });
    channelCount = filtered.length;
  } else {
    channelCount = deduped.channels.length;
  }
  
  movieCount = deduped.movies.length;
  seriesCount = deduped.series.length;
  
  return { channels: channelCount, movies: movieCount, series: seriesCount };
}

