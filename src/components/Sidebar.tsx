import React from 'react';
import {
  Home,
  Search,
  Library,
  Heart,
  Plus,
  Music,
  Folder,
  Mic2,
  Sparkles,
  ListMusic,
  ChevronRight,
} from 'lucide-react';
import { ActiveTab, Playlist } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  likedCount: number;
  playlists: Playlist[];
  onRequestCreatePlaylist: () => void;
  activePlaylistId: string | null;
  setActivePlaylistId: (id: string | null) => void;
  onOpenTodaysMix?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  likedCount,
  playlists,
  onRequestCreatePlaylist,
  activePlaylistId,
  setActivePlaylistId,
  onOpenTodaysMix,
}) => {
  const navItems: { key: ActiveTab; label: string; Icon: React.ElementType }[] = [
    { key: 'home', label: 'Home', Icon: Home },
    { key: 'search', label: 'Search', Icon: Search },
    { key: 'library', label: 'Your Library', Icon: Library },
    { key: 'allSongs', label: 'All Songs', Icon: ListMusic },
    { key: 'lyrics', label: 'Lyrics', Icon: Mic2 },
  ];

  return (
    <>
      {/* ─── Desktop Sidebar ─── */}
      <aside
        className="hidden md:flex flex-col w-[240px] shrink-0 gap-2 p-2 select-none"
        style={{ background: '#000' }}
      >
        {/* ── Top nav block ── */}
        <div
          className="rounded-xl p-3 flex flex-col gap-0.5"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          {/* Brand */}
          <div className="flex items-center gap-3 px-2 py-3 mb-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: '#1DB954' }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="black">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.622.622 0 01-.857.207c-2.348-1.435-5.304-1.759-8.785-.964a.622.622 0 01-.277-1.215c3.809-.87 7.077-.496 9.712 1.115a.623.623 0 01.207.857zm1.223-2.722a.779.779 0 01-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.779.779 0 01-.458-1.489c3.632-1.119 8.147-.576 11.238 1.327a.779.779 0 01.257 1.071zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71a.935.935 0 11-.543-1.79c3.532-1.072 9.404-.865 13.115 1.338a.935.935 0 01-.955 1.609z"/>
              </svg>
            </div>
            <span className="text-white font-black text-base tracking-tight leading-none">SpotifyMine</span>
          </div>

          <nav className="flex flex-col gap-0.5">
            {navItems.map(({ key, label, Icon }) => {
              const isActive = activeTab === key && !activePlaylistId;
              return (
                <button
                  key={key}
                  onClick={() => { setActiveTab(key); setActivePlaylistId(null); }}
                  className={`relative flex items-center gap-4 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 w-full text-left group ${
                    isActive
                      ? 'text-white bg-zinc-800'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-white'}`} />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── Library block ── */}
        <div
          className="rounded-xl flex-1 flex flex-col overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          {/* Library header */}
          <div className="flex items-center justify-between px-4 py-3">
            <button
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
              onClick={() => { setActiveTab('library'); setActivePlaylistId(null); }}
            >
              <Folder className="w-4 h-4" />
              <span className="text-sm font-bold">Your Library</span>
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={onRequestCreatePlaylist}
                title="Create Playlist"
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                title="Show more"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5 custom-scrollbar">

            {/* Today's Mix */}
            <button
              onClick={() => { setActiveTab('home'); setActivePlaylistId(null); if (onOpenTodaysMix) onOpenTodaysMix(); }}
              className="w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left hover:bg-zinc-800 group"
            >
              <div className="w-10 h-10 rounded-md bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shrink-0 shadow-md">
                <Sparkles className="w-4 h-4 text-black" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-white truncate">Today's Mix</span>
                <span className="text-[11px] text-zinc-500">Playlist • 100 songs</span>
              </div>
            </button>

            {/* Liked Songs */}
            <button
              onClick={() => { setActiveTab('liked'); setActivePlaylistId(null); }}
              className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left group ${
                activeTab === 'liked' && !activePlaylistId ? 'bg-zinc-800' : 'hover:bg-zinc-800'
              }`}
            >
              <div className="w-10 h-10 rounded-md bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shrink-0 shadow-md">
                <Heart className="w-4 h-4 fill-white text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-white truncate">Liked Songs</span>
                <span className="text-[11px] text-zinc-500">Playlist • {likedCount} songs</span>
              </div>
            </button>

            {/* Divider */}
            {playlists.length > 0 && (
              <div className="my-2 border-t border-zinc-800/60" />
            )}

            {/* Custom Playlists */}
            {playlists.map((pl) => {
              const isActive = activePlaylistId === pl.id;
              return (
                <button
                  key={pl.id}
                  onClick={() => { setActivePlaylistId(pl.id); setActiveTab('playlist'); }}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left group ${
                    isActive ? 'bg-zinc-800' : 'hover:bg-zinc-800'
                  }`}
                >
                  <div className="w-10 h-10 rounded-md bg-zinc-700 flex items-center justify-center shrink-0">
                    <Music className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={`text-sm font-semibold truncate ${isActive ? 'text-[#1DB954]' : 'text-white'}`}>{pl.name}</span>
                    <span className="text-[11px] text-zinc-500">Playlist • {pl.trackIds.length} songs</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ─── Mobile Bottom Navigation ─── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around py-2 px-1 z-40 border-t border-zinc-800/70"
        style={{ background: 'rgba(9,9,11,0.97)', backdropFilter: 'blur(20px)' }}
      >
        {([
          { key: 'home' as ActiveTab, label: 'Home', Icon: Home },
          { key: 'search' as ActiveTab, label: 'Search', Icon: Search },
          { key: 'allSongs' as ActiveTab, label: 'Songs', Icon: ListMusic },
          { key: 'library' as ActiveTab, label: 'Library', Icon: Library },
          { key: 'liked' as ActiveTab, label: 'Liked', Icon: Heart },
        ] as const).map(({ key, label, Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setActivePlaylistId(null); }}
              className="flex flex-col items-center gap-0.5 min-w-[52px] min-h-[48px] justify-center transition-all active:scale-90"
              style={{ color: isActive ? '#1DB954' : '#71717a' }}
            >
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] font-semibold tracking-tight">{label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
