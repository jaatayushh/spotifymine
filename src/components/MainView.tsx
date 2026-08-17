import React, { useMemo, useState } from 'react';
import {
  Play,
  Heart,
  Grid,
  List,
  Music,
  Search,
  Folder,
  Plus,
  Trash2,
  FolderPlus,
  Sparkles,
  History,
  X,
  ChevronRight,
  Clock,
  MoreHorizontal,
} from 'lucide-react';
import { ActiveTab, AiPlaylist, Playlist, Track } from '../types';
import { TrackCard } from './TrackCard';
import { TrackTable } from './TrackTable';
import { LyricsView } from './LyricsView';
import { AdminPanel } from './AdminPanel';
import { getGreeting, shuffleArray, getGradientColors, formatTime } from '../utils/audioUtils';

interface MainViewProps {
  activeTab: ActiveTab;
  tracks: Track[];
  isLoadingHF?: boolean;
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime?: number;
  likedTrackIds: string[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onPlayTrack: (track: Track, queue?: Track[]) => void;
  onToggleLike: (trackId: string, e: React.MouseEvent) => void;
  playlists: Playlist[];
  activePlaylistId: string | null;
  onRequestCreatePlaylist: () => void;
  onAddToPlaylist: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onRemoveFromPlaylist: (trackId: string, playlistId: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onSelectPlaylist: (playlistId: string) => void;
  onSeek?: (time: number) => void;
  onPlayPause?: () => void;
  playCounts?: Record<string, number>;
  recentlyPlayedIds?: string[];
  onRefreshLibrary?: () => void;
  addToast?: (message: string, type?: 'info' | 'error' | 'success') => void;
  todaysMixTracks?: (Track & { instanceId: string })[];
  onRemoveFromTodaysMix?: (instanceId: string) => void;
  aiPlaylists?: AiPlaylist[];
  analyserNode?: AnalyserNode | null;
}

// ── Recently Played compact row item (Spotify grid style) ──
const RecentItem: React.FC<{
  track: Track;
  isCurrentTrack: boolean;
  isPlaying: boolean;
  onPlay: (track: Track) => void;
}> = ({ track, isCurrentTrack, isPlaying, onPlay }) => {
  const fallback = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' fill='%23333'/></svg>`;
  return (
    <button
      onClick={() => onPlay(track)}
      className="group flex items-center gap-3 rounded-md overflow-hidden transition-all duration-200 hover:bg-zinc-700/60 pr-3"
      style={{ background: 'rgba(255,255,255,0.05)' }}
    >
      <div className="relative w-12 h-12 shrink-0">
        <img
          src={track.coverArtUrl || fallback}
          alt={track.title}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = fallback; }}
        />
        {isCurrentTrack && isPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="flex items-end gap-[2px] h-4">
              <span className="w-[2px] bg-[#1DB954] rounded-full eq-bar-1" style={{ height: '100%', transformOrigin: 'bottom' }} />
              <span className="w-[2px] bg-[#1DB954] rounded-full eq-bar-2" style={{ height: '65%', transformOrigin: 'bottom' }} />
              <span className="w-[2px] bg-[#1DB954] rounded-full eq-bar-3" style={{ height: '100%', transformOrigin: 'bottom' }} />
            </div>
          </div>
        )}
      </div>
      <span className={`text-sm font-semibold truncate text-left ${isCurrentTrack ? 'text-[#1DB954]' : 'text-white'}`}>
        {track.title}
      </span>
      <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <div className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg">
          <Play className="w-3.5 h-3.5 fill-black translate-x-0.5" />
        </div>
      </div>
    </button>
  );
};

