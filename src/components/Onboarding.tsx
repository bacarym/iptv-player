import { useState, useMemo, useEffect, useRef } from 'react';
import { Channel } from '../types/channel.types';
import { UserPreferences, COUNTRIES, Quality } from '../types/preferences.types';
import { extractUniqueCountries, extractUniqueCategories } from '../utils/contentParser';

interface OnboardingProps {
  channels: Channel[];
  onComplete: (preferences: UserPreferences) => void;
  onSkip: () => void;
}

const CATEGORY_MAPPING: Record<string, string> = {
  'sport': 'Sport', 'sports': 'Sport', 'foot': 'Sport', 'football': 'Sport',
  'news': 'Actualités', 'info': 'Actualités', 'information': 'Actualités',
  'divertissement': 'Divertissement', 'entertainment': 'Divertissement',
  'general': 'Généraliste', 'generaliste': 'Généraliste',
  'enfant': 'Enfants', 'enfants': 'Enfants', 'kids': 'Enfants', 'jeunesse': 'Enfants',
  'cinema': 'Cinéma', 'film': 'Cinéma', 'films': 'Cinéma', 'movie': 'Cinéma',
  'serie': 'Séries', 'series': 'Séries',
  'documentaire': 'Documentaires', 'documentary': 'Documentaires', 'doc': 'Documentaires',
  'music': 'Musique', 'musique': 'Musique',
  'culture': 'Culture', 'decouverte': 'Découverte',
};

const STANDARD_CATEGORIES = ['Sport', 'Actualités', 'Divertissement', 'Généraliste', 'Enfants', 'Cinéma', 'Séries', 'Documentaires', 'Musique'];

function normalizeCategory(raw: string): string | null {
  const lower = raw.toLowerCase();
  for (const [key, value] of Object.entries(CATEGORY_MAPPING)) {
    if (lower.includes(key)) return value;
  }
  return null;
}

type Step = 'tv-country' | 'tv-categories' | 'tv-quality' | 'movies-language' | 'movies-categories' | 'series-language' | 'series-categories';

