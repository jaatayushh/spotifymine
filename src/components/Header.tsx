import React, { useState } from 'react';
import {
  Search,
  Home,
  X,
  LogOut,
  LogIn,
  Download,
  Shield,
  FolderKanban,
  Library,
} from 'lucide-react';
import { ActiveTab } from '../types';
import { FirebaseUser } from '../lib/firebase';

const ADMIN_EMAIL = 'canwingamers@gmail.com';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab?: (tab: ActiveTab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  user: FirebaseUser | null;
  onOpenAuthModal: () => void;
  onLogOut: () => void;
  onOpenInstallModal: () => void;
  onOpenAdmin?: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  user,
  onOpenAuthModal,
  onLogOut,
  onOpenInstallModal,
  onOpenAdmin,
  onToggleSidebar,
  isSidebarOpen = true,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <header className="sticky top-0 z-30 px-6 py-3 flex items-center justify-between gap-4 bg-black select-none">
      {/* Left: Spotify Brand Icon & Optional Library Sidebar Toggle */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0 shadow-md">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-black fill-current">
            <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm5.521 17.341c-.217.357-.681.469-1.038.252-2.839-1.735-6.413-2.128-10.623-1.164-.404.093-.812-.164-.904-.567-.093-.404.164-.812.567-.904 4.606-1.053 8.556-.6 11.745 1.349.357.217.469.681.253 1.034zm1.474-3.277c-.273.444-.856.587-1.3.314-3.25-1.998-8.204-2.578-12.046-1.411-.497.151-1.026-.134-1.177-.63-.151-.497.134-1.026.63-1.177 4.387-1.332 9.851-.689 13.579 1.604.444.273.587.856.314 1.3zm.126-3.414C15.228 8.423 8.815 8.211 5.129 9.329c-.58.176-1.192-.158-1.368-.737-.176-.58.158-1.192.737-1.368 4.231-1.284 11.31-1.042 15.656 1.538.523.311.693.993.382 1.516-.311.523-.993.693-1.516.382z"/>
          </svg>
        </div>

        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={`p-2 rounded-full transition-all ${
              !isSidebarOpen ? 'bg-[#1f1f1f] text-[#1DB954]' : 'text-zinc-400 hover:text-white hover:bg-[#1f1f1f]'
            }`}
            title={isSidebarOpen ? 'Collapse Your Library' : 'Expand Your Library'}
          >
            <Library className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Center: Home Button & Search Bar */}
      <div className="flex items-center gap-2 flex-1 max-w-2xl justify-center">
        <button
          onClick={() => setActiveTab && setActiveTab('home')}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            activeTab === 'home' ? 'bg-[#1f1f1f] text-white' : 'bg-[#1f1f1f] text-zinc-400 hover:text-white'
          }`}
          title="Home"
        >
          <Home className="w-6 h-6" />
        </button>

        {/* Search Bar Container */}
        <div className="relative flex-1 max-w-lg">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim() && setActiveTab && activeTab !== 'search') {
                setActiveTab('search');
              }
            }}
            onFocus={() => {
              if (setActiveTab && activeTab !== 'search' && searchQuery.trim()) {
                setActiveTab('search');
              }
            }}
            placeholder="What do you want to play?"
            className="w-full bg-[#1f1f1f] hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] rounded-full pl-12 pr-12 py-3 text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all font-medium"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setActiveTab && setActiveTab('allSongs')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 rounded-full"
              title="Browse All Tracks"
            >
              <FolderKanban className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Right Controls: Explore Premium + Install + User Profile */}
      <div className="flex items-center gap-3 shrink-0">


        <button
          onClick={onOpenInstallModal}
          className="flex items-center gap-1.5 bg-[#000000] hover:scale-105 border border-zinc-700 hover:border-zinc-500 text-white font-bold text-xs px-3 py-1.5 rounded-full transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Install App</span>
        </button>

        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-9 h-9 rounded-full bg-[#1f1f1f] hover:bg-[#2a2a2a] flex items-center justify-center text-white font-extrabold text-xs transition-all ring-1 ring-white/10"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1DB954] to-emerald-300 flex items-center justify-center text-black font-black text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            {/* Dropdown */}
            {showDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#282828] border border-zinc-700/60 rounded-xl py-1.5 z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-zinc-700/60">
                    <p className="text-xs font-bold text-white truncate">{displayName}</p>
                    <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
                  </div>

                  {isAdmin && onOpenAdmin && (
                    <button
                      onClick={() => { setShowDropdown(false); onOpenAdmin(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-[#1DB954] hover:bg-zinc-700/50 transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin Panel</span>
                    </button>
                  )}

                  <button
                    onClick={() => { setShowDropdown(false); onLogOut(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-zinc-700/50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="bg-[#1DB954] hover:scale-105 active:scale-95 text-black font-extrabold text-xs px-5 py-2 rounded-full transition-all shadow-md"
          >
            Log In
          </button>
        )}
      </div>
    </header>
  );
};
