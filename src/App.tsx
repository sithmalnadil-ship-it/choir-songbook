import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CalendarDays, ChevronLeft, ChevronDown, ChevronRight, CloudOff, Download, Heart, ListMusic, Music2, Minus, Play, Plus, RefreshCw, RotateCcw, Search, Settings, Trash2, X } from 'lucide-react';
import { songbookDb } from './db/songbookDb';
import { transposeSingleChord } from './music/transposer';
import { ChordLineSegment, Preferences, Setlist, Song, SongLine } from './types/song';

type Tab = 'library' | 'setlists' | 'settings';
type AppRoute = { view: 'tab'; tab: Tab } | { view: 'song'; tab: Tab; songId: string } | { view: 'performance'; tab: 'setlists'; setlistId: string; index: number };
type ThemeMode = 'system' | 'light' | 'dark';
type ScreenWakeLockSentinel = { release: () => Promise<void>; addEventListener: (type: 'release', listener: () => void) => void };
type ScreenWakeLockNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<ScreenWakeLockSentinel> } };
const THEME_MODE_STORAGE_KEY = 'choir-songbook-theme-mode';
function readThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_MODE_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch { return 'system'; }
}
const routeHash = (route: AppRoute) => route.view === 'song' ? `#/song/${encodeURIComponent(route.songId)}` : route.view === 'performance' ? `#/performance/${encodeURIComponent(route.setlistId)}/${route.index}` : `#/${route.tab}`;
function routeFromLocation(): AppRoute {
  const hash = window.location.hash;
  const song = hash.match(/^#\/song\/(.+)$/);
  if (song) return { view: 'song', tab: 'library', songId: decodeURIComponent(song[1]) };
  const performance = hash.match(/^#\/performance\/([^/]+)\/(\d+)$/);
  if (performance) return { view: 'performance', tab: 'setlists', setlistId: decodeURIComponent(performance[1]), index: Number(performance[2]) };
  const tab = hash.match(/^#\/(library|setlists|settings)$/)?.[1] as Tab | undefined;
  return { view: 'tab', tab: tab ?? 'library' };
}
function storedRoute() { return (window.history.state?.choirSongbook as AppRoute | undefined) ?? routeFromLocation(); }
const majorKeys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const keys = [...majorKeys, ...majorKeys.map(key => `${key}m`)];
const keyRoot = (key: string) => key.endsWith('m') ? key.slice(0, -1) : key;
const keyOffset = (from: string, to: string) => (majorKeys.indexOf(keyRoot(to)) - majorKeys.indexOf(keyRoot(from)) + 12) % 12;
const transposeKey = (key: string, semitones: number) => {
  const rootIndex = majorKeys.indexOf(keyRoot(key));
  if (rootIndex < 0) return key;
  const minor = key.endsWith('m');
  return `${majorKeys[(rootIndex + semitones + 12) % 12]}${minor ? 'm' : ''}`;
};
const transposeChordLine = (line: string, semitones: number, useFlats: boolean) => line.replace(/[A-G][#b]?(?:maj|min|dim|aug|sus|add|m)?\d*/g, chord => transposeSingleChord(chord, semitones, useFlats));
const songLineParts = (line: SongLine): ChordLineSegment[] => Array.isArray(line) ? line : [{ chord: line.chords, text: line.text }];
const chordQuality = (chord: string): 'major' | 'minor' | 'extended' => {
  const quality = chord.replace(/^[A-G][#b]?/, '').split('/')[0];
  if (/\d|sus|dim|aug|add/i.test(quality)) return 'extended';
  if (/^(?:m(?!aj)|min)/i.test(quality)) return 'minor';
  return 'major';
};
const defaultPreferences: Preferences = { favorites: ['H-01'], readerFontSize: 20, useFlats: false, theme: 'pitch-black', showChords: true, autoScroll: false, autoScrollSpeed: 2 };
const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
function Pill({ children }: { children: React.ReactNode }) { return <span className="pill">{children}</span>; }
function Toggle({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: () => void; label: string; disabled?: boolean }) { return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`ios-toggle${checked ? ' is-on' : ''}`} onClick={onChange} disabled={disabled}><span className="ios-toggle-knob" /></button>; }

function SongReader({ song, targetKey, fontSize, useFlats, showChords, onBack, onKey, performance, position, onPrevious, onNext, autoScroll = false, autoScrollSpeed = 2 }: { song: Song; targetKey: string; fontSize: number; useFlats: boolean; showChords: boolean; onBack: () => void; onKey: (key: string) => void; performance?: boolean; position?: string; onPrevious?: () => void; onNext?: () => void; autoScroll?: boolean; autoScrollSpeed?: number }) {
  const offset = keyOffset(song.originalKey, targetKey);
  const currentKey = targetKey;
  const [displayFontSize, setDisplayFontSize] = useState(fontSize);
  const [keyMenuOpen, setKeyMenuOpen] = useState(false);
  const keySelectRef = useRef<HTMLSpanElement>(null);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const frameRef = useRef<number | null>(null);
  useEffect(() => { window.scrollTo(0, 0); setHidden(false); }, [song.id]);
  useEffect(() => {
    lastScrollY.current = Math.max(0, window.scrollY);
    const onScroll = () => {
      const currentY = Math.max(0, window.scrollY);
      const delta = currentY - lastScrollY.current;
      if (currentY <= 40 || delta < 0) setHidden(false);
      else if (currentY > 40 && delta > 0) setHidden(true);
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    if (!keyMenuOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!keySelectRef.current?.contains(event.target as Node)) setKeyMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setKeyMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [keyMenuOpen]);
  useEffect(() => { if (!performance || !autoScroll) return; let last = window.performance.now(); const pixelsPerSecond = autoScrollSpeed * 7; const tick = (now: number) => { window.scrollBy(0, ((now - last) / 1000) * pixelsPerSecond); last = now; frameRef.current = requestAnimationFrame(tick); }; frameRef.current = requestAnimationFrame(tick); return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); }; }, [performance, autoScroll, autoScrollSpeed, song.id]);
  return <div className={performance ? 'reader performance-reader' : 'reader'}>
    <header className={`reader-toolbar glass flex items-center${hidden ? ' topbar-hidden' : ''}`}><div className="reader-toolbar-main"><button className="icon-button touch-target" onClick={onBack} aria-label="Back"><ChevronLeft size={20} /></button><div className="reader-title"><span className="song-number">{song.number}</span><div><strong lang={song.language === 'Sinhala' ? 'si' : undefined}>{song.title}</strong><small>{performance ? position : `${song.category} · Original key ${song.originalKey}`}</small></div></div></div><div className="reader-controls flex flex-row items-center gap-3">
        <div className="reader-key-controls inline-flex flex-row items-center gap-1 p-1 bg-black/10 dark:bg-black/60 backdrop-blur-xl rounded-2xl shadow-xl">
          <button type="button" className="reader-control-button h-9 w-9 inline-flex items-center justify-center rounded-xl text-neutral-800 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-all text-base font-semibold leading-none select-none" onClick={() => onKey(transposeKey(targetKey, -1))} aria-label="Transpose down"><Minus size={16} strokeWidth={2.5} /></button>
          <span className="reader-key-select" ref={keySelectRef}><button type="button" className="reader-control-button h-9 px-3.5 inline-flex items-center justify-center gap-2 rounded-xl text-neutral-800 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-all text-sm font-semibold leading-none" aria-label="Song key" aria-haspopup="listbox" aria-expanded={keyMenuOpen} onClick={() => setKeyMenuOpen(open => !open)}><span>{currentKey}</span><span className="text-[10px] text-neutral-500 dark:text-white/50" aria-hidden="true">▼</span></button>{keyMenuOpen && <span className="reader-key-menu absolute top-full left-0 mt-2 grid grid-cols-3 gap-1 p-2 bg-neutral-900 text-white rounded-2xl shadow-2xl z-50" role="listbox" aria-label="Select song key">{keys.map(key => <button type="button" role="option" aria-selected={currentKey === key} className="reader-key-option" key={key} onClick={() => { onKey(key); setKeyMenuOpen(false); }}>{key}</button>)}</span>}</span>
          <button type="button" className="reader-control-button h-9 w-9 inline-flex items-center justify-center rounded-xl text-neutral-800 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-all text-base font-semibold leading-none select-none" onClick={() => onKey(transposeKey(targetKey, 1))} aria-label="Transpose Up"><Plus size={16} strokeWidth={2.5} /></button>
        </div>
        <div className="reader-font-controls inline-flex flex-row items-center gap-1 p-1 bg-black/10 dark:bg-black/60 backdrop-blur-xl rounded-2xl shadow-xl">
          <button type="button" className="reader-control-button h-9 px-3.5 inline-flex items-center justify-center rounded-xl text-neutral-800 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-all text-sm font-semibold leading-none" onClick={() => setDisplayFontSize(size => Math.max(12, size - 1))} aria-label="Decrease lyric font size">A-</button>
          <button type="button" className="reader-control-button h-9 px-3.5 inline-flex items-center justify-center rounded-xl text-neutral-800 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-all text-sm font-semibold leading-none" onClick={() => setDisplayFontSize(size => Math.min(40, size + 1))} aria-label="Increase lyric font size">A+</button>
        </div>
      </div></header>
    <main className="song-sheet animate-in" style={{ '--reader-size': `${displayFontSize}px`, paddingTop: 16 } as React.CSSProperties}><div className="song-hero"><p>{song.category.toUpperCase()}</p><h1 lang={song.language === 'Sinhala' ? 'si' : undefined}>{song.title}</h1>{(song.titleEnglish || song.alternateTitle) && <span>{song.titleEnglish || song.alternateTitle}</span>}</div><div className="lyrics" lang={song.language === 'Sinhala' ? 'si' : undefined}>{song.sections.map(section => <div className="song-stanza" key={section.id}>{section.lines.map((line, i) => <div className="lyric-line" key={`${section.id}-${i}`}>{songLineParts(line).map((part, n) => <span className="lyric-part" key={n}>{showChords && <span className="chord-row" aria-label={part.chord ? `Chords ${part.chord}` : undefined}>{part.chord ? transposeChordLine(part.chord, offset, useFlats).split(/(\s+)/).map((token, chordIndex) => /^\s+$/.test(token) ? token : <b className={`chord-badge chord-${chordQuality(token)}`} key={`${token}-${chordIndex}`}>{token}</b>) : '\u00a0'}</span>}<span lang={song.language === 'Sinhala' ? 'si' : undefined}>{part.text}</span></span>)}</div>)}</div>)}</div></main>
    {performance && <footer className="service-controls glass"><button className="active:scale-95 transition-transform duration-150" onClick={onPrevious} disabled={!onPrevious}><ChevronLeft /> Previous</button><span>Swipe or use arrow keys</span><button className="active:scale-95 transition-transform duration-150" onClick={onNext} disabled={!onNext}>Next <ChevronRight /></button></footer>}
  </div>;
}

export default function App() {
  const routeRef = useRef<AppRoute>(storedRoute());
  const wakeLockRef = useRef<ScreenWakeLockSentinel | null>(null);
  const [tab, setTab] = useState<Tab>(() => storedRoute().tab), [songs, setSongs] = useState<Song[]>([]), [setlists, setSetlists] = useState<Setlist[]>([]), [prefs, setPrefs] = useState<Preferences>(defaultPreferences), [ready, setReady] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(readThemeMode);
  const [wakeLockActive, setWakeLockActive] = useState(false), [wakeLockError, setWakeLockError] = useState<string | null>(null);
  const [query, setQuery] = useState(''), [songId, setSongId] = useState<string | null>(() => { const initial = storedRoute(); return initial.view === 'song' ? initial.songId : null; }), [readerKey, setReaderKey] = useState('C'), [activeId, setActiveId] = useState<string | null>(() => { const initial = storedRoute(); return initial.view === 'performance' ? initial.setlistId : null; }), [performanceIndex, setPerformanceIndex] = useState<number | null>(() => { const initial = storedRoute(); return initial.view === 'performance' ? initial.index : null; }), [confirmDefaults, setConfirmDefaults] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const applyRoute = useCallback((next: AppRoute) => { routeRef.current = next; setTab(next.tab); setSongId(next.view === 'song' ? next.songId : null); setPerformanceIndex(next.view === 'performance' ? next.index : null); if (next.view === 'performance') setActiveId(next.setlistId); }, []);
  const navigate = useCallback((next: AppRoute, replace = false) => { const state = { ...window.history.state, choirSongbook: next, previous: routeRef.current }; window.history[replace ? 'replaceState' : 'pushState'](state, '', routeHash(next)); applyRoute(next); }, [applyRoute]);
  const navigateBack = useCallback((fallback: Tab) => { if (window.history.state?.previous) window.history.back(); else navigate({ view: 'tab', tab: fallback }, true); }, [navigate]);
  useEffect(() => { const initial = storedRoute(); window.history.replaceState({ ...window.history.state, choirSongbook: initial, previous: null }, '', routeHash(initial)); applyRoute(initial); const onPopState = () => applyRoute(storedRoute()); window.addEventListener('popstate', onPopState); return () => window.removeEventListener('popstate', onPopState); }, [applyRoute]);
  useEffect(() => { songbookDb.hydrate().then(data => { setSongs(data.songs); setSetlists(data.setlists); setPrefs(data.preferences); }).finally(() => setReady(true)); }, []);
  useEffect(() => { if (ready) void songbookDb.savePreferences(prefs); }, [prefs, ready]);
  useEffect(() => {
    try { localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode); } catch { /* Keep the in-memory theme when storage is unavailable. */ }
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const isDark = themeMode === 'dark' || (themeMode === 'system' && media.matches);
      root.classList.toggle('dark', isDark);
      root.dataset.theme = isDark ? 'pitch-black' : 'light';
      document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#000000' : '#F2F2F7');
    };
    applyTheme();
    if (themeMode === 'system') media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [themeMode]);
  const toggleWakeLock = useCallback(async () => {
    const current = wakeLockRef.current;
    if (current) {
      try { await current.release(); setWakeLockError(null); }
      catch { setWakeLockError('Could not release the screen wake lock.'); }
      finally { wakeLockRef.current = null; setWakeLockActive(false); }
      return;
    }
    const wakeLock = (navigator as ScreenWakeLockNavigator).wakeLock;
    if (!wakeLock) {
      setWakeLockError('Screen Wake Lock is not supported by this browser.');
      return;
    }
    try {
      const sentinel = await wakeLock.request('screen');
      wakeLockRef.current = sentinel;
      setWakeLockActive(true);
      setWakeLockError(null);
      sentinel.addEventListener('release', () => {
        if (wakeLockRef.current === sentinel) {
          wakeLockRef.current = null;
          setWakeLockActive(false);
        }
      });
    } catch {
      setWakeLockActive(false);
      setWakeLockError('Could not keep the screen awake. Check browser permissions and try again.');
    }
  }, []);
  useEffect(() => () => { if (wakeLockRef.current) void wakeLockRef.current.release().catch(() => {}); }, []);
  const songsById = useMemo(() => new Map(songs.map(song => [song.id, song])), [songs]);
  const active = useMemo(() => setlists.find(s => s.id === activeId) ?? null, [setlists, activeId]);
  const selected = songId ? songsById.get(songId) ?? null : null;
  const item = performanceIndex !== null ? active?.items[performanceIndex] : undefined;
  const performanceSong = item ? songsById.get(item.songId) : undefined;
  useEffect(() => { if (ready && songId && !selected) navigate({ view: 'tab', tab: routeRef.current.tab }, true); if (ready && activeId && !active) { setActiveId(null); setPerformanceIndex(null); if (routeRef.current.view === 'performance') navigate({ view: 'tab', tab: 'setlists' }, true); } }, [ready, songId, selected, activeId, active, navigate]);
  useEffect(() => { const handler = (e: KeyboardEvent) => { if (performanceIndex === null || !active) return; if (e.key === 'ArrowLeft' && performanceIndex) navigate({ view: 'performance', tab: 'setlists', setlistId: active.id, index: performanceIndex - 1 }, true); if (e.key === 'ArrowRight' && performanceIndex < active.items.length - 1) navigate({ view: 'performance', tab: 'setlists', setlistId: active.id, index: performanceIndex + 1 }, true); }; addEventListener('keydown', handler); return () => removeEventListener('keydown', handler); }, [performanceIndex, active, navigate]);
  const save = useCallback((next: Setlist) => { setSetlists(all => all.some(x => x.id === next.id) ? all.map(x => x.id === next.id ? next : x) : [...all, next]); void songbookDb.saveSetlist(next); }, []);
  const create = () => { const now = new Date().toISOString(); const next = { id: uid(), title: 'New service', date: now.slice(0, 10), items: [], createdAt: now, updatedAt: now }; save(next); setActiveId(next.id); };
  const open = useCallback((song: Song, override?: string) => { setReaderKey(override || song.originalKey); navigate({ view: 'song', tab: routeRef.current.tab, songId: song.id }); }, [navigate]);
  const selectTab = useCallback((nextTab: Tab) => { if (routeRef.current.view === 'tab' && routeRef.current.tab === nextTab) return; navigate({ view: 'tab', tab: nextTab }); }, [navigate]);
  const filtered = useMemo(() => { const normalizedQuery = deferredQuery.trim().toLowerCase(); return normalizedQuery ? songs.filter(s => `${s.title} ${s.number} ${s.category} ${s.titleEnglish || s.alternateTitle || ''} ${s.originalKey}`.toLowerCase().includes(normalizedQuery)) : songs; }, [songs, deferredQuery]);
  if (!ready) return <div className="loading"><Music2 className="pulse" /> Opening songbook…</div>;
  if (performanceSong && item && active) return <SongReader song={performanceSong} targetKey={item.keyOverride || performanceSong.originalKey} fontSize={prefs.readerFontSize + 3} useFlats={prefs.useFlats} showChords={prefs.showChords} performance autoScroll={prefs.autoScroll} autoScrollSpeed={prefs.autoScrollSpeed} position={`${performanceIndex! + 1} of ${active.items.length} · ${active.title}`} onBack={() => navigateBack('setlists')} onKey={key => save({ ...active, items: active.items.map((x, i) => i === performanceIndex ? { ...x, keyOverride: key } : x), updatedAt: new Date().toISOString() })} onPrevious={performanceIndex! > 0 ? () => navigate({ view: 'performance', tab: 'setlists', setlistId: active.id, index: performanceIndex! - 1 }, true) : undefined} onNext={performanceIndex! < active.items.length - 1 ? () => navigate({ view: 'performance', tab: 'setlists', setlistId: active.id, index: performanceIndex! + 1 }, true) : undefined} />;
  if (selected) return <SongReader song={selected} targetKey={readerKey} fontSize={prefs.readerFontSize} useFlats={prefs.useFlats} showChords={prefs.showChords} onBack={() => navigateBack(routeRef.current.tab)} onKey={setReaderKey} />;
  const navItems = [{ id: 'library', label: 'Song Library', icon: BookOpen }, { id: 'setlists', label: 'Service Setlists', icon: ListMusic }, { id: 'settings', label: 'Preferences', icon: Settings }] as const;
  const exportBackup = () => { const payload = { app: 'Choir Songbook', exportedAt: new Date().toISOString(), songs, setlists, preferences: prefs }; const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `choir-songbook-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); };
  return <div className="app-shell"><FloatingTopbar tab={tab} items={navItems} onSelect={selectTab} /><main key={tab} className="workspace view-transition">
    {tab === 'library' && <><header className="page-heading"><h1>Song Library</h1></header><div className="search-box glass input-group"><Search size={19} /><input className="form-control" placeholder="Search song title, number, or category" value={query} onChange={e => setQuery(e.target.value)} /><kbd>⌘ K</kbd></div><div className="section-heading"><span>{filtered.length} songs</span><button className="text-button active:scale-95 transition-transform duration-150" onClick={() => setQuery('')}>Clear filters</button></div><div className="song-grid">{filtered.map(song => <article className="song-card glass card active:scale-95 transition-transform duration-150" key={song.id} onClick={() => open(song)}><div className="song-card-top"><Pill>{song.number}</Pill><button className={prefs.favorites.includes(song.id) ? 'heart liked' : 'heart'} onClick={e => { e.stopPropagation(); setPrefs(p => ({ ...p, favorites: p.favorites.includes(song.id) ? p.favorites.filter(id => id !== song.id) : [...p.favorites, song.id] })); }}><Heart size={18} fill="currentColor" /></button></div><h2 lang={song.language === 'Sinhala' ? 'si' : undefined}>{song.title}</h2>{(song.titleEnglish || song.alternateTitle) && <p>{song.titleEnglish || song.alternateTitle}</p>}<footer><span>Key {song.originalKey}</span><ChevronRight size={18} /></footer></article>)}</div></>}
    {tab === 'setlists' && <Setlists setlists={setlists} songs={songs} active={active} onSelect={setActiveId} onCreate={create} onSave={save} onDelete={id => { setSetlists(all => all.filter(x => x.id !== id)); if (activeId === id) setActiveId(null); void songbookDb.deleteSetlist(id); }} onOpen={open} onPerform={() => { if (active?.items.length) navigate({ view: 'performance', tab: 'setlists', setlistId: active.id, index: 0 }); }} />}
    {tab === 'settings' && <SettingsPage prefs={prefs} setPrefs={setPrefs} themeMode={themeMode} onThemeModeChange={setThemeMode} wakeLockActive={wakeLockActive} wakeLockError={wakeLockError} wakeLockSupported={Boolean((navigator as ScreenWakeLockNavigator).wakeLock)} onToggleWakeLock={() => { void toggleWakeLock(); }} onExport={exportBackup} onResetDefaults={() => setConfirmDefaults(true)} />}
  </main>{confirmDefaults && <ResetDefaultsModal onCancel={() => setConfirmDefaults(false)} onConfirm={() => { setPrefs(current => ({ ...defaultPreferences, favorites: current.favorites })); setThemeMode('system'); setConfirmDefaults(false); }} />}</div>;
}

function FloatingTopbar({ tab, items, onSelect }: { tab: Tab; items: readonly { id: Tab; label: string; icon: typeof BookOpen }[]; onSelect: (tab: Tab) => void }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => { let lastScrollY = Math.max(0, window.scrollY); const onScroll = () => { const currentY = Math.max(0, window.scrollY); if (currentY > lastScrollY) setHidden(true); else if (currentY < lastScrollY) setHidden(false); lastScrollY = currentY; }; window.addEventListener('scroll', onScroll, { passive: true }); return () => window.removeEventListener('scroll', onScroll); }, []);
  return <header className={`floating-topbar topbar-wide glass${hidden ? ' topbar-hidden' : ''}`}><div className="topbar-inner"><div className="topbar-brand"><span className="brand-mark"><Music2 size={18} /></span><span>Choir Songbook</span></div><nav className="flex justify-around" aria-label="Main navigation">{items.map(item => <button key={item.id} className={`flex-1 flex items-center justify-center${tab === item.id ? ' active' : ''}`} onClick={() => onSelect(item.id)} aria-label={item.label}><item.icon size={17} /><span>{item.label}</span></button>)}</nav></div></header>;
}

function SettingsPage({ prefs, setPrefs, themeMode, onThemeModeChange, wakeLockActive, wakeLockError, wakeLockSupported, onToggleWakeLock, onExport, onResetDefaults }: { prefs: Preferences; setPrefs: React.Dispatch<React.SetStateAction<Preferences>>; themeMode: ThemeMode; onThemeModeChange: (mode: ThemeMode) => void; wakeLockActive: boolean; wakeLockError: string | null; wakeLockSupported: boolean; onToggleWakeLock: () => void; onExport: () => void; onResetDefaults: () => void }) {
  const set = (patch: Partial<Preferences>) => setPrefs(current => ({ ...current, ...patch }));
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);
  const syncLibrary = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.update()));
      }
      window.location.reload();
    } catch {
      setSyncError('Library update failed. Please try again.');
      setIsSyncing(false);
    }
  };
  return <section className="settings-page"><header className="page-heading"><div><p className="eyebrow">PREFERENCES</p><h1>Your songbook, your way.</h1><span>Personalize your reading and performance experience.</span></div></header>
    <section className="settings-section"><header><h2>Display &amp; Typography</h2><p>Make every chart comfortable to read.</p></header><div className="settings-group glass"><div className="setting-row"><div className="setting-copy"><b>Theme mode</b><p>Follow your device or choose a fixed theme.</p></div><div className="segmented setting-control" aria-label="Theme mode">{(['system', 'light', 'dark'] as const).map(mode => <button type="button" key={mode} className={themeMode === mode ? 'selected' : ''} aria-pressed={themeMode === mode} onClick={() => onThemeModeChange(mode)}>{mode[0].toUpperCase() + mode.slice(1)}</button>)}</div></div><div className="setting-row"><div className="setting-copy"><b>Reader text size</b><p>Adjust lyric size in song and service views.</p></div><div className="setting-control slider-control"><output>{prefs.readerFontSize}<small>px</small></output><input className="range" aria-label="Reader text size" type="range" min="15" max="30" value={prefs.readerFontSize} style={{ '--range-progress': `${((prefs.readerFontSize - 15) / 15) * 100}%` } as React.CSSProperties} onChange={e => set({ readerFontSize: Number(e.target.value) })} /></div></div><div className="setting-row"><div className="setting-copy"><b>Show chords</b><p>Display chord names above each lyric line.</p></div><Toggle checked={prefs.showChords} onChange={() => set({ showChords: !prefs.showChords })} label="Show chords" /></div><div className="setting-row"><div className="setting-copy"><b>Notation preference</b><p>Choose how chord accidentals appear.</p></div><div className="segmented setting-control"><button className={!prefs.useFlats ? 'selected' : ''} onClick={() => set({ useFlats: false })}>Sharps <span>♯</span></button><button className={prefs.useFlats ? 'selected' : ''} onClick={() => set({ useFlats: true })}>Flats <span>♭</span></button></div></div></div></section>
    <section className="settings-section"><header><h2>Performance &amp; Hands-free</h2><p>Keep your attention on the music.</p></header><div className="settings-group glass"><div className="setting-row"><div className="setting-copy"><b>Keep screen awake</b><p className={wakeLockError ? 'setting-status error' : 'setting-status'} role={wakeLockError ? 'alert' : 'status'}>{wakeLockError || (wakeLockSupported ? wakeLockActive ? 'Screen will stay awake while this page is visible.' : 'Prevent dimming while reading songs.' : 'Screen Wake Lock is not supported by this browser.')}</p></div><Toggle checked={wakeLockActive} onChange={onToggleWakeLock} label="Keep screen awake" disabled={!wakeLockSupported} /></div><div className="setting-row"><div className="setting-copy"><b>Auto-scroll</b><p>Scroll through charts automatically in Service Mode.</p></div><Toggle checked={prefs.autoScroll} onChange={() => set({ autoScroll: !prefs.autoScroll })} label="Auto-scroll" /></div>{prefs.autoScroll && <div className="setting-row setting-row-nested"><div className="setting-copy"><b>Scroll speed</b><p>Choose a comfortable reading pace.</p></div><div className="setting-control slider-control"><output>{prefs.autoScrollSpeed}<small> / 5</small></output><input className="range" aria-label="Auto-scroll speed" type="range" min="1" max="5" value={prefs.autoScrollSpeed} style={{ '--range-progress': `${((prefs.autoScrollSpeed - 1) / 4) * 100}%` } as React.CSSProperties} onChange={e => set({ autoScrollSpeed: Number(e.target.value) })} /></div></div>}</div></section>
    <section className="settings-section"><header><h2>Data &amp; Offline Management</h2><p>Check connectivity and update your song library.</p></header><div className="settings-group glass"><div className="setting-row"><div className="setting-copy"><b>Network status</b><p>Current connection and local availability.</p></div><span className={`network-status ${isOnline ? 'is-online' : 'is-offline'}`} role="status"><i aria-hidden="true" />{isOnline ? 'Online (Synced)' : 'Offline (Cached)'}</span></div><div className="setting-row"><div className="setting-copy"><b>Sync library</b><p>Check for app updates and refresh the songbook.</p>{syncError && <p className="setting-status error" role="alert">{syncError}</p>}</div><button className="setting-action" onClick={() => { void syncLibrary(); }} disabled={isSyncing}><RefreshCw size={16} className={isSyncing ? 'syncing-icon' : ''} /> {isSyncing ? 'Syncing…' : 'Sync Library'}</button></div><div className="setting-row"><div className="setting-copy"><b>Export data backup</b><p>Download your songs, setlists, and preferences as a JSON file.</p></div><button className="setting-action" onClick={onExport}><Download size={16} /> Export Backup</button></div><div className="setting-row"><div className="setting-copy"><b>Reset to defaults</b><p>Restore display, notation, and performance preferences.</p></div><button className="setting-action secondary" onClick={onResetDefaults}><RotateCcw size={16} /> Reset to Defaults</button></div></div></section>
  </section>;
}

function ResetDefaultsModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) { return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="reset-modal glass"><div className="modal-icon"><RotateCcw size={20} /></div><h2>Restore default preferences?</h2><p>Your display, chord notation, and performance preferences will return to their defaults. Your songs and setlists will remain saved.</p><div><button className="modal-cancel" onClick={onCancel}>Cancel</button><button className="setting-action" onClick={onConfirm}>Reset preferences</button></div></div></div>; }

function SongPickerModal({ songs, onClose, onAdd }: { songs: Song[]; onClose: () => void; onAdd: (song: Song) => void }) {
  const [query, setQuery] = useState('');
  useEffect(() => { const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', closeOnEscape); return () => window.removeEventListener('keydown', closeOnEscape); }, [onClose]);
  const filtered = useMemo(() => { const q = query.trim().toLowerCase(); return songs.filter(song => !q || `${song.title} ${song.titleEnglish || song.alternateTitle || ''} ${song.originalKey} ${song.category} ${song.number}`.toLowerCase().includes(q)); }, [songs, query]);
  return <div className="modal-backdrop picker-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="song-picker glass" role="dialog" aria-modal="true" aria-labelledby="picker-title"><header><div><p className="eyebrow">SETLIST EDITOR</p><h2 id="picker-title">Add a song</h2></div><button className="icon-button" onClick={onClose} aria-label="Close song picker"><X size={18} /></button></header><label className="picker-search"><Search size={18} /><input autoFocus placeholder="Search title, key, or category" value={query} onChange={e => setQuery(e.target.value)} /></label><div className="picker-results">{filtered.length ? filtered.map(song => <button className="picker-song" key={song.id} onClick={() => onAdd(song)}><span><b>{song.title}</b><small>{song.number} · {song.category}</small></span><span className="picker-key">{song.originalKey}</span><Plus size={17} /></button>) : <p className="picker-empty">No songs match that search.</p>}</div><footer>{filtered.length} {filtered.length === 1 ? 'song' : 'songs'} available</footer></section></div>;
}

function Setlists({ setlists, songs, active, onSelect, onCreate, onSave, onDelete, onOpen, onPerform }: { setlists: Setlist[]; songs: Song[]; active: Setlist | null; onSelect: (id: string) => void; onCreate: () => void; onSave: (s: Setlist) => void; onDelete: (id: string) => void; onOpen: (s: Song, key?: string) => void; onPerform: () => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLInputElement>(null);
  const openDatePicker = () => { const input = datePickerRef.current; if (!input) return; try { if (typeof input.showPicker === 'function') input.showPicker(); else { input.focus(); input.click(); } } catch { input.focus(); } };
  const songsById = useMemo(() => new Map(songs.map(song => [song.id, song])), [songs]);
  const selectedSongIds = useMemo(() => new Set(active?.items.map(entry => entry.songId)), [active?.items]);
  const update = (patch: Partial<Setlist>) => active && onSave({ ...active, ...patch, updatedAt: new Date().toISOString() });
  const move = (i: number, by: number) => { if (!active || i + by < 0 || i + by >= active.items.length) return; const items = [...active.items]; [items[i], items[i + by]] = [items[i + by], items[i]]; update({ items }); };
  return <section className="setlist-page"><header className="page-heading row"><div><p className="eyebrow">SERVICE PLANNING</p><h1>Setlists.</h1><span>Arrange worship without losing the moment.</span><div className="setlist-heading-action-row"><button className="primary-button setlist-action-nowrap" onClick={onCreate}><Plus size={18} /> New setlist</button></div></div></header><div className="setlist-layout h-[360px] max-h-[360px]"><aside className={`setlist-list glass w-full h-[360px] max-h-[360px]${setlists.length ? '' : ' setlist-list-empty empty-state-card'}`}>{setlists.length ? <><div className="setlist-list-scroll">{setlists.map(list => <button key={list.id} className={active?.id === list.id ? 'setlist-select selected' : 'setlist-select'} onClick={() => onSelect(list.id)}><ListMusic size={17} /><div><b>{list.title}</b><small>{list.items.length} songs · {list.date}</small></div><ChevronRight size={16} /></button>)}</div></> : <div className="empty empty-state-content"><CloudOff /><p>No setlists yet</p></div>}</aside>{active ? <div className="setlist-editor animate-in h-[360px] max-h-[360px]"><div className="editor-top glass"><div className="editor-meta"><input value={active.title} onChange={e => update({ title: e.target.value })} aria-label="Setlist title" /><div className="date-control"><button type="button" className="date-picker-trigger" onClick={openDatePicker} aria-label="Open calendar"><CalendarDays className="date-icon" size={20} /></button><input ref={datePickerRef} className="date-input" type="date" value={active.date} onChange={e => update({ date: e.target.value })} aria-label="Setlist date" /></div></div><div className="editor-actions"><button className="play-button" disabled={!active.items.length} onClick={onPerform}><Play size={16} fill="currentColor" /> Service mode</button><button className="icon-button danger" onClick={() => onDelete(active.id)} aria-label="Delete"><Trash2 size={18} /></button></div></div><div className="setlist-songs glass">{active.items.map((entry, i) => { const song = songsById.get(entry.songId); return song && <div className="setlist-row" key={entry.id}><span className="order">{i + 1}</span><button className="row-song" onClick={() => onOpen(song, entry.keyOverride)}><b>{song.title}</b><small>{song.number} · {song.category}</small></button><select value={entry.keyOverride || song.originalKey} onChange={e => update({ items: active.items.map(x => x.id === entry.id ? { ...x, keyOverride: e.target.value } : x) })}>{keys.map(k => <option key={k}>{k}</option>)}</select><div className="reorder"><button onClick={() => move(i, -1)}>↑</button><button onClick={() => move(i, 1)}>↓</button></div><button className="remove" onClick={() => update({ items: active.items.filter(x => x.id !== entry.id) })}><X size={17} /></button></div>; })}{!active.items.length && <div className="empty"><Music2 /><p>Add songs to this service to begin.</p></div>}</div><div className="add-songs"><div><div><h2>Setlist songs</h2><span>{active.items.length} selected</span></div><button className="add-song-trigger" onClick={() => setPickerOpen(true)}><Plus size={17} /> Add Song to Setlist</button></div></div></div> : <div className="setlist-empty glass empty-state-card w-full h-[360px] max-h-[360px]"><ListMusic size={28} /><h2>No setlist selected</h2><p>Choose a setlist from the left or create one to start planning.</p><button className="primary-button empty-create-button setlist-action-nowrap whitespace-nowrap inline-flex items-center justify-center gap-2 w-auto py-3 min-w-max" onClick={onCreate}><Plus size={16} /> Create a setlist</button></div>}</div>{pickerOpen && active && <SongPickerModal songs={songs.filter(song => !selectedSongIds.has(song.id))} onClose={() => setPickerOpen(false)} onAdd={song => { update({ items: [...active.items, { id: uid(), songId: song.id, keyOverride: song.originalKey }] }); setPickerOpen(false); }} />}</section>;
}
