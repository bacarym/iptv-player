import { useState, useEffect, useMemo } from 'react';
import { Channel } from '../types/channel.types';

interface HeroSectionProps {
  channels: Channel[];
  onPlay: (channel: Channel) => void;
}

// Fonction pour nettoyer les noms de groupe (supprimer emojis, "Multi-lang" et préfixes de langue)
const cleanGroupName = (name: string): string => {
  // Trim d'abord pour éviter les problèmes d'espaces en début
  let cleaned = name.trim();
  // Supprimer les emojis
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '').trim();
  // Supprimer "Multi-lang", "MULTI-LANG", etc.
  cleaned = cleaned.replace(/multi[-\s]?lang(ue)?s?/gi, '').trim();
  // Supprimer les préfixes de langue (2-3 lettres) suivis d'un séparateur non-alphanumérique
  cleaned = cleaned.replace(/^(FR|EN|ES|DE|IT|PT|AR|RU|TR|NL|PL|JP|KR|CN|VOSTFR|VF|VO)\b[^A-Za-z0-9]*/gi, '').trim();
  // Supprimer les pipes et séparateurs au début après le premier nettoyage
  cleaned = cleaned.replace(/^[\|\-:\/\s]+/, '').trim();
  // Supprimer les pipes et barres verticales isolées dans le texte
  cleaned = cleaned.replace(/\s*\|\s*/g, ' ');
  // Nettoyer les espaces multiples
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned || 'Streaming';
};

export default function HeroSection({ channels, onPlay }: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  const featured = useMemo(() => channels.filter(ch => ch.logo).slice(0, 5), [channels]);
  const current = featured[currentIndex];

  useEffect(() => {
    if (featured.length <= 1) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex(i => (i + 1) % featured.length);
        setFade(true);
      }, 300);
    }, 10000);
    return () => clearInterval(interval);
  }, [featured.length]);

  if (!current) {
    return (
      <div style={{ height: '55vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)' }}>Ajoutez une playlist</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '55vh', minHeight: 400 }}>
      {/* BG */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: fade ? 1 : 0,
        transition: 'opacity 0.4s'
      }}>
        {current.logo && (
          <img
            src={current.logo}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)'
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(0deg, #000 0%, transparent 50%)'
        }} />
      </div>

      {/* Content */}
      <div style={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '0 48px 56px',
        maxWidth: 550,
        opacity: fade ? 1 : 0,
        transform: fade ? 'translateY(0)' : 'translateY(8px)',
        transition: 'all 0.4s'
      }}>
        <h1 style={{
          fontSize: 48,
          fontWeight: 600,
          lineHeight: 1.1,
          marginBottom: 16,
          letterSpacing: '-0.02em'
        }}>
          {current.name}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
            {cleanGroupName(current.group || 'Streaming')}
          </span>
          {current.isLive && (
            <span style={{
              padding: '4px 10px',
              background: '#e50914',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.05em'
            }}>
              LIVE
            </span>
          )}
        </div>

        <p style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 14,
          lineHeight: 1.6,
          marginBottom: 28,
          maxWidth: 420
        }}>
          Regardez {current.name} en streaming haute définition.
        </p>

        <button
          onClick={() => onPlay(current)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 32px',
            background: '#fff',
            color: '#000',
            fontSize: 14,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            width: 'fit-content'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#000">
            <path d="M8 5v14l11-7z"/>
          </svg>
          Lecture
        </button>
      </div>

      {/* Dots */}
      {featured.length > 1 && (
        <div style={{
          position: 'absolute',
          right: 48,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
          {featured.map((_, i) => (
            <button
              key={i}
              onClick={() => { setFade(false); setTimeout(() => { setCurrentIndex(i); setFade(true); }, 200); }}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                border: 'none',
                background: i === currentIndex ? '#fff' : 'rgba(255,255,255,0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
