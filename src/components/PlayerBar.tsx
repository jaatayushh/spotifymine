import React, { useState, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  Heart,
  ListMusic,
  Music,
  Mic2,
  Maximize2,
  SlidersHorizontal,
} from 'lucide-react';
import { ActiveTab, RepeatMode, Track } from '../types';
import { formatTime, generateCoverArt } from '../utils/audioUtils';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  bufferedPercent?: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  isLiked: boolean;
  activeTab?: ActiveTab;
  crossfadeDuration?: number;
  onCrossfadeChange?: (seconds: number) => void;
  onPlayPause: () => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: (trackId: string, e: React.MouseEvent) => void;
  onOpenQueue: () => void;
  onToggleLyrics?: () => void;
  onOpenMaximizedPlayer?: (initialTab?: 'art' | 'lyrics') => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  bufferedPercent = 0,
  volume,
  isMuted,
  isShuffle,
  repeatMode,
  isLiked,
  activeTab,
  crossfadeDuration = 0,
  onCrossfadeChange,
  onPlayPause,
  onPrevTrack,
  onNextTrack,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
  onOpenQueue,
  onToggleLyrics,
  onOpenMaximizedPlayer,
}) => {
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = useState<number>(0);
  const [showCrossfadePopover, setShowCrossfadePopover] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  const effectiveVolume = isMuted ? 0 : volume;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercent = effectiveVolume * 100;

  const handleMouseMoveProgress = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width > 0 && duration > 0) {
      const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      setHoverPercent((offsetX / rect.width) * 100);
      setHoverTime((offsetX / rect.width) * duration);
    }
  }, [duration]);

  if (!currentTrack) {
    return (
      <div className="fixed bottom-14 md:bottom-0 left-0 right-0 h-16 md:h-[90px] bg-[#181818] border-t border-zinc-800/60 px-4 md:px-6 flex items-center gap-3 text-zinc-500 text-sm z-40 select-none">
        <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center shrink-0">
          <Music className="w-4 h-4 text-zinc-600" />
        </div>
        <span className="text-xs text-zinc-500">Select a track to start playing</span>
      </div>
    );
  }

  const fallbackSvg = generateCoverArt(currentTrack.title, currentTrack.artist, currentTrack.gradientColors);

  return (
    <footer className="fixed bottom-[56px] md:bottom-0 left-0 right-0 h-[72px] md:h-[90px] z-40 select-none"
      style={{
        background: 'linear-gradient(to top, #181818 0%, #181818 85%, transparent 100%)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Mobile mini progress strip */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-0.5 bg-zinc-800">
        <div className="absolute inset-y-0 left-0 bg-zinc-600/50" style={{ width: `${bufferedPercent}%` }} />
        <div className="absolute inset-y-0 left-0 bg-[#1DB954]" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="h-full px-3 md:px-4 flex items-center justify-between gap-2 md:gap-4">

        {/* ── LEFT: Track Info ── */}
        <div className="flex items-center gap-3 flex-1 md:w-[30%] min-w-0">
          <div
            onClick={() => onOpenMaximizedPlayer?.('art')}
            className="relative shrink-0 cursor-pointer group"
          >
            <img
              src={currentTrack.coverArtUrl || fallbackSvg}
              alt={currentTrack.title}
              onError={(e) => { e.currentTarget.src = fallbackSvg; }}
              className={`w-12 h-12 md:w-14 md:h-14 rounded object-cover shadow-lg transition-all duration-300 ${isPlaying ? 'brightness-90' : ''}`}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded flex items-center justify-center transition-opacity">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </div>

          <div
            className="flex flex-col min-w-0 cursor-pointer group"
            onClick={() => onOpenMaximizedPlayer?.('art')}
          >
            <span className="text-[13px] md:text-sm font-semibold text-white truncate group-hover:underline">
              {currentTrack.title}
            </span>
            <span className="text-[11px] md:text-xs text-zinc-400 truncate hover:text-white hover:underline cursor-pointer transition-colors">
              {currentTrack.artist || 'Unknown Artist'}
            </span>
          </div>

          <button
            onClick={(e) => onToggleLike(currentTrack.id, e)}
            className={`shrink-0 p-1.5 rounded-full transition-all active:scale-90 ${
              isLiked ? 'text-[#1DB954]' : 'text-zinc-500 hover:text-white'
            }`}
            title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
          >
            <Heart className={`w-4 h-4 transition-transform ${isLiked ? 'fill-[#1DB954] scale-110' : ''}`} />
          </button>
        </div>

        {/* ── MOBILE: Play + Skip ── */}
        <div className="flex md:hidden items-center gap-2 shrink-0">
          <button
            onClick={onPlayPause}
            className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center active:scale-90 shadow"
          >
            {isPlaying
              ? <Pause className="w-4 h-4 fill-black" />
              : <Play className="w-4 h-4 fill-black translate-x-0.5" />}
          </button>
          <button onClick={onNextTrack} className="p-1.5 text-zinc-400 active:scale-90">
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>

        {/* ── CENTER: Controls + Seek (Desktop only) ── */}
        <div className="hidden md:flex flex-col items-center gap-2 w-[40%] max-w-[720px]">
          {/* Button row */}
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleShuffle}
              className={`relative p-2 rounded-full transition-all hover:scale-105 active:scale-95 ${
                isShuffle ? 'text-[#1DB954]' : 'text-zinc-400 hover:text-white'
              }`}
              title={isShuffle ? 'Disable Shuffle' : 'Enable Shuffle'}
            >
              <Shuffle className="w-4 h-4" />
              {isShuffle && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#1DB954] rounded-full" />}
            </button>

            <button
              onClick={onPrevTrack}
              className="p-2 text-zinc-300 hover:text-white hover:scale-105 active:scale-90 transition-all"
              title="Previous"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={onPlayPause}
              className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-90 transition-all shadow-xl"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying
                ? <Pause className="w-4 h-4 fill-black" />
                : <Play className="w-4 h-4 fill-black translate-x-0.5" />}
            </button>

            <button
              onClick={onNextTrack}
              className="p-2 text-zinc-300 hover:text-white hover:scale-105 active:scale-90 transition-all"
              title="Next"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={onToggleRepeat}
              className={`relative p-2 rounded-full transition-all hover:scale-105 active:scale-95 ${
                repeatMode !== 'off' ? 'text-[#1DB954]' : 'text-zinc-400 hover:text-white'
              }`}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
              {repeatMode !== 'off' && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#1DB954] rounded-full" />
              )}
            </button>
          </div>

          {/* Seek bar */}
          <div className="flex items-center gap-2 w-full">
            <span className="text-[11px] font-mono text-zinc-400 w-9 text-right tabular-nums">{formatTime(currentTime)}</span>

            <div
              ref={progressRef}
              className="relative flex-1 flex items-center h-5 cursor-pointer group"
              onMouseEnter={() => setIsHoveringProgress(true)}
              onMouseLeave={() => { setIsHoveringProgress(false); setHoverTime(null); }}
              onMouseMove={handleMouseMoveProgress}
            >
              {/* Tooltip */}
              {isHoveringProgress && hoverTime !== null && (
                <div
                  className="absolute bottom-full mb-2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded shadow-2xl pointer-events-none z-50 whitespace-nowrap"
                  style={{ left: `${hoverPercent}%` }}
                >
                  {formatTime(hoverTime)}
                  <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-zinc-900 absolute top-full left-1/2 -translate-x-1/2" />
                </div>
              )}

              {/* Track */}
              <div className={`w-full rounded-full overflow-hidden relative transition-all duration-150 ${isHoveringProgress ? 'h-1.5' : 'h-1'}`}
                style={{ background: 'rgba(255,255,255,0.15)' }}>
                {/* Buffered */}
                <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                  style={{ width: `${bufferedPercent}%`, background: 'rgba(255,255,255,0.15)' }} />
                {/* Played */}
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${isHoveringProgress ? 'bg-[#1DB954]' : 'bg-white'} transition-colors`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Thumb — always visible */}
              <div
                className={`absolute w-3 h-3 bg-white rounded-full shadow -translate-x-1/2 pointer-events-none transition-all ${isHoveringProgress ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                style={{ left: `${progressPercent}%` }}
              />

              {/* Invisible range input */}
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                step={0.5}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            <span className="text-[11px] font-mono text-zinc-400 w-9 tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        {/* ── RIGHT: Volume + Options (Desktop) ── */}
        <div className="hidden md:flex items-center justify-end gap-1.5 w-[30%] min-w-[180px]">
          {onToggleLyrics && (
            <button
              onClick={onToggleLyrics}
              className={`p-2 rounded-full transition-all hover:scale-105 relative ${
                activeTab === 'lyrics'
                  ? 'text-[#1DB954]'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Lyrics"
            >
              <Mic2 className="w-4 h-4" />
              {activeTab === 'lyrics' && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#1DB954] rounded-full" />
              )}
            </button>
          )}

          {/* Crossfade popover */}
          {onCrossfadeChange && (
            <div className="relative">
              <button
                onClick={() => setShowCrossfadePopover(!showCrossfadePopover)}
                className={`p-2 rounded-full transition-all hover:scale-105 relative ${
                  crossfadeDuration > 0
                    ? 'text-[#1DB954]'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title={`Crossfade: ${crossfadeDuration > 0 ? `${crossfadeDuration}s` : 'Off'}`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                {crossfadeDuration > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 text-[8px] font-black bg-[#1DB954] text-black rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                    {crossfadeDuration}
                  </span>
                )}
              </button>

              {showCrossfadePopover && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowCrossfadePopover(false)} />
                  <div className="absolute bottom-full right-0 mb-3 w-64 rounded-xl p-4 shadow-2xl z-50"
                    style={{ background: '#282828', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-white flex items-center gap-2">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#1DB954]" />
                        Crossfade
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        crossfadeDuration > 0 ? 'bg-[#1DB954]/20 text-[#1DB954]' : 'bg-zinc-700 text-zinc-400'
                      }`}>
                        {crossfadeDuration > 0 ? `${crossfadeDuration}s` : 'Off'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mb-3">Overlap songs for seamless transitions.</p>
                    <input
                      type="range" min={0} max={12} step={1}
                      value={crossfadeDuration}
                      onChange={(e) => onCrossfadeChange(parseInt(e.target.value, 10))}
                      className="w-full mb-2"
                      style={{ accentColor: '#1DB954' }}
                    />
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500 mb-3">
                      <span>Off</span><span>4s</span><span>8s</span><span>12s</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[0, 2, 4, 8].map((sec) => (
                        <button
                          key={sec}
                          onClick={() => onCrossfadeChange(sec)}
                          className={`py-1 text-[10px] font-bold rounded-md transition-all ${
                            crossfadeDuration === sec
                              ? 'bg-[#1DB954] text-black'
                              : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                          }`}
                        >
                          {sec === 0 ? 'Off' : `${sec}s`}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <button
            onClick={onOpenQueue}
            className="p-2 text-zinc-400 hover:text-white rounded-full transition-all hover:scale-105"
            title="Queue"
          >
            <ListMusic className="w-4 h-4" />
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1.5 group/vol">
            <button
              onClick={onToggleMute}
              className="p-1.5 text-zinc-400 hover:text-white transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0
                ? <VolumeX className="w-4 h-4 text-zinc-400" />
                : volume < 0.4
                ? <Volume1 className="w-4 h-4" />
                : <Volume2 className="w-4 h-4" />}
            </button>

            <div className="relative w-24 flex items-center">
              {/* Volume track */}
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <div
                  className="h-full rounded-full transition-colors group-hover/vol:bg-[#1DB954] bg-white"
                  style={{ width: `${volumePercent}%` }}
                />
              </div>
              <input
                type="range"
                min={0} max={1} step={0.01}
                value={effectiveVolume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {onOpenMaximizedPlayer && (
            <button
              onClick={() => onOpenMaximizedPlayer('art')}
              className="p-2 text-zinc-400 hover:text-white rounded-full transition-all hover:scale-105 shrink-0"
              title="Full Screen Player"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};
