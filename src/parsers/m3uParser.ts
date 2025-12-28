import { Channel, Category, Playlist } from '../types/channel.types';

/**
 * Parser M3U/M3U8 robuste
 * Supporte les différents formats de fichiers M3U IPTV
 */

// Regex patterns pour extraire les métadonnées
const EXTINF_REGEX = /^#EXTINF:\s*(-?\d+)(?:\s+(.*))?$/;
const TVG_ID_REGEX = /tvg-id="([^"]*)"/i;
const TVG_NAME_REGEX = /tvg-name="([^"]*)"/i;
const TVG_LOGO_REGEX = /tvg-logo="([^"]*)"/i;
const GROUP_TITLE_REGEX = /group-title="([^"]*)"/i;
const TVG_SHIFT_REGEX = /tvg-shift="([^"]*)"/i;
const CATCHUP_REGEX = /catchup="([^"]*)"/i;
const CATCHUP_DAYS_REGEX = /catchup-days="([^"]*)"/i;
const CATCHUP_SOURCE_REGEX = /catchup-source="([^"]*)"/i;
const USER_AGENT_REGEX = /user-agent="([^"]*)"/i;
const REFERRER_REGEX = /referrer="([^"]*)"/i;

// Regex pour #EXTM3U (header)
const EXTM3U_URL_TVG_REGEX = /url-tvg="([^"]*)"/i;
const EXTM3U_REFRESH_REGEX = /refresh="([^"]*)"/i;

interface M3UHeader {
  urlTvg?: string;
  refresh?: string;
}

interface ParsedChannel {
  duration: number;
  attributes: string;
  name: string;
  url: string;
}

/**
 * Génère un ID unique pour une chaîne
 */