export default function Onboarding({ channels, onComplete, onSkip }: OnboardingProps) {
  const [step, setStep] = useState<Step>('tv-country');
  const [showAllCountries, setShowAllCountries] = useState(false);
  
  const [tvCountry, setTvCountry] = useState<string>('FR');
  const [tvCategories, setTvCategories] = useState<string[]>([]);
  const [tvQuality, setTvQuality] = useState<Quality>('FHD');
  const [movieLanguage, setMovieLanguage] = useState<string | null>(null);
  const [movieCategories, setMovieCategories] = useState<string[]>([]);
  const [seriesLanguage, setSeriesLanguage] = useState<string | null>(null);
  const [seriesCategories, setSeriesCategories] = useState<string[]>([]);

  const liveChannels = useMemo(() => channels.filter(ch => ch.isLive), [channels]);
  const vodChannels = useMemo(() => channels.filter(ch => !ch.isLive && ch.streamType === 'vod'), [channels]);
  const seriesChannels = useMemo(() => channels.filter(ch => !ch.isLive && ch.streamType === 'series'), [channels]);

  const availableCountries = useMemo(() => extractUniqueCountries(liveChannels.map(ch => ch.name)), [liveChannels]);

  const tvCategoriesForCountry = useMemo(() => {
    if (!tvCountry) return STANDARD_CATEGORIES.slice(0, 6);
    const countryChannels = liveChannels.filter(ch => {
      const name = ch.name.toUpperCase();
      return name.startsWith(tvCountry + ':') || name.startsWith(tvCountry + ' ') || name.includes('|' + tvCountry) || name.includes(tvCountry + '|');
    });
    const rawCategories = extractUniqueCategories(countryChannels.map(ch => ch.group));
    const normalized = new Set<string>();
    rawCategories.forEach(cat => { const norm = normalizeCategory(cat); if (norm) normalized.add(norm); });
    const result = STANDARD_CATEGORIES.filter(cat => normalized.has(cat));
    return result.length > 0 ? result : STANDARD_CATEGORIES.slice(0, 6);
  }, [tvCountry, liveChannels]);

  const movieLanguages = useMemo(() => {
    const langs = new Set<string>();
    vodChannels.forEach(ch => {
      const name = ch.name.toUpperCase();
      if (name.includes('MULTI')) langs.add('MULTI');
      if (name.includes('VF') || name.includes('FRENCH')) langs.add('VF');
      if (name.includes('VOSTFR')) langs.add('VOSTFR');
      if (name.includes('VO')) langs.add('VO');
    });
    return Array.from(langs);
  }, [vodChannels]);

  const movieCategoriesAvailable = useMemo(() => {
    const rawCategories = extractUniqueCategories(vodChannels.map(ch => ch.group));
    const normalized = new Set<string>();
    rawCategories.forEach(cat => { const norm = normalizeCategory(cat); if (norm) normalized.add(norm); });
    const result = STANDARD_CATEGORIES.filter(cat => normalized.has(cat));
    return result.length > 0 ? result : ['Cinéma', 'Documentaires'];
  }, [vodChannels]);

  const seriesLanguages = useMemo(() => {
    const langs = new Set<string>();
    seriesChannels.forEach(ch => {
      const name = ch.name.toUpperCase();
      if (name.includes('MULTI')) langs.add('MULTI');
      if (name.includes('VF') || name.includes('FRENCH')) langs.add('VF');
      if (name.includes('VOSTFR')) langs.add('VOSTFR');
      if (name.includes('VO')) langs.add('VO');
    });
    return Array.from(langs);
  }, [seriesChannels]);

  const seriesCategoriesAvailable = useMemo(() => {
    const rawCategories = extractUniqueCategories(seriesChannels.map(ch => ch.group));
    const normalized = new Set<string>();
    rawCategories.forEach(cat => { const norm = normalizeCategory(cat); if (norm) normalized.add(norm); });
    const result = STANDARD_CATEGORIES.filter(cat => normalized.has(cat));
    return result.length > 0 ? result : ['Séries', 'Documentaires'];
  }, [seriesChannels]);

  const handleComplete = () => {
    onComplete({
      onboardingCompleted: true,
      channels: { countries: [tvCountry], categories: tvCategories, defaultQuality: tvQuality },
      movies: { preferredLanguage: movieLanguage || 'MULTI', subtitleLanguage: 'FR', categories: movieCategories },
      series: { preferredLanguage: seriesLanguage || 'MULTI', subtitleLanguage: 'FR', categories: seriesCategories },
    });
  };

  const nextStep = () => {
    const flow: Step[] = ['tv-country', 'tv-categories', 'tv-quality'];
    if (vodChannels.length > 0) flow.push('movies-language', 'movies-categories');
    if (seriesChannels.length > 0) flow.push('series-language', 'series-categories');
    const idx = flow.indexOf(step);
    if (idx < flow.length - 1) setStep(flow[idx + 1]);
    else handleComplete();
  };

  const canContinue = () => {
    if (step === 'tv-country') return tvCountry !== '';
    if (step === 'movies-language') return movieLanguage !== null;
    if (step === 'series-language') return seriesLanguage !== null;
    return true;
  };

  const getStepInfo = (): { section: string; title: string; subtitle: string } => {
    const info: Record<Step, { section: string; title: string; subtitle: string }> = {
      'tv-country': { section: 'TV', title: 'Votre pays', subtitle: 'Sélectionnez votre pays' },
      'tv-categories': { section: 'TV', title: 'Catégories', subtitle: 'Quels contenus vous intéressent ?' },
      'tv-quality': { section: 'TV', title: 'Qualité', subtitle: 'Qualité vidéo par défaut' },
      'movies-language': { section: 'Films', title: 'Langue', subtitle: 'Langue préférée pour les films' },
      'movies-categories': { section: 'Films', title: 'Genres', subtitle: 'Vos genres préférés' },
      'series-language': { section: 'Séries', title: 'Langue', subtitle: 'Langue préférée pour les séries' },
      'series-categories': { section: 'Séries', title: 'Genres', subtitle: 'Vos genres préférés' },
    };
    return info[step];
  };

  const totalSteps = 3 + (vodChannels.length > 0 ? 2 : 0) + (seriesChannels.length > 0 ? 2 : 0);
  const currentStep = ['tv-country', 'tv-categories', 'tv-quality', 'movies-language', 'movies-categories', 'series-language', 'series-categories'].indexOf(step) + 1;
  const info = getStepInfo();

  const firstButtonRef = useRef<HTMLButtonElement>(null);
  
  // Auto-focus first button when step changes
  useEffect(() => {
    setTimeout(() => firstButtonRef.current?.focus(), 100);
  }, [step]);

  const chip = (selected: boolean): React.CSSProperties => ({
    padding: '10px 18px',
    background: selected ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : 'transparent',
    color: selected ? '#000' : 'rgba(255,255,255,0.5)',
    border: `1px solid ${selected ? '#f97316' : 'rgba(255,255,255,0.1)'}`,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    outline: 'none',
  });

  const card = (selected: boolean): React.CSSProperties => ({
    padding: '14px 20px',
    background: selected ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : 'rgba(255,255,255,0.03)',
    color: selected ? '#000' : '#fff',
    border: `1px solid ${selected ? '#f97316' : 'rgba(255,255,255,0.06)'}`,
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'left' as const,
    outline: 'none',
  });

  const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
    e.currentTarget.style.outline = '2px solid rgba(255,255,255,0.5)';
    e.currentTarget.style.outlineOffset = '2px';
  };
  
  const handleBlur = (e: React.FocusEvent<HTMLButtonElement>) => {
    e.currentTarget.style.outline = 'none';
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(180deg, #0a0a0c 0%, #08080a 100%)', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#f97316', fontSize: 13, fontWeight: 600 }}>{info.section}</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{currentStep}/{totalSteps}</span>
        </div>
        <button 
          onClick={onSkip} 
          tabIndex={0}
          data-tv-focusable="true"
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', outline: 'none', padding: 8 }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          Passer
        </button>
      </header>

      {/* Progress */}
      <div style={{ height: 2, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)', width: `${(currentStep / totalSteps) * 100}%`, transition: 'width 0.3s' }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '48px 24px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{info.section}</p>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 6, letterSpacing: '-0.02em' }}>{info.title}</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 32 }}>{info.subtitle}</p>

          {/* TV Country */}
          {step === 'tv-country' && !showAllCountries && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                ref={firstButtonRef}
                onClick={() => setTvCountry('FR')}
                tabIndex={0}
                data-tv-focusable="true"
                style={{
                  ...card(tvCountry === 'FR'),
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
                onFocus={handleFocus}
                onBlur={handleBlur}
              >
                <span style={{ fontSize: 20 }}>🇫🇷</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>France</span>
              </button>
              <button
                onClick={() => setShowAllCountries(true)}
                tabIndex={0}
                data-tv-focusable="true"
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', padding: '12px 0', textAlign: 'left', outline: 'none' }}
                onFocus={handleFocus}
                onBlur={handleBlur}
              >
                Autre pays →
              </button>
            </div>
          )}

          {step === 'tv-country' && showAllCountries && (
            <div>
              <button onClick={() => setShowAllCountries(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', marginBottom: 16 }}>
                ← Retour
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {availableCountries.map(code => {
                  const country = COUNTRIES[code];
                  return (
                    <button
                      key={code}
                      onClick={() => { setTvCountry(code); setShowAllCountries(false); }}
                      style={{
                        ...card(tvCountry === code),
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 12px',
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{country?.flag || '🌍'}</span>
                      <span style={{ fontSize: 12 }}>{country?.name || code}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TV Categories */}
          {step === 'tv-categories' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {tvCategoriesForCountry.map((cat, idx) => (
                <button
                  key={cat}
                  ref={idx === 0 ? firstButtonRef : undefined}
                  onClick={() => setTvCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                  tabIndex={0}
                  data-tv-focusable="true"
                  style={chip(tvCategories.includes(cat))}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* TV Quality */}
          {step === 'tv-quality' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { value: '4K' as Quality, label: '4K Ultra HD' },
                { value: 'FHD' as Quality, label: 'Full HD 1080p' },
                { value: 'HD' as Quality, label: 'HD 720p' },
                { value: 'SD' as Quality, label: 'SD' },
              ].map((q, idx) => (
                <button 
                  key={q.value} 
                  ref={idx === 0 ? firstButtonRef : undefined}
                  onClick={() => setTvQuality(q.value)} 
                  tabIndex={0}
                  data-tv-focusable="true"
                  style={card(tvQuality === q.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                >
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{q.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Movies Language */}
          {step === 'movies-language' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { value: 'MULTI', label: 'Multi', desc: 'Plusieurs langues' },
                { value: 'VF', label: 'VF', desc: 'Version française' },
                { value: 'VOSTFR', label: 'VOSTFR', desc: 'Sous-titres français' },
                { value: 'VO', label: 'VO', desc: 'Version originale' },
              ].filter(l => movieLanguages.length === 0 || movieLanguages.includes(l.value)).map((l, idx) => (
                <button 
                  key={l.value} 
                  ref={idx === 0 ? firstButtonRef : undefined}
                  onClick={() => setMovieLanguage(l.value)} 
                  tabIndex={0}
                  data-tv-focusable="true"
                  style={card(movieLanguage === l.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{l.label}</span>
                    <span style={{ fontSize: 11, color: movieLanguage === l.value ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.4)' }}>{l.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Movies Categories */}
          {step === 'movies-categories' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {movieCategoriesAvailable.map((cat, idx) => (
                <button
                  key={cat}
                  ref={idx === 0 ? firstButtonRef : undefined}
                  onClick={() => setMovieCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                  tabIndex={0}
                  data-tv-focusable="true"
                  style={chip(movieCategories.includes(cat))}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Series Language */}
          {step === 'series-language' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { value: 'MULTI', label: 'Multi', desc: 'Plusieurs langues' },
                { value: 'VF', label: 'VF', desc: 'Version française' },
                { value: 'VOSTFR', label: 'VOSTFR', desc: 'Sous-titres français' },
                { value: 'VO', label: 'VO', desc: 'Version originale' },
              ].filter(l => seriesLanguages.length === 0 || seriesLanguages.includes(l.value)).map((l, idx) => (
                <button 
                  key={l.value} 
                  ref={idx === 0 ? firstButtonRef : undefined}
                  onClick={() => setSeriesLanguage(l.value)} 
                  tabIndex={0}
                  data-tv-focusable="true"
                  style={card(seriesLanguage === l.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{l.label}</span>
                    <span style={{ fontSize: 11, color: seriesLanguage === l.value ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.4)' }}>{l.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Series Categories */}
          {step === 'series-categories' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {seriesCategoriesAvailable.map((cat, idx) => (
                <button
                  key={cat}
                  ref={idx === 0 ? firstButtonRef : undefined}
                  onClick={() => setSeriesCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                  tabIndex={0}
                  data-tv-focusable="true"
                  style={chip(seriesCategories.includes(cat))}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <button
            onClick={nextStep}
            disabled={!canContinue()}
            tabIndex={0}
            data-tv-focusable="true"
            style={{
              width: '100%',
              padding: '14px',
              background: canContinue() ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : 'rgba(255,255,255,0.05)',
              color: canContinue() ? '#000' : 'rgba(255,255,255,0.3)',
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: canContinue() ? 'pointer' : 'default',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              outline: 'none',
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
          >
            Continuer
          </button>
        </div>
      </footer>
    </div>
  );
}