export const MainView: React.FC<MainViewProps> = ({
  activeTab,
  tracks,
  isLoadingHF = false,
  currentTrack,
  isPlaying,
  currentTime = 0,
  likedTrackIds,
  searchQuery,
  setSearchQuery,
  onPlayTrack,
  onToggleLike,
  playlists,
  activePlaylistId,
  onRequestCreatePlaylist,
  onAddToPlaylist,
  onAddToQueue,
  onRemoveFromPlaylist,
  onDeletePlaylist,
  onSelectPlaylist,
  onSeek = () => {},
  onPlayPause = () => {},
  playCounts = {},
  recentlyPlayedIds = [],
  onRefreshLibrary = () => {},
  addToast = () => {},
  todaysMixTracks = [],
  onRemoveFromTodaysMix = (_id: string) => {},
  aiPlaylists = [],
  analyserNode,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isViewingTodaysMix, setIsViewingTodaysMix] = useState(false);
  const [viewingAiPlaylistId, setViewingAiPlaylistId] = useState<string | null>(null);
  const [allSongsFilter, setAllSongsFilter] = useState('');
  const greeting = getGreeting();

  const filteredTracks = searchQuery.trim()
    ? tracks.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.album.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tracks;

  const allSongsTracks = useMemo(() => {
    if (!allSongsFilter.trim()) return tracks;
    const q = allSongsFilter.toLowerCase();
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q)
    );
  }, [tracks, allSongsFilter]);

  const shuffledTracks = useMemo(() => shuffleArray(tracks), [tracks]);
  const displayMixTracks = useMemo(() => {
    if (todaysMixTracks && todaysMixTracks.length > 0) return todaysMixTracks;
    return tracks.slice(0, 100).map((t, idx) => ({ ...t, instanceId: `${t.id}_${idx}` }));
  }, [todaysMixTracks, tracks]);

  const recommendedTracks = useMemo(() => shuffleArray(tracks).slice(0, 24), [tracks]);

  const recentlyPlayedTracks = useMemo(() => {
    return recentlyPlayedIds
      .map((id) => tracks.find((t) => t.id === id))
      .filter((t): t is Track => !!t)
      .slice(0, 8);
  }, [tracks, recentlyPlayedIds]);

  const likedTracks = tracks.filter((t) => likedTrackIds.includes(t.id));
  const activePlaylist = playlists.find((p) => p.id === activePlaylistId);
  const playlistTracks = activePlaylist
    ? activePlaylist.trackIds
        .map((id) => tracks.find((t) => t.id === id))
        .filter((t): t is Track => Boolean(t))
    : [];
  const availableTracksToAdd = activePlaylist
    ? tracks.filter((t) => !activePlaylist.trackIds.includes(t.id)).slice(0, 8)
    : [];
  const viewingAiPlaylist = aiPlaylists.find((p) => p.id === viewingAiPlaylistId) || null;

  return (
    <main className="flex-1 overflow-y-auto pb-36 md:pb-32 custom-scrollbar select-none"
      style={{ background: '#121212' }}>

      {/* ═══════════════ HOME TAB ═══════════════ */}
      {activeTab === 'home' && !activePlaylistId && !isViewingTodaysMix && !viewingAiPlaylistId && (
        <div style={{ animation: 'fadeUp 0.4s ease' }}>
          {/* Hero gradient header */}
          <div className="px-4 sm:px-6 pt-6 pb-8"
            style={{
              background: 'linear-gradient(180deg, rgba(29,185,84,0.15) 0%, transparent 100%)',
            }}>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6">{greeting}</h1>

            {/* Recently played compact grid */}
            {recentlyPlayedTracks.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {recentlyPlayedTracks.map((track) => (
                  <RecentItem
                    key={track.id}
                    track={track}
                    isCurrentTrack={currentTrack?.id === track.id}
                    isPlaying={isPlaying}
                    onPlay={(t) => onPlayTrack(t, recentlyPlayedTracks)}
                  />
                ))}
                {/* Liked songs quick tile */}
                <button
                  onClick={() => onPlayTrack(likedTracks[0] || tracks[0], likedTracks.length > 0 ? likedTracks : tracks)}
                  className="group flex items-center gap-3 rounded-md overflow-hidden hover:bg-zinc-700/60 transition-all pr-3"
                  style={{ background: 'linear-gradient(135deg, rgba(100,100,255,0.6), rgba(180,80,180,0.6))' }}
                >
                  <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                    <Heart className="w-6 h-6 fill-white text-white" />
                  </div>
                  <span className="text-sm font-bold text-white">Liked Songs</span>
                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <div className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg">
                      <Play className="w-3.5 h-3.5 fill-black translate-x-0.5" />
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <div className="px-4 sm:px-6 space-y-10">
            {/* Today's Mix featured card */}
            {displayMixTracks.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-white">Today's Mix</h2>
                  <button
                    onClick={() => setIsViewingTodaysMix(true)}
                    className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
                  >
                    Show all
                  </button>
                </div>
                <div
                  onClick={() => setIsViewingTodaysMix(true)}
                  className="group relative overflow-hidden rounded-lg cursor-pointer transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(29,185,84,0.18) 0%, rgba(16,120,70,0.12) 60%, rgba(18,18,18,1) 100%)',
                    border: '1px solid rgba(29,185,84,0.15)',
                  }}
                >
                  <div className="flex items-center gap-5 p-5">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-md overflow-hidden shrink-0 grid grid-cols-2 gap-0.5 shadow-2xl">
                      {displayMixTracks.slice(0, 4).map((t, i) => (
                        <img key={i} src={t.coverArtUrl || ''} alt="" className="w-full h-full object-cover"
                          onError={e => { e.currentTarget.style.background = '#282828'; }} />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold uppercase tracking-widest text-[#1DB954] mb-1">Featured Playlist</p>
                      <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1">Today's Mix</h3>
                      <p className="text-sm text-zinc-400">{displayMixTracks.length} songs · Made for you</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); if (displayMixTracks.length > 0) onPlayTrack(displayMixTracks[0], displayMixTracks); }}
                      className="w-12 h-12 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shrink-0 shadow-xl transition-all hover:scale-105 active:scale-90 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
                    >
                      <Play className="w-5 h-5 fill-black translate-x-0.5" />
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* AI Playlists row */}
            {aiPlaylists.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-white">Made by AI</h2>
                  <span className="text-xs text-zinc-500 font-medium">Refreshes daily</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar snap-x -mx-1 px-1">
                  {aiPlaylists.map((pl) => {
                    const [c1, c2] = getGradientColors(pl.name);
                    return (
                      <div
                        key={pl.id}
                        onClick={() => setViewingAiPlaylistId(pl.id)}
                        className="shrink-0 w-[160px] sm:w-[180px] snap-start cursor-pointer group"
                      >
                        <div className="w-full aspect-square rounded-md overflow-hidden relative mb-2 shadow-lg"
                          style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                          <span className="absolute inset-0 flex items-center justify-center text-4xl">{pl.emoji}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); if (pl.tracks.length > 0) onPlayTrack(pl.tracks[0], pl.tracks); }}
                            className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 hover:scale-105 transition-all"
                          >
                            <Play className="w-4 h-4 fill-black translate-x-0.5" />
                          </button>
                        </div>
                        <p className="text-sm font-semibold text-white truncate">{pl.name}</p>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">{pl.description || `${pl.tracks.length} tracks`}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Recommended grid */}
            {recommendedTracks.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-white">Recommended for You</h2>
                </div>
                {isLoadingHF ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="flex flex-col gap-2">
                        <div className="aspect-square w-full skeleton rounded-md" />
                        <div className="h-3 w-3/4 skeleton rounded" />
                        <div className="h-2.5 w-1/2 skeleton rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                    {recommendedTracks.map((track) => (
                      <TrackCard
                        key={track.id}
                        track={track}
                        isPlaying={isPlaying}
                        isCurrentTrack={currentTrack?.id === track.id}
                        isLiked={likedTrackIds.includes(track.id)}
                        onPlay={(t) => onPlayTrack(t, recommendedTracks)}
                        onToggleLike={onToggleLike}
                        onAddToPlaylist={onAddToPlaylist}
                        onAddToQueue={onAddToQueue}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Create Playlist CTA */}
            <button
              onClick={onRequestCreatePlaylist}
              className="group w-full flex items-center gap-4 rounded-lg p-4 transition-all hover:bg-zinc-800/60"
              style={{ border: '1px dashed rgba(255,255,255,0.12)' }}
            >
              <div className="w-14 h-14 rounded-md bg-zinc-800 flex items-center justify-center shrink-0 group-hover:bg-[#1DB954]/20 transition-colors">
                <Plus className="w-7 h-7 text-zinc-400 group-hover:text-[#1DB954] transition-colors" />
              </div>
              <div className="text-left">
                <p className="text-base font-bold text-white">Create your first playlist</p>
                <p className="text-sm text-zinc-500 mt-0.5">It's easy, we'll help you</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════ TODAY'S MIX FULL VIEW ═══════════════ */}
      {isViewingTodaysMix && !activePlaylistId && (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          {/* Header */}
          <div className="px-4 sm:px-6 pt-6 pb-6"
            style={{ background: 'linear-gradient(180deg, rgba(29,185,84,0.25) 0%, rgba(18,18,18,1) 100%)' }}>
            <button
              onClick={() => setIsViewingTodaysMix(false)}
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white mb-5 transition-colors"
            >
              ← Home
            </button>
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">
              <div className="w-36 h-36 sm:w-52 sm:h-52 rounded-md overflow-hidden shrink-0 grid grid-cols-2 gap-0.5 shadow-2xl">
                {displayMixTracks.slice(0, 4).map((t, i) => (
                  <img key={i} src={t.coverArtUrl || ''} alt="" className="w-full h-full object-cover"
                    onError={e => { e.currentTarget.style.background = '#282828'; }} />
                ))}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Playlist</p>
                <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-2">Today's Mix</h1>
                <p className="text-sm text-zinc-400">{displayMixTracks.length} songs · Made for you today</p>
                <div className="flex items-center gap-3 mt-5">
                  <button
                    onClick={() => { if (displayMixTracks.length > 0) onPlayTrack(displayMixTracks[0], displayMixTracks); }}
                    className="w-14 h-14 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-90"
                  >
                    <Play className="w-7 h-7 fill-black translate-x-0.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6">
            <div className="divide-y divide-zinc-800/50">
              {displayMixTracks.map((track, idx) => (
                <div
                  key={track.instanceId || `${track.id}_${idx}`}
                  className="flex items-center gap-3 py-2.5 hover:bg-zinc-800/40 rounded-md px-2 -mx-2 group transition-colors cursor-pointer"
                  onClick={() => onPlayTrack(track, displayMixTracks.slice(idx))}
                >
                  <span className="w-7 text-center text-sm text-zinc-500 group-hover:hidden shrink-0">
                    {currentTrack?.id === track.id && isPlaying ? (
                      <span className="text-[#1DB954]">▶</span>
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <Play className="w-4 h-4 text-white hidden group-hover:block shrink-0" />
                  <img src={track.coverArtUrl} alt="" className="w-10 h-10 rounded shrink-0 object-cover"
                    onError={e => { e.currentTarget.style.background = '#333'; }} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className={`text-sm font-semibold truncate ${currentTrack?.id === track.id ? 'text-[#1DB954]' : 'text-white'}`}>
                      {track.title}
                    </span>
                    <span className="text-xs text-zinc-400 truncate">{track.artist}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveFromTodaysMix(track.instanceId); }}
                    className="p-1.5 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-full hover:bg-red-500/10 shrink-0"
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-zinc-500 tabular-nums shrink-0 hidden sm:block">{formatTime(track.duration)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ AI PLAYLIST FULL VIEW ═══════════════ */}
      {viewingAiPlaylist && (
        <div className="px-4 sm:px-6 pt-6" style={{ animation: 'fadeUp 0.3s ease' }}>
          <button onClick={() => setViewingAiPlaylistId(null)}
            className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white mb-5 transition-colors">
            ← Back
          </button>
          {(() => {
            const [c1, c2] = getGradientColors(viewingAiPlaylist.name);
            return (
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 mb-8">
                <div className="w-40 h-40 sm:w-52 sm:h-52 rounded-md flex items-center justify-center text-6xl shadow-2xl shrink-0"
                  style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                  {viewingAiPlaylist.emoji}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">AI Playlist</p>
                  <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-2">{viewingAiPlaylist.name}</h1>
                  <p className="text-sm text-zinc-400">{viewingAiPlaylist.description || `${viewingAiPlaylist.tracks.length} AI-picked tracks`}</p>
                  <button
                    onClick={() => onPlayTrack(viewingAiPlaylist.tracks[0], viewingAiPlaylist.tracks)}
                    className="mt-4 w-14 h-14 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-2xl transition-all hover:scale-105"
                  >
                    <Play className="w-6 h-6 fill-black translate-x-0.5" />
                  </button>
                </div>
              </div>
            );
          })()}
          <TrackTable
            tracks={viewingAiPlaylist.tracks}
            currentTrackId={currentTrack?.id || null}
            isPlaying={isPlaying}
            likedTrackIds={likedTrackIds}
            onPlayTrack={(track) => onPlayTrack(track, viewingAiPlaylist.tracks)}
            onToggleLike={onToggleLike}
            onAddToPlaylist={onAddToPlaylist}
            onAddToQueue={onAddToQueue}
          />
        </div>
      )}

      {/* ═══════════════ ALL SONGS TAB ═══════════════ */}
      {activeTab === 'allSongs' && (
        <div className="px-4 sm:px-6 pt-6 space-y-5" style={{ animation: 'fadeUp 0.3s ease' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">All Songs</h2>
              <p className="text-xs text-zinc-500 mt-1">
                {isLoadingHF ? 'Loading library…' : `${allSongsTracks.length} of ${tracks.length} songs`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={allSongsFilter}
                  onChange={(e) => setAllSongsFilter(e.target.value)}
                  placeholder="Filter songs…"
                  className="w-full rounded-full pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.3)'; }}
                  onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; }}
                />
              </div>
              <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <button onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}
                  title="Grid View"><Grid className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded transition-colors ${viewMode === 'table' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}
                  title="List View"><List className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          {isLoadingHF ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="aspect-square w-full skeleton rounded-md" />
                  <div className="h-3 w-3/4 skeleton rounded" />
                  <div className="h-2.5 w-1/2 skeleton rounded" />
                </div>
              ))}
            </div>
          ) : allSongsTracks.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {allSongsTracks.map((track) => (
                  <TrackCard
                    key={track.id} track={track} isPlaying={isPlaying}
                    isCurrentTrack={currentTrack?.id === track.id}
                    isLiked={likedTrackIds.includes(track.id)}
                    onPlay={(t) => onPlayTrack(t, allSongsTracks)}
                    onToggleLike={onToggleLike}
                    onAddToPlaylist={onAddToPlaylist}
                    onAddToQueue={onAddToQueue}
                  />
                ))}
              </div>
            ) : (
              <TrackTable
                tracks={allSongsTracks} currentTrackId={currentTrack?.id || null}
                isPlaying={isPlaying} likedTrackIds={likedTrackIds}
                onPlayTrack={(track) => onPlayTrack(track, allSongsTracks)}
                onToggleLike={onToggleLike} onAddToPlaylist={onAddToPlaylist} onAddToQueue={onAddToQueue}
              />
            )
          ) : (
            <div className="py-20 text-center text-zinc-400">
              <Music className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
              <p className="text-base font-bold text-white">{allSongsFilter ? `No results for "${allSongsFilter}"` : 'No songs found'}</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ SEARCH TAB ═══════════════ */}
      {activeTab === 'search' && (
        <div className="px-4 sm:px-6 pt-6 space-y-5" style={{ animation: 'fadeUp 0.3s ease' }}>
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="What do you want to listen to?"
              autoFocus
              className="w-full rounded-full pl-11 pr-10 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {searchQuery.trim() ? (
            <>
              <h2 className="text-lg font-bold text-white">
                Results for <span className="text-zinc-400">"{searchQuery}"</span>
              </h2>
              {filteredTracks.length > 0 ? (
                <TrackTable
                  tracks={filteredTracks} currentTrackId={currentTrack?.id || null}
                  isPlaying={isPlaying} likedTrackIds={likedTrackIds}
                  onPlayTrack={(track) => onPlayTrack(track, filteredTracks)}
                  onToggleLike={onToggleLike} onAddToPlaylist={onAddToPlaylist} onAddToQueue={onAddToQueue}
                />
              ) : (
                <div className="py-16 text-center">
                  <Search className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
                  <p className="text-base font-bold text-white mb-1">No results for "{searchQuery}"</p>
                  <p className="text-sm text-zinc-500">Check the spelling or try different keywords</p>
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center text-zinc-500">
              <Search className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
              <p className="text-sm">Start typing to search songs, artists…</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ LIBRARY TAB ═══════════════ */}
      {activeTab === 'library' && !activePlaylistId && (
        <div className="px-4 sm:px-6 pt-6 space-y-6" style={{ animation: 'fadeUp 0.3s ease' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Your Library</h2>
            <button
              onClick={onRequestCreatePlaylist}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-black bg-white hover:bg-zinc-200 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Liked Songs tile */}
            <div
              onClick={() => onPlayTrack(likedTracks[0] || tracks[0], likedTracks.length > 0 ? likedTracks : tracks)}
              className="group relative p-5 rounded-lg overflow-hidden cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #450af5, #c4efd9)' }}
            >
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              <div className="relative">
                <Heart className="w-12 h-12 fill-white text-white drop-shadow-lg mb-8" />
                <h3 className="text-lg font-black text-white">Liked Songs</h3>
                <p className="text-sm text-white/80 font-medium mt-0.5">{likedTracks.length} songs</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); if (likedTracks.length > 0) onPlayTrack(likedTracks[0], likedTracks); }}
                className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 hover:scale-105 transition-all"
              >
                <Play className="w-5 h-5 fill-black translate-x-0.5" />
              </button>
            </div>

            {/* Today's Mix tile */}
            <div
              onClick={() => {}}
              className="group relative p-5 rounded-lg overflow-hidden cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #1db954, #006732)' }}
            >
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              <div className="relative">
                <Sparkles className="w-12 h-12 text-white drop-shadow-lg mb-8" />
                <h3 className="text-lg font-black text-white">Today's Mix</h3>
                <p className="text-sm text-white/80 font-medium mt-0.5">{displayMixTracks.length} songs</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); if (displayMixTracks.length > 0) onPlayTrack(displayMixTracks[0], displayMixTracks); }}
                className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-black/30 text-white flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 hover:scale-105 transition-all"
              >
                <Play className="w-5 h-5 fill-white translate-x-0.5" />
              </button>
            </div>

            {/* Create Playlist */}
            <button
              onClick={onRequestCreatePlaylist}
              className="group p-5 rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 flex flex-col gap-2 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-md bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                <Plus className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-base font-bold text-white mt-6">Create playlist</h3>
              <p className="text-sm text-zinc-500">Build a custom mix of your favorite songs</p>
            </button>
          </div>

          {/* Custom Playlists */}
          {playlists.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-white mb-3">Your Playlists</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {playlists.map((pl) => {
                  const plTracks = pl.trackIds.map(id => tracks.find(t => t.id === id)).filter(Boolean) as Track[];
                  return (
                    <button
                      key={pl.id}
                      onClick={() => onSelectPlaylist(pl.id)}
                      className="group flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800 transition-colors text-left"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      <div className="w-12 h-12 rounded-md bg-zinc-700 flex items-center justify-center shrink-0">
                        <Music className="w-5 h-5 text-zinc-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{pl.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">Playlist · {pl.trackIds.length} songs</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); if (plTracks.length > 0) onPlayTrack(plTracks[0], plTracks); }}
                        className="w-8 h-8 rounded-full bg-[#1DB954] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <Play className="w-3.5 h-3.5 fill-black translate-x-0.5" />
                      </button>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ LIKED SONGS TAB ═══════════════ */}
      {activeTab === 'liked' && (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          <div className="px-4 sm:px-6 pt-6 pb-8"
            style={{ background: 'linear-gradient(180deg, rgba(100,80,200,0.35) 0%, rgba(18,18,18,1) 100%)' }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">
              <div className="w-36 h-36 sm:w-52 sm:h-52 rounded-md flex items-center justify-center shadow-2xl shrink-0"
                style={{ background: 'linear-gradient(135deg, #450af5, #8e8ee5)' }}>
                <Heart className="w-16 h-16 sm:w-24 sm:h-24 fill-white text-white" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Playlist</p>
                <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-2">Liked Songs</h1>
                <p className="text-sm text-zinc-400">{likedTracks.length} songs</p>
                {likedTracks.length > 0 && (
                  <button
                    onClick={() => onPlayTrack(likedTracks[0], likedTracks)}
                    className="mt-5 w-14 h-14 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-2xl transition-all hover:scale-105"
                  >
                    <Play className="w-7 h-7 fill-black translate-x-0.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="px-4 sm:px-6">
            <TrackTable
              tracks={likedTracks} currentTrackId={currentTrack?.id || null}
              isPlaying={isPlaying} likedTrackIds={likedTrackIds}
              onPlayTrack={(track) => onPlayTrack(track, likedTracks)}
              onToggleLike={onToggleLike} onAddToPlaylist={onAddToPlaylist} onAddToQueue={onAddToQueue}
            />
          </div>
        </div>
      )}

      {/* ═══════════════ CUSTOM PLAYLIST VIEW ═══════════════ */}
      {activePlaylist && (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          <div className="px-4 sm:px-6 pt-6 pb-8"
            style={{ background: 'linear-gradient(180deg, rgba(29,185,84,0.2) 0%, rgba(18,18,18,1) 100%)' }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">
              <div className="w-36 h-36 sm:w-52 sm:h-52 rounded-md flex items-center justify-center shadow-2xl shrink-0"
                style={{ background: 'linear-gradient(135deg, #1db954, #006450)' }}>
                <Music className="w-16 h-16 sm:w-20 sm:h-20 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Playlist</p>
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-2 truncate">{activePlaylist.name}</h1>
                {activePlaylist.description && (
                  <p className="text-sm text-zinc-400 mb-1">{activePlaylist.description}</p>
                )}
                <p className="text-sm text-zinc-500">{playlistTracks.length} songs</p>
                <div className="flex items-center gap-3 mt-5">
                  {playlistTracks.length > 0 && (
                    <button
                      onClick={() => onPlayTrack(playlistTracks[0], playlistTracks)}
                      className="w-14 h-14 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-2xl transition-all hover:scale-105"
                    >
                      <Play className="w-7 h-7 fill-black translate-x-0.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onDeletePlaylist(activePlaylist.id)}
                    className="p-3 rounded-full text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Delete Playlist"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6">
            {playlistTracks.length > 0 ? (
              <TrackTable
                tracks={playlistTracks} currentTrackId={currentTrack?.id || null}
                isPlaying={isPlaying} likedTrackIds={likedTrackIds}
                onPlayTrack={(track) => onPlayTrack(track, playlistTracks)}
                onToggleLike={onToggleLike}
                onRemoveFromPlaylist={(trackId) => onRemoveFromPlaylist(trackId, activePlaylist.id)}
              />
            ) : (
              <div className="py-16 text-center">
                <Music className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
                <h3 className="text-lg font-bold text-white mb-1">This playlist is empty</h3>
                <p className="text-sm text-zinc-500 mb-4">Add songs to "{activePlaylist.name}" from your library</p>
              </div>
            )}

            {availableTracksToAdd.length > 0 && (
              <div className="pt-6 border-t border-zinc-800 mt-4">
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#1DB954]" />
                  Recommended
                </h3>
                <div className="space-y-1">
                  {availableTracksToAdd.map((track) => (
                    <div key={track.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-zinc-800/60 transition-colors group">
                      <img src={track.coverArtUrl} alt="" className="w-10 h-10 rounded shrink-0 object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                        <p className="text-xs text-zinc-500 truncate">{track.artist}</p>
                      </div>
                      <button
                        onClick={() => onAddToPlaylist(track)}
                        className="px-3 py-1 rounded-full text-sm font-semibold text-white border border-zinc-600 hover:border-white transition-colors shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ LYRICS TAB ═══════════════ */}
      {activeTab === 'lyrics' && (
        <div className="h-[calc(100vh-180px)] md:h-[calc(100vh-160px)] w-full">
          <LyricsView
            currentTrack={currentTrack}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onSeek={onSeek}
            onPlayPause={onPlayPause}
            rawLrc={currentTrack?.lrc}
            analyserNode={analyserNode}
          />
        </div>
      )}

      {/* ═══════════════ ADMIN TAB ═══════════════ */}
      {activeTab === 'admin' && (
        <div className="px-4 sm:px-6 pt-6">
          <AdminPanel
            tracks={tracks}
            isLoadingHF={isLoadingHF}
            onRefreshLibrary={onRefreshLibrary}
            addToast={addToast}
          />
        </div>
      )}
    </main>
  );
};
