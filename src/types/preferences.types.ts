export type Quality = '4K' | 'FHD' | 'HD' | 'SD' | 'auto';
export type Language = 'MULTI' | 'VF' | 'VOSTFR' | 'VO' | 'VFF' | 'TRUEFRENCH';
export type SubtitleLanguage = 'FR' | 'EN' | 'none';

export interface ChannelPreferences {
  countries: string[];
  categories: string[];
  defaultQuality: Quality;
}

export interface MoviePreferences {
  preferredLanguage: Language | string;
  subtitleLanguage: SubtitleLanguage;
  categories: string[];
}

export interface SeriesPreferences {
  preferredLanguage: Language | string;
  subtitleLanguage: SubtitleLanguage;
  categories: string[];
}

export interface UserPreferences {
  onboardingCompleted: boolean;
  channels: ChannelPreferences;
  movies: MoviePreferences;
  series: SeriesPreferences;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  onboardingCompleted: false,
  channels: {
    countries: [],
    categories: [],
    defaultQuality: 'FHD',
  },
  movies: {
    preferredLanguage: 'MULTI',
    subtitleLanguage: 'FR',
    categories: [],
  },
  series: {
    preferredLanguage: 'MULTI',
    subtitleLanguage: 'FR',
    categories: [],
  },
};

// Métadonnées extraites d'un contenu
export interface ContentMetadata {
  cleanName: string;
  country?: string;
  language?: string;
  quality?: Quality;
  year?: number;
  season?: number;
  episode?: number;
}

// Contenu dédupliqué
export interface DeduplicatedContent {
  id: string;
  name: string;
  logo?: string;
  group?: string;
  type: 'channel' | 'movie' | 'series';
  metadata: ContentMetadata;
  variants: ContentVariant[];
}

export interface ContentVariant {
  id: string;
  url: string;
  quality?: Quality;
  language?: string;
}

// Pays supportés
export const COUNTRIES: Record<string, { name: string; flag: string }> = {
  FR: { name: 'France', flag: '🇫🇷' },
  BE: { name: 'Belgique', flag: '🇧🇪' },
  CH: { name: 'Suisse', flag: '🇨🇭' },
  CA: { name: 'Canada', flag: '🇨🇦' },
  US: { name: 'États-Unis', flag: '🇺🇸' },
  UK: { name: 'Royaume-Uni', flag: '🇬🇧' },
  ES: { name: 'Espagne', flag: '🇪🇸' },
  IT: { name: 'Italie', flag: '🇮🇹' },
  DE: { name: 'Allemagne', flag: '🇩🇪' },
  PT: { name: 'Portugal', flag: '🇵🇹' },
  AR: { name: 'Arabe', flag: '🇸🇦' },
  TR: { name: 'Turquie', flag: '🇹🇷' },
  NL: { name: 'Pays-Bas', flag: '🇳🇱' },
  PL: { name: 'Pologne', flag: '🇵🇱' },
  RO: { name: 'Roumanie', flag: '🇷🇴' },
  RU: { name: 'Russie', flag: '🇷🇺' },
  IN: { name: 'Inde', flag: '🇮🇳' },
  BR: { name: 'Brésil', flag: '🇧🇷' },
  MX: { name: 'Mexique', flag: '🇲🇽' },
  JP: { name: 'Japon', flag: '🇯🇵' },
  KR: { name: 'Corée', flag: '🇰🇷' },
  CN: { name: 'Chine', flag: '🇨🇳' },
};

// Qualités disponibles
export const QUALITIES: { value: Quality; label: string }[] = [
  { value: '4K', label: '4K Ultra HD' },
  { value: 'FHD', label: 'Full HD (1080p)' },
  { value: 'HD', label: 'HD (720p)' },
  { value: 'SD', label: 'SD (480p)' },
];

// Langues disponibles
export const LANGUAGES: { value: string; label: string }[] = [
  { value: 'MULTI', label: 'Multi-langues' },
  { value: 'VF', label: 'Version Française' },
  { value: 'VFF', label: 'VF (France)' },
  { value: 'TRUEFRENCH', label: 'True French' },
  { value: 'VOSTFR', label: 'VOST Français' },
  { value: 'VO', label: 'Version Originale' },
];

