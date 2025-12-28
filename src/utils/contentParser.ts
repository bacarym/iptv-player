import { ContentMetadata, Quality, COUNTRIES } from '../types/preferences.types';

// Patterns pour extraire les métadonnées
const COUNTRY_PATTERNS: Record<string, RegExp> = {
  FR: /\b(FR|FRANCE|FRENCH)\b/i,
  BE: /\b(BE|BELGIUM|BELGE)\b/i,
  CH: /\b(CH|SUISSE|SWISS)\b/i,
  CA: /\b(CA|CANADA|CANADIAN)\b/i,
  US: /\b(US|USA|AMERICAN|ENGLISH)\b/i,
  UK: /\b(UK|GB|BRITISH)\b/i,
  ES: /\b(ES|SPAIN|SPANISH|ESPANA)\b/i,
  IT: /\b(IT|ITALY|ITALIAN|ITALIA)\b/i,
  DE: /\b(DE|GERMANY|GERMAN|DEUTSCH)\b/i,
  PT: /\b(PT|PORTUGAL|PORTUGUESE)\b/i,
  AR: /\b(AR|ARAB|ARABIC|ARABE)\b/i,
  TR: /\b(TR|TURKEY|TURKISH|TURK)\b/i,
  NL: /\b(NL|NETHERLANDS|DUTCH)\b/i,
  PL: /\b(PL|POLAND|POLISH)\b/i,
  RO: /\b(RO|ROMANIA|ROMANIAN)\b/i,
  RU: /\b(RU|RUSSIA|RUSSIAN)\b/i,
  IN: /\b(IN|INDIA|INDIAN|HINDI)\b/i,
  BR: /\b(BR|BRAZIL|BRAZILIAN)\b/i,
  MX: /\b(MX|MEXICO|MEXICAN)\b/i,
  JP: /\b(JP|JAPAN|JAPANESE)\b/i,
  KR: /\b(KR|KOREA|KOREAN)\b/i,
  CN: /\b(CN|CHINA|CHINESE)\b/i,
};

const QUALITY_PATTERNS: { quality: Quality; pattern: RegExp }[] = [
  { quality: '4K', pattern: /\b(4K|UHD|2160p)\b/i },
  { quality: 'FHD', pattern: /\b(FHD|1080p|FULLHD|FULL HD)\b/i },
  { quality: 'HD', pattern: /\b(HD|720p)\b(?!\s*$)/i },
  { quality: 'SD', pattern: /\b(SD|480p|LQ)\b/i },
];

const LANGUAGE_PATTERNS: { lang: string; pattern: RegExp }[] = [
  { lang: 'MULTI', pattern: /\b(MULTI|MULTi)\b/i },
  { lang: 'VFF', pattern: /\b(VFF|FRENCH)\b/i },
  { lang: 'VF', pattern: /\bVF\b/i },
  { lang: 'TRUEFRENCH', pattern: /\b(TRUEFRENCH|TRUE FRENCH)\b/i },
  { lang: 'VOSTFR', pattern: /\b(VOSTFR|STFR)\b/i },
  { lang: 'VO', pattern: /\bVO\b/i },
];

const YEAR_PATTERN = /\(?(19|20)\d{2}\)?/;
const SEASON_EPISODE_PATTERN = /S(\d{1,2})(?:E(\d{1,2}))?/i;
const SEASON_PATTERN = /\bS(?:AISON|EASON)?\s*(\d{1,2})\b/i;

/**
 * Extrait les métadonnées d'un nom de contenu
 */
