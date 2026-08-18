import React from 'react';
import {
  Home,
  Search,
  Library,
  Heart,
  Plus,
  Music,
  Disc,
  Folder,
  Mic2,
  Sparkles,
  ListMusic,
  X,
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
  onOpenQueue?: () => void;
  onCloseSidebar?: () => void;
  isSidebarOpen?: boolean;
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
  onOpenQueue,
  onCloseSidebar,
  isSidebarOpen = true,
}) => {

  const navItem = (
    key: ActiveTab,
    label: string,
    Icon: React.ElementType,
    onClick?: () => void
  ) => {
    const isActive = activeTab === key && !activePlaylistId;
    return (
      <button
        onClick={onClick || (() => { setActiveTab(key); setActivePlaylistId(null); })}
        className="relative flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 w-full text-left"
        style={{
          background: isActive ? 'rgba(29,185,84,0.12)' : 'transparent',
          color: isActive ? '#ffffff' : '#71717a',
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#d4d4d8'; e.currentTarget.style.background = isActive ? 'rgba(29,185,84,0.12)' : 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = isActive ? '#ffffff' : '#71717a'; e.currentTarget.style.background = isActive ? 'rgba(29,185,84,0.12)' : 'transparent'; }}
      >
        {isActive && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
            style={{ background: '#1DB954', boxShadow: '0 0 8px #1DB954' }}
          />
        )}
        <Icon
          className="w-5 h-5 shrink-0"
          style={{ color: isActive ? '#1DB954' : 'currentColor' }}
        />
        <span>{label}</span>
      </button>
    );
  };

  if (!isSidebarOpen) return null;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col w-72 lg:w-80 p-2 gap-2 shrink-0 select-none transition-all duration-200"
        style={{ background: '#000000' }}
      >

        {/* Library Block */}
        <div className="bg-[#121212] rounded-xl p-3 flex-1 flex flex-col gap-2 overflow-hidden border border-zinc-800/40">
          {/* Library Header */}
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors cursor-pointer" onClick={() => setActiveTab('library')}>
              <Library className="w-6 h-6" />
              <span className="font-bold text-sm text-white">Your Library</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onRequestCreatePlaylist}
                className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-all"
                title="Create playlist"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  if (onCloseSidebar) {
                    onCloseSidebar();
                  } else {
                    setActiveTab('home');
                    setActivePlaylistId(null);
                  }
                }}
                className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-all"
                title="Close Your Library"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 px-1 py-1">
            <button
              onClick={() => setActiveTab('library')}
              className="bg-[#2a2a2a] hover:bg-[#333333] text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all"
            >
              Playlists
            </button>
          </div>

          {/* Search & Recents header */}
          <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-zinc-400">
            <Search className="w-4 h-4 text-zinc-400 hover:text-white cursor-pointer" />
            <div className="flex items-center gap-1 cursor-pointer hover:text-white">
              <span>Recents</span>
              <ListMusic className="w-4 h-4" />
            </div>
          </div>

          {/* Playlists List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {/* Today's Mix */}
            <button
              onClick={() => {
                setActiveTab('home');
                setActivePlaylistId(null);
                if (onOpenTodaysMix) onOpenTodaysMix();
              }}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/60 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded bg-gradient-to-br from-emerald-500 via-teal-600 to-green-700 flex items-center justify-center shrink-0 shadow">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold truncate text-white group-hover:text-emerald-400 transition-colors">Today's Mix</span>
                <span className="text-xs text-zinc-400 truncate">📌 Playlist • 100 songs</span>
              </div>
            </button>

            {/* Liked Songs */}
            <button
              onClick={() => { setActiveTab('liked'); setActivePlaylistId(null); }}
              className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left group ${
                activeTab === 'liked' ? 'bg-zinc-800/80 text-white' : 'hover:bg-zinc-800/60 text-zinc-300'
              }`}
            >
              <div className="w-12 h-12 rounded bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shrink-0 shadow">
                <Heart className="w-5 h-5 fill-white text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold truncate text-white">Liked Songs</span>
                <span className="text-xs text-zinc-400 truncate">📌 Playlist • {likedCount} songs</span>
              </div>
            </button>

            {/* Custom Playlists */}
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => { setActivePlaylistId(pl.id); setActiveTab('playlist'); }}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left group ${
                  activePlaylistId === pl.id ? 'bg-zinc-800/80 text-white' : 'hover:bg-zinc-800/60 text-zinc-300'
                }`}
              >
                <div className="w-12 h-12 rounded bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden border border-zinc-700/50">
                  <ListMusic className="w-5 h-5 text-zinc-400" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold truncate text-white">{pl.name}</span>
                  <span className="text-xs text-zinc-400 truncate">📌 Playlist • Ayush</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around py-2.5 px-3 z-40"
        style={{
          background: 'rgba(0,0,0,0.96)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {([
          { key: 'home' as ActiveTab, label: 'Home', Icon: Home },
          { key: 'search' as ActiveTab, label: 'Search', Icon: Search },
          { key: 'allSongs' as ActiveTab, label: 'All Songs', Icon: ListMusic },
          { key: 'library' as ActiveTab, label: 'Library', Icon: Library },
          { key: 'liked' as ActiveTab, label: 'Liked', Icon: Heart },
        ]).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setActivePlaylistId(null); }}
            className="flex flex-col items-center gap-1 text-[10px] font-semibold min-w-[48px] min-h-[44px] justify-center transition-colors"
            style={{ color: activeTab === key ? '#1DB954' : '#52525b' }}
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </>
  );
};