function generateChannelId(name: string, url: string): string {
  const str = `${name}-${url}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Extrait les attributs d'une ligne EXTINF
 */
function parseExtinfAttributes(line: string): { attributes: string; name: string; duration: number } {
  const match = line.match(EXTINF_REGEX);
  
  if (!match) {
    return { attributes: '', name: '', duration: -1 };
  }

  const duration = parseInt(match[1] ?? '-1', 10);
  const rest = match[2] ?? '';
  
  // Le nom est généralement après la dernière virgule
  const commaIndex = rest.lastIndexOf(',');
  
  if (commaIndex !== -1) {
    const attributes = rest.substring(0, commaIndex).trim();
    const name = rest.substring(commaIndex + 1).trim();
    return { attributes, name, duration };
  }
  
  return { attributes: rest, name: rest, duration };
}

/**
 * Extrait une valeur avec regex
 */
function extractAttribute(attributes: string, regex: RegExp): string | undefined {
  const match = attributes.match(regex);
  return match?.[1]?.trim() || undefined;
}

/**
 * Parse le header #EXTM3U
 */
function parseHeader(line: string): M3UHeader {
  return {
    urlTvg: extractAttribute(line, EXTM3U_URL_TVG_REGEX),
    refresh: extractAttribute(line, EXTM3U_REFRESH_REGEX),
  };
}

/**
 * Détermine si une URL est un flux live ou VOD
 */
function determineStreamType(url: string, name: string): 'live' | 'vod' | 'series' {
  const lowerUrl = url.toLowerCase();
  const lowerName = name.toLowerCase();
  
  // Extensions vidéo typiques pour VOD
  const vodExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv'];
  if (vodExtensions.some(ext => lowerUrl.endsWith(ext))) {
    return 'vod';
  }
  
  // Patterns pour séries
  if (lowerUrl.includes('/series/') || lowerName.includes('s0') || lowerName.includes('e0')) {
    return 'series';
  }
  
  // Patterns pour VOD
  if (lowerUrl.includes('/movie/') || lowerUrl.includes('/vod/')) {
    return 'vod';
  }
  
  return 'live';
}

/**
 * Parse une chaîne depuis les données extraites
 */
function parseChannel(data: ParsedChannel, epgUrl?: string): Channel {
  const { attributes, name, url } = data;
  
  const tvgId = extractAttribute(attributes, TVG_ID_REGEX);
  const tvgName = extractAttribute(attributes, TVG_NAME_REGEX);
  const logo = extractAttribute(attributes, TVG_LOGO_REGEX);
  const group = extractAttribute(attributes, GROUP_TITLE_REGEX);
  const catchup = extractAttribute(attributes, CATCHUP_REGEX);
  const catchupDays = extractAttribute(attributes, CATCHUP_DAYS_REGEX);
  const catchupSource = extractAttribute(attributes, CATCHUP_SOURCE_REGEX);
  const userAgent = extractAttribute(attributes, USER_AGENT_REGEX);
  const referrer = extractAttribute(attributes, REFERRER_REGEX);
  
  const streamType = determineStreamType(url, name);
  
  return {
    id: generateChannelId(name, url),
    name: name || tvgName || 'Unknown Channel',
    url,
    logo,
    group: group || 'Non classé',
    tvgId,
    tvgName,
    epgUrl,
    catchup,
    catchupDays: catchupDays ? parseInt(catchupDays, 10) : undefined,
    catchupSource,
    userAgent,
    referrer,
    isLive: streamType === 'live',
    streamType,
  };
}

/**
 * Extrait les catégories uniques des chaînes
 */
function extractCategories(channels: Channel[]): Category[] {
  const categoryMap = new Map<string, number>();
  
  channels.forEach(channel => {
    const group = channel.group || 'Non classé';
    categoryMap.set(group, (categoryMap.get(group) || 0) + 1);
  });
  
  return Array.from(categoryMap.entries()).map(([name, count]) => ({
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    channelCount: count,
  })).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Parse le contenu M3U complet
 */
export function parseM3U(content: string, sourceName: string = 'Playlist'): Playlist {
  const lines = content.split(/\r?\n/);
  const channels: Channel[] = [];
  
  let header: M3UHeader = {};
  let currentData: Partial<ParsedChannel> | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? '';
    
    if (!line) continue;
    
    // Header M3U
    if (line.startsWith('#EXTM3U')) {
      header = parseHeader(line);
      continue;
    }
    
    // Ligne EXTINF
    if (line.startsWith('#EXTINF:')) {
      const parsed = parseExtinfAttributes(line);
      currentData = {
        duration: parsed.duration,
        attributes: parsed.attributes,
        name: parsed.name,
      };
      continue;
    }
    
    // Commentaires et autres directives à ignorer
    if (line.startsWith('#')) {
      continue;
    }
    
    // URL de stream
    if (currentData && (line.startsWith('http') || line.startsWith('rtmp') || line.startsWith('rtsp'))) {
      currentData.url = line;
      
      if (currentData.url && currentData.name !== undefined) {
        const channel = parseChannel(currentData as ParsedChannel, header.urlTvg);
        channels.push(channel);
      }
      
      currentData = null;
    }
  }
  
  const categories = extractCategories(channels);
  
  return {
    id: generateChannelId(sourceName, Date.now().toString()),
    name: sourceName,
    source: 'file',
    channels,
    categories,
    addedAt: Date.now(),
  };
}

/**
 * Parse un fichier M3U depuis une URL
 */
export async function parseM3UFromUrl(url: string, name?: string): Promise<Playlist> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const content = await response.text();
    const playlist = parseM3U(content, name || extractNameFromUrl(url));
    playlist.source = 'url';
    
    return playlist;
  } catch (error) {
    throw new Error(`Impossible de charger la playlist: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}

/**
 * Parse un fichier M3U local (File API)
 */
export async function parseM3UFromFile(file: File): Promise<Playlist> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const playlist = parseM3U(content, file.name.replace(/\.(m3u8?|txt)$/i, ''));
        resolve(playlist);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Extrait un nom lisible depuis une URL
 */
function extractNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const filename = pathParts.pop() || urlObj.hostname;
    return filename.replace(/\.(m3u8?|txt)$/i, '') || 'Playlist';
  } catch {
    return 'Playlist';
  }
}

/**
 * Valide si le contenu ressemble à un fichier M3U
 */
export function isValidM3U(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.startsWith('#EXTM3U') || trimmed.includes('#EXTINF:');
}

/**
 * Fusionne plusieurs playlists en une seule
 */
export function mergePlaylists(playlists: Playlist[], name: string = 'Playlist fusionnée'): Playlist {
  const allChannels: Channel[] = [];
  const seenUrls = new Set<string>();
  
  for (const playlist of playlists) {
    for (const channel of playlist.channels) {
      if (!seenUrls.has(channel.url)) {
        seenUrls.add(channel.url);
        allChannels.push(channel);
      }
    }
  }
  
  return {
    id: generateChannelId(name, Date.now().toString()),
    name,
    source: 'file',
    channels: allChannels,
    categories: extractCategories(allChannels),
    addedAt: Date.now(),
  };
}