export function parseContentMetadata(name: string): ContentMetadata {
  let cleanName = name;
  
  // Extraire le pays (souvent au début: "FR: TF1" ou "FR | TF1")
  let country: string | undefined;
  const countryPrefixMatch = name.match(/^([A-Z]{2})\s*[:\-|]\s*/i);
  if (countryPrefixMatch) {
    const prefix = countryPrefixMatch[1].toUpperCase();
    if (COUNTRIES[prefix]) {
      country = prefix;
      cleanName = cleanName.replace(countryPrefixMatch[0], '').trim();
    }
  }
  
  // Si pas trouvé au début, chercher dans le nom
  if (!country) {
    for (const [code, pattern] of Object.entries(COUNTRY_PATTERNS)) {
      if (pattern.test(name)) {
        country = code;
        break;
      }
    }
  }
  
  // Extraire la qualité
  let quality: Quality | undefined;
  for (const { quality: q, pattern } of QUALITY_PATTERNS) {
    if (pattern.test(name)) {
      quality = q;
      cleanName = cleanName.replace(pattern, '').trim();
      break;
    }
  }
  
  // Extraire la langue
  let language: string | undefined;
  for (const { lang, pattern } of LANGUAGE_PATTERNS) {
    if (pattern.test(name)) {
      language = lang;
      cleanName = cleanName.replace(pattern, '').trim();
      break;
    }
  }
  
  // Extraire l'année
  let year: number | undefined;
  const yearMatch = name.match(YEAR_PATTERN);
  if (yearMatch) {
    year = parseInt(yearMatch[0].replace(/[()]/g, ''), 10);
    cleanName = cleanName.replace(YEAR_PATTERN, '').trim();
  }
  
  // Extraire saison/épisode
  let season: number | undefined;
  let episode: number | undefined;
  const seMatch = name.match(SEASON_EPISODE_PATTERN);
  if (seMatch) {
    season = parseInt(seMatch[1], 10);
    episode = seMatch[2] ? parseInt(seMatch[2], 10) : undefined;
    cleanName = cleanName.replace(SEASON_EPISODE_PATTERN, '').trim();
  } else {
    const sMatch = name.match(SEASON_PATTERN);
    if (sMatch) {
      season = parseInt(sMatch[1], 10);
      cleanName = cleanName.replace(SEASON_PATTERN, '').trim();
    }
  }
  
  // Nettoyer le nom final
  cleanName = cleanName
    .replace(/[:\-|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\s*\(\s*\)\s*/g, '')
    .trim();
  
  return {
    cleanName: cleanName || name,
    country,
    language,
    quality,
    year,
    season,
    episode,
  };
}

/**
 * Génère une clé unique pour le regroupement
 */
export function getContentKey(name: string, type: 'channel' | 'movie' | 'series'): string {
  const meta = parseContentMetadata(name);
  
  if (type === 'channel') {
    // Pour les chaînes: nom nettoyé + pays
    return `${meta.cleanName.toLowerCase()}_${meta.country || 'unknown'}`;
  } else if (type === 'series') {
    // Pour les séries: nom + saison (pas épisode pour regrouper par saison)
    return `${meta.cleanName.toLowerCase()}_s${meta.season || 0}`;
  } else {
    // Pour les films: nom + année
    return `${meta.cleanName.toLowerCase()}_${meta.year || 0}`;
  }
}

/**
 * Extrait les pays uniques d'une liste de chaînes
 */
export function extractUniqueCountries(names: string[]): string[] {
  const countries = new Set<string>();
  
  for (const name of names) {
    const meta = parseContentMetadata(name);
    if (meta.country) {
      countries.add(meta.country);
    }
  }
  
  return Array.from(countries).sort();
}

/**
 * Extrait les langues uniques d'une liste de contenus
 */
export function extractUniqueLanguages(names: string[]): string[] {
  const languages = new Set<string>();
  
  for (const name of names) {
    const meta = parseContentMetadata(name);
    if (meta.language) {
      languages.add(meta.language);
    }
  }
  
  return Array.from(languages);
}

/**
 * Extrait les catégories uniques
 */
export function extractUniqueCategories(groups: (string | undefined)[]): string[] {
  const categories = new Set<string>();
  
  for (const group of groups) {
    if (group) {
      // Nettoyer le nom de la catégorie
      const clean = group
        .replace(/^\|?\s*/, '')
        .replace(/\s*\|?\s*$/, '')
        .trim();
      if (clean) {
        categories.add(clean);
      }
    }
  }
  
  return Array.from(categories).sort();
}

/**
 * Sélectionne la meilleure qualité disponible selon les préférences
 */
export function selectBestQuality(
  variants: { quality?: Quality }[],
  preferredQuality: Quality
): number {
  const qualityOrder: Quality[] = ['4K', 'FHD', 'HD', 'SD'];
  const preferredIndex = qualityOrder.indexOf(preferredQuality);
  
  // Trier les variants par qualité
  const sortedIndices = variants
    .map((v, i) => ({ index: i, quality: v.quality }))
    .sort((a, b) => {
      const aIdx = a.quality ? qualityOrder.indexOf(a.quality) : 999;
      const bIdx = b.quality ? qualityOrder.indexOf(b.quality) : 999;
      return aIdx - bIdx;
    });
  
  // Chercher la qualité préférée ou la plus proche inférieure
  for (const { index, quality } of sortedIndices) {
    const idx = quality ? qualityOrder.indexOf(quality) : 999;
    if (idx >= preferredIndex) {
      return index;
    }
  }
  
  // Fallback: première disponible
  return sortedIndices[0]?.index ?? 0;
}

