import { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Channel } from '../types/channel.types';

interface VideoPlayerProps {
  channel: Channel | null;
  onClose?: () => void;
  onChannelChange?: (direction: 'prev' | 'next') => void;
  autoplay?: boolean;
}

export default function VideoPlayer({ channel, onClose, onChannelChange, autoplay = true }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUI, setShowUI] = useState(true);

  const destroyHls = useCallback(() => {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
  }, []);

  useEffect(() => {
    if (!channel || !videoRef.current) return;
    setLoading(true);
    setError(null);
    destroyHls();

    const video = videoRef.current;
    const isHls = channel.url.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(channel.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        if (autoplay) video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else { setError('Flux indisponible'); destroyHls(); }
        }
      });
      hlsRef.current = hls;
    } else {
      video.src = channel.url;
      setLoading(false);
      if (autoplay) video.play().catch(() => {});
    }
    return () => destroyHls();
  }, [channel, autoplay, destroyHls]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onCanPlay = () => setLoading(false);
    const onError = () => setError('Erreur de lecture');
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('error', onError);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('error', onError);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (video) video.paused ? video.play().catch(() => {}) : video.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) { video.muted = !video.muted; setMuted(video.muted); }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!containerRef.current) return;
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen error:', err);
    }
  }, []);

  const resetHide = useCallback(() => {
    setShowUI(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { if (playing) setShowUI(false); }, 3000);
  }, [playing]);

  useEffect(() => {
    if (!channel) return;
    const onKey = (e: KeyboardEvent) => {
      resetHide();
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'Escape') onClose?.();
      else if (e.key === 'ArrowLeft') onChannelChange?.('prev');
      else if (e.key === 'ArrowRight') onChannelChange?.('next');
      else if (e.key === 'f') toggleFullscreen();
      else if (e.key === 'm') toggleMute();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [channel, togglePlay, onClose, onChannelChange, toggleFullscreen, toggleMute, resetHide]);

  useEffect(() => {
    document.addEventListener('mousemove', resetHide);
    return () => document.removeEventListener('mousemove', resetHide);
  }, [resetHide]);

  if (!channel) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#000' 
      }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Sélectionnez une chaîne</p>
      </div>
    );
  }

  const btnStyle: React.CSSProperties = {
    width: 42,
    height: 42,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }} onMouseMove={resetHide} onClick={togglePlay}>
      <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'contain' }} playsInline autoPlay={autoplay} />

      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.9)' }}>
          <div style={{ width: 32, height: 32, border: '2px solid rgba(249,115,22,0.3)', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.95)' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 20, fontSize: 14 }}>{error}</p>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose?.(); }} 
            style={{ 
              padding: '12px 28px', 
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', 
              color: '#000', 
              border: 'none', 
              fontWeight: 600, 
              fontSize: 12,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            Retour
          </button>
        </div>
      )}

      {/* UI */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: showUI ? 1 : 0,
          pointerEvents: showUI ? 'auto' : 'none',
          transition: 'opacity 0.3s ease'
        }}
      >
        {/* Top */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)'
        }}>
          <button onClick={onClose} style={btnStyle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' }}>{channel.name}</h2>
            {channel.group && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{channel.group}</p>}
          </div>
        </div>

        {/* Bottom */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)'
        }}>
          <button 
            onClick={togglePlay} 
            style={{ 
              ...btnStyle, 
              width: 50, 
              height: 50, 
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              border: 'none'
            }}
          >
            {playing ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#000"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#000" style={{ marginLeft: 2 }}><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>

          <button onClick={() => onChannelChange?.('prev')} style={btnStyle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button onClick={() => onChannelChange?.('next')} style={btnStyle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>

          <button onClick={toggleMute} style={btnStyle}>
            {muted ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5 6 9H2v6h4l5 4V5ZM22 9l-6 6M16 9l6 6"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5 6 9H2v6h4l5 4V5ZM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            )}
          </button>

          <div style={{ flex: 1 }} />

          <button 
            onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} 
            style={btnStyle}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
