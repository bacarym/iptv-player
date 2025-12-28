import { useState, useCallback, useEffect } from 'react';
import { Playlist, XtreamCredentials } from '../types/channel.types';
import { UserPreferences, COUNTRIES, QUALITIES, LANGUAGES } from '../types/preferences.types';
import { parseM3UFromFile, parseM3UFromUrl } from '../parsers/m3uParser';
import { XtreamAPI, testXtreamConnection } from '../parsers/xtreamApi';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  onAddPlaylist: (playlist: Playlist) => void;
  onRemovePlaylist: (playlistId: string) => void;
  savedCredentials: XtreamCredentials | null;
  onSaveCredentials: (credentials: XtreamCredentials) => void;
  preferences: UserPreferences;
  onUpdatePreferences: (prefs: Partial<UserPreferences>) => void;
  onResetOnboarding: () => void;
}

type Tab = 'playlists' | 'preferences';

export default function Settings({
  isOpen, onClose, playlists, onAddPlaylist, onRemovePlaylist, 
  savedCredentials, onSaveCredentials, preferences, onUpdatePreferences, onResetOnboarding
}: SettingsProps) {
  const [tab, setTab] = useState<Tab>('playlists');
  const [playlistTab, setPlaylistTab] = useState<'m3u' | 'xtream'>('m3u');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [url, setUrl] = useState('');
  const [xUrl, setXUrl] = useState(savedCredentials?.serverUrl || '');
  const [xUser, setXUser] = useState(savedCredentials?.username || '');
  const [xPass, setXPass] = useState(savedCredentials?.password || '');

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    setLoading(true);
    setLoadingText('Lecture du fichier...');
    try {
      const p = await parseM3UFromFile(file);
      setLoadingText(`${p.channels.length} chaînes trouvées`);
      await new Promise(r => setTimeout(r, 500));
      onAddPlaylist(p);
      setMsg({ ok: true, text: `${p.channels.length} chaînes importées` });
    } catch (err) {
      setMsg({ ok: false, text: String(err) });
    } finally {
      setLoading(false);
      setLoadingText('');
      e.target.value = '';
    }
  }, [onAddPlaylist]);

  const handleUrl = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setMsg(null);
    setLoading(true);
    setLoadingText('Téléchargement...');
    try {
      const p = await parseM3UFromUrl(url);
      setLoadingText(`${p.channels.length} chaînes`);
      await new Promise(r => setTimeout(r, 500));
      onAddPlaylist(p);
      setMsg({ ok: true, text: `${p.channels.length} chaînes` });
      setUrl('');
    } catch (err) {
      setMsg({ ok: false, text: String(err) });
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  }, [url, onAddPlaylist]);

  const handleXtream = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!xUrl || !xUser || !xPass) return;
    setMsg(null);
    setLoading(true);
    setLoadingText('Connexion...');
    const creds: XtreamCredentials = { serverUrl: xUrl, username: xUser, password: xPass };
    try {
      const test = await testXtreamConnection(creds);
      if (!test.success) { setMsg({ ok: false, text: test.message }); setLoading(false); return; }
      setLoadingText('Récupération des chaînes...');
      const api = new XtreamAPI(creds);
      const p = await api.loadFullPlaylist({ includeLive: true, includeVod: true });
      setLoadingText(`${p.channels.length} chaînes`);
      await new Promise(r => setTimeout(r, 500));
      onAddPlaylist(p);
      onSaveCredentials(creds);
      setMsg({ ok: true, text: `${p.channels.length} chaînes` });
    } catch (err) {
      setMsg({ ok: false, text: String(err) });
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  }, [xUrl, xUser, xPass, onAddPlaylist, onSaveCredentials]);

  // Navigation TV - Escape pour fermer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        if (document.activeElement?.tagName === 'INPUT') return;
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    background: 'linear-gradient(145deg, #0f0f14 0%, #08080a 100%)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 13,
    outline: 'none'
  };

  const focusStyle = 'outline: 2px solid rgba(255,255,255,0.5); outline-offset: 2px;';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.9)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100
    }}>
      <div style={{
        width: '100%',
        maxWidth: 480,
        maxHeight: '80vh',
        background: 'linear-gradient(145deg, #0f0f14 0%, #08080a 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Loading */}
        {loading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            gap: 12
          }}>
            <div style={{
              width: 32,
              height: 32,
              border: '2px solid rgba(255,255,255,0.1)',
              borderTopColor: 'rgba(255,255,255,0.6)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{loadingText}</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>Paramètres</h2>
          <button 
            onClick={onClose} 
            tabIndex={0}
            data-tv-focusable="true"
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4, outline: 'none' }}
            onFocus={(e) => e.currentTarget.style.cssText = 'background: none; border: none; color: rgba(255,255,255,0.8); cursor: pointer; padding: 4; outline: 2px solid rgba(255,255,255,0.5);'}
            onBlur={(e) => e.currentTarget.style.cssText = 'background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; padding: 4; outline: none;'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { id: 'playlists' as Tab, label: 'Playlists' },
            { id: 'preferences' as Tab, label: 'Préférences' },
          ].map((t, idx) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setMsg(null); }}
              autoFocus={idx === 0}
              tabIndex={0}
              data-tv-focusable="true"
              style={{
                flex: 1,
                padding: '14px',
                background: 'none',
                border: 'none',
                borderBottom: tab === t.id ? '2px solid rgba(255,255,255,0.5)' : '2px solid transparent',
                color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.4)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onFocus={(e) => e.currentTarget.style.outline = '2px solid rgba(255,255,255,0.5)'}
              onBlur={(e) => e.currentTarget.style.outline = 'none'}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {msg && (
            <div style={{
              marginBottom: 16,
              padding: 12,
              background: msg.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              color: msg.ok ? '#22c55e' : '#ef4444',
              fontSize: 12,
              border: `1px solid ${msg.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
            }}>
              {msg.text}
            </div>
          )}

          {/* Playlists Tab */}
          {tab === 'playlists' && (
            <div>
              {/* Sub tabs */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {['m3u', 'xtream'].map(t => (
                  <button
                    key={t}
                    onClick={() => setPlaylistTab(t as 'm3u' | 'xtream')}
                    tabIndex={0}
                    data-tv-focusable="true"
                    style={{
                      padding: '8px 18px',
                      background: playlistTab === t ? 'rgba(255,255,255,0.1)' : 'transparent',
                      border: '1px solid',
                      borderColor: playlistTab === t ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                      color: playlistTab === t ? '#fff' : 'rgba(255,255,255,0.5)',
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.currentTarget.style.outline = '2px solid rgba(255,255,255,0.5)'}
                    onBlur={(e) => e.currentTarget.style.outline = 'none'}
                  >
                    {t === 'm3u' ? 'M3U' : 'Xtream'}
                  </button>
                ))}
              </div>

              {playlistTab === 'm3u' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: 20,
                    border: '1px dashed rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: 12,
                    transition: 'all 0.2s ease'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                    </svg>
                    Importer fichier
                    <input type="file" accept=".m3u,.m3u8,.txt" onChange={handleFile} style={{ display: 'none' }} />
                  </label>

                  <form onSubmit={handleUrl} style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="URL playlist"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button type="submit" disabled={!url} style={{
                      padding: '12px 20px',
                      background: url ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : 'rgba(255,255,255,0.05)',
                      color: url ? '#000' : 'rgba(255,255,255,0.3)',
                      border: 'none',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: url ? 'pointer' : 'default'
                    }}>
                      OK
                    </button>
                  </form>
                </div>
              )}

              {playlistTab === 'xtream' && (
                <form onSubmit={handleXtream} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input type="text" value={xUrl} onChange={(e) => setXUrl(e.target.value)} placeholder="http://server:port" style={inputStyle} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input type="text" value={xUser} onChange={(e) => setXUser(e.target.value)} placeholder="Username" style={inputStyle} />
                    <input type="password" value={xPass} onChange={(e) => setXPass(e.target.value)} placeholder="Password" style={inputStyle} />
                  </div>
                  <button type="submit" disabled={!xUrl || !xUser || !xPass} style={{
                    padding: '14px',
                    background: xUrl && xUser && xPass ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : 'rgba(255,255,255,0.05)',
                    color: xUrl && xUser && xPass ? '#000' : 'rgba(255,255,255,0.3)',
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: xUrl && xUser && xPass ? 'pointer' : 'default',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Connexion
                  </button>
                </form>
              )}

              {/* Saved playlists */}
              {playlists.length > 0 && (
                <div style={{ marginTop: 28 }}>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Playlists enregistrées</p>
                  {playlists.map(p => (
                    <div key={p.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      marginBottom: 8
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{p.channels.length} chaînes</p>
                      </div>
                      <button onClick={() => onRemovePlaylist(p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preferences Tab */}
          {tab === 'preferences' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {/* TV */}
              <div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Préférences</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 13 }}>Pays TV</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                      {preferences.channels.countries.map(c => COUNTRIES[c]?.flag || c).join(' ') || 'Tous'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 13 }}>Qualité</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{preferences.channels.defaultQuality}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 13 }}>Langue Films</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{preferences.movies.preferredLanguage}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 13 }}>Langue Séries</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{preferences.series.preferredLanguage}</span>
                  </div>
                </div>
              </div>

              {/* Reset */}
              <button
                onClick={onResetOnboarding}
                style={{
                  padding: '14px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                Reconfigurer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
