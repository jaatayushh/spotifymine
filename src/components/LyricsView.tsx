import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Track } from '../types';
import { parseLrc, getActiveLineIndex, LrcLine } from '../utils/lrcParser';
import { Sparkles, Music, Mic2, Play, Pause, AlignCenter, Loader2 } from 'lucide-react';
import { generateCoverArt } from '../utils/audioUtils';
import { RealtimeAudioVisualizer } from './RealtimeAudioVisualizer';

type FetchState = 'idle' | 'loading' | 'found' | 'not_found';

interface LyricsViewProps {
  currentTrack: Track | null;
  currentTime: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onPlayPause?: () => void;
  rawLrc?: string;
  analyserNode?: AnalyserNode | null;
}

export const LyricsView: React.FC<LyricsViewProps> = ({
  currentTrack,
  currentTime,
  isPlaying,
  onSeek,
  onPlayPause,
  rawLrc,
  analyserNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [fetchedLrc, setFetchedLrc] = useState<string | null>(null);
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const fetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!currentTrack) {
      setFetchedLrc(null);
      setFetchState('idle');
      return;
    }

    // Abort any in-flight fetch for a previous track
    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
    }

    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setFetchState('loading');
    setFetchedLrc(null);

    const lrcPath = currentTrack.path.replace(/\.[^/.]+$/, '.lrc');
    const url = `https://huggingface.co/datasets/CoolJaat/my-music-library/resolve/main/${encodeURIComponent(lrcPath)}`;

    fetch(url, { signal: controller.signal })
      .then(res => {
        if (res.ok) return res.text();
        throw new Error('Not found');
      })
      .then(text => {
        setFetchedLrc(text);
        setFetchState('found');
      })
      .catch(err => {
        if (err?.name === 'AbortError') return; // ignore stale requests
        setFetchedLrc(null);
        setFetchState('not_found');
      });

    return () => { controller.abort(); };
  }, [currentTrack]);

  // Parse LRC with automatic ..... intro and instrumental gap markers
  const lyrics: LrcLine[] = useMemo(() => {
    if (!currentTrack) return [];
    const sourceLrc = rawLrc || fetchedLrc;
    if (!sourceLrc) return [];
    const parsed = parseLrc(sourceLrc);
    if (parsed.length === 0) return [];

    const result: LrcLine[] = [];

    // If first lyric line starts after 3s, prepend intro "....." line at t=0
    if (parsed[0].time > 3) {
      result.push({
        id: 'lrc_intro_dots',
        time: 0,
        text: '.....',
      });
    }

    for (let i = 0; i < parsed.length; i++) {
      result.push(parsed[i]);

      // If gap between this line and next line is > 7s, insert an instrumental "....." gap line
      if (i < parsed.length - 1) {
        const nextTime = parsed[i + 1].time;
        const currTime = parsed[i].time;
        if (nextTime - currTime > 7) {
          result.push({
            id: `lrc_gap_${i}_dots`,
            time: currTime + 2.5,
            text: '.....',
          });
        }
      }
    }

    return result;
  }, [currentTrack, rawLrc, fetchedLrc]);

  // Compute active line index
  const activeIndex = useMemo(() => {
    return getActiveLineIndex(lyrics, currentTime);
  }, [lyrics, currentTime]);

  // Smooth auto-scroll active lyric line to center of container
  useEffect(() => {
    if (!autoScroll || activeIndex < 0 || !containerRef.current) return;
    const lineEl = containerRef.current.querySelector(
      `[data-lyric-index="${activeIndex}"]`
    ) as HTMLElement;
    if (lineEl) {
      lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIndex, autoScroll]);

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-20 gap-4">
        <div className="relative">
          <Music className="w-16 h-16 text-zinc-700" />
          <div className="absolute inset-0 w-16 h-16 rounded-full bg-zinc-800/30 animate-ping" />
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-zinc-400">No song selected</p>
          <p className="text-xs text-zinc-600 mt-1">Play a track to view synced lyrics</p>
        </div>
      </div>
    );
  }

  const gradColors = (currentTrack.gradientColors && currentTrack.gradientColors.length >= 2)
    ? currentTrack.gradientColors
    : ['#555555', '#111111'];

  const coverArt =
    currentTrack.coverArtUrl ||
    generateCoverArt(currentTrack.title, currentTrack.artist, gradColors);

  const trackColor = gradColors[0];
  const isLoading = fetchState === 'loading' && !rawLrc;
  const noLyricsAvailable = !rawLrc && fetchState === 'not_found';

  return (
    <div
      className="relative flex flex-col h-full w-full rounded-3xl overflow-hidden shadow-2xl select-none"
      style={{ background: `radial-gradient(circle at 50% 25%, ${trackColor}55 0%, #0d0d0d 85%)` }}
    >
      {/* Ambient top glow */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none mix-blend-screen"
        style={{
          background: `radial-gradient(ellipse 120% 80% at 50% 0%, ${trackColor}60, transparent 70%)`,
        }}
      />
      {/* Ambient bottom glow */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[35rem] opacity-25 pointer-events-none mix-blend-screen"
        style={{
          background: `radial-gradient(ellipse 120% 100% at 50% 100%, ${trackColor}40, transparent 80%)`,
        }}
      />

      {/* ── HEADER ── */}
      <div
        className="relative z-10 flex items-center justify-between px-5 py-3.5 shrink-0"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(10,10,10,0.70)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <img
              src={coverArt}
              alt={currentTrack.title}
              className="w-10 h-10 rounded-xl object-cover shadow-lg"
              style={{ border: '1.5px solid rgba(255,255,255,0.12)' }}
            />
            {isPlaying && (
              <span
                className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                style={{ background: '#ffffff', boxShadow: `0 0 8px rgba(255,255,255,0.5)` }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Mic2 className="w-3 h-3 shrink-0" style={{ color: '#ffffff' }} />
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#ffffff' }}>
                Lyrics
              </span>
            </div>
            <p className="text-[13px] font-bold text-white truncate leading-tight">{currentTrack.title}</p>
            <p className="text-[11px] text-zinc-500 truncate">{currentTrack.artist}</p>
          </div>
        </div>

        <button
          onClick={() => setAutoScroll(prev => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all shrink-0"
          style={
            autoScroll
              ? { background: `rgba(255,255,255,0.1)`, border: `1px solid rgba(255,255,255,0.3)`, color: '#ffffff' }
              : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#71717a' }
          }
          title={autoScroll ? 'Auto-scroll On' : 'Auto-scroll Off'}
        >
          <AlignCenter className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{autoScroll ? 'Auto Scroll' : 'Manual'}</span>
        </button>
      </div>

      {/* ── LYRICS BODY ── */}
      <div
        ref={containerRef}
        onWheel={() => setAutoScroll(false)}
        onTouchMove={() => setAutoScroll(false)}
        className="relative z-10 flex-1 overflow-y-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#ffffff' }} />
            <p className="text-sm font-semibold text-zinc-500">Loading lyrics…</p>
          </div>
        )}

        {/* No lyrics available */}
        {noLyricsAvailable && (
          <div className="flex flex-col items-center justify-center h-full gap-5 py-20 px-8 text-center">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Music className="w-9 h-9 text-[#1DB954]" />
            </div>
            <div>
              <p className="text-3xl font-black tracking-widest text-[#1DB954] animate-pulse mb-2">
                . . . . .
              </p>
              <p className="text-base font-bold text-zinc-300 mb-1">No lyrics available</p>
              <p className="text-xs text-zinc-600 leading-relaxed max-w-xs mx-auto">
                Synchronized lyrics aren't available for this track yet
              </p>
            </div>
          </div>
        )}

        {/* Actual lyrics lines */}
        {!isLoading && !noLyricsAvailable && lyrics.length > 0 && (
          <div className="px-6 sm:px-12 py-24 space-y-3">
            {lyrics.map((line, idx) => {
              const isActive = idx === activeIndex;
              const isPassed = idx < activeIndex;
              const distanceFromActive = Math.abs(idx - activeIndex);

              const opacity = isActive
                ? 1
                : distanceFromActive <= 1
                ? 0.50
                : distanceFromActive <= 3
                ? 0.30
                : distanceFromActive <= 5
                ? 0.18
                : 0.10;

              return (
                <div
                  key={line.id}
                  data-lyric-index={idx}
                  onClick={() => { onSeek(line.time); setAutoScroll(true); }}
                  className="group cursor-pointer transition-all duration-300 ease-out rounded-2xl px-5 py-3 -mx-5 relative"
                  style={{
                    opacity,
                    transform: isActive ? 'scale(1.02)' : 'scale(0.98)',
                    transformOrigin: 'left center',
                  }}
                >
                  {/* Active glow bg */}
                  {isActive && (
                    <div
                      className="absolute inset-0 rounded-2xl pointer-events-none shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 80%)`,
                        border: `1px solid rgba(255,255,255,0.18)`,
                      }}
                    />
                  )}
                  {/* Hover bg for inactive */}
                  <div
                    className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
                  />

                  <div className="relative flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Active animated bar */}
                      {isActive && (
                        <div
                          className="shrink-0 w-1.5 h-7 rounded-full self-center"
                          style={{
                            background: `#ffffff`,
                            boxShadow: `0 0 12px rgba(255,255,255,0.8)`,
                            animation: 'lyricsBarPulse 1.2s ease-in-out infinite',
                          }}
                        />
                      )}

                      <p
                        className="transition-all duration-300 leading-[1.3] text-left"
                        style={{
                          fontSize: isActive ? '30px' : '22px',
                          fontWeight: isActive ? 900 : 700,
                          letterSpacing: isActive ? '-0.02em' : '-0.01em',
                          color: isActive ? '#ffffff' : isPassed ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.40)',
                          textShadow: isActive ? `0 4px 20px rgba(0,0,0,0.6)` : 'none',
                        }}
                      >
                        {line.text === '.....' || line.text === '...' ? (
                          <span className="inline-flex items-center gap-2 font-black tracking-widest text-[#1DB954] text-3xl animate-pulse">
                            . . . . .
                          </span>
                        ) : (
                          line.text
                        )}
                      </p>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1 rounded-full shrink-0 transition-opacity duration-200 bg-white/10 border border-white/20">
                      <Play className="w-3 h-3 fill-[#1DB954] text-[#1DB954]" />
                      <span className="text-[11px] font-extrabold text-white">Seek</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Spotify Lyrics Credit Footer */}
            <div className="pt-12 pb-16 flex flex-col items-center justify-center gap-1 text-center opacity-60">
              <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">
                Lyrics provided by SpotifyMine
              </p>
              <p className="text-[10px] text-zinc-500 font-mono">Synced timestamp data • Musixmatch format</p>
            </div>
          </div>
        )}
      </div>

      {/* ── FOOTER BAR ── */}
      <div
        className="relative z-10 px-5 py-3 shrink-0 flex items-center justify-between"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(10,10,10,0.80)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-3">
          {onPlayPause && (
            <button
              onClick={onPlayPause}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg"
              style={{ background: '#ffffff' }}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-black text-black" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-black text-black translate-x-0.5" />
              )}
            </button>
          )}
          
          <div className="flex-1 max-w-sm px-2">
            <RealtimeAudioVisualizer
              isPlaying={isPlaying}
              currentTime={currentTime}
              color={trackColor}
              height={32}
              barCount={36}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold text-zinc-500 hidden sm:inline">
              {lyrics.length > 0
                ? `Line ${Math.max(activeIndex + 1, 1)} / ${lyrics.length}`
                : isLoading
                ? 'Loading…'
                : 'No lyrics'}
            </span>
          </div>
        </div>

        {!autoScroll && lyrics.length > 0 && (
          <button
            onClick={() => setAutoScroll(true)}
            className="flex items-center gap-1.5 text-[11px] font-bold transition-all hover:opacity-80 px-3 py-1.5 rounded-full"
            style={{
              color: '#ffffff',
              background: `rgba(255,255,255,0.1)`,
              border: `1px solid rgba(255,255,255,0.2)`,
            }}
          >
            <Sparkles className="w-3 h-3" />
            Re-sync
          </button>
        )}
      </div>

      <style>{`
        @keyframes lyricsBarPulse {
          0%, 100% { opacity: 1; transform: scaleY(1); }
          50% { opacity: 0.5; transform: scaleY(0.65); }
        }
      `}</style>
    </div>
  );
};
