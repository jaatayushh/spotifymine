import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  LogOut,
  Download,
  Shield,
  Keyboard,
} from 'lucide-react';
import { ActiveTab } from '../types';
import { User as FirebaseUser } from 'firebase/auth';

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
  onOpenShortcuts?: () => void;
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
  onOpenShortcuts,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const isAdmin = user?.email === ADMIN_EMAIL;
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <header
      className="sticky top-0 z-30 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 shrink-0"
      style={{
        background: 'rgba(18,18,18,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Left: nav arrows + search */}
      <div className="flex items-center gap-2 flex-1 max-w-2xl">
        <div className="hidden md:flex items-center gap-1 shrink-0">
          <button
            onClick={() => window.history.back()}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            title="Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.history.forward()}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            title="Forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Search bar — desktop */}
        <div className="relative flex-1 max-w-md hidden sm:block">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim() && setActiveTab && activeTab !== 'search') {
                setActiveTab('search');
              }
            }}
            placeholder="What do you want to listen to?"
            className="w-full rounded-full pl-10 pr-9 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid transparent',
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = '1px solid #fff';
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
              if (setActiveTab && activeTab !== 'search' && searchQuery.trim()) {
                setActiveTab('search');
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = '1px solid transparent';
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 rounded-full transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right: Shortcuts + Install + Auth */}
      <div className="flex items-center gap-2 shrink-0">
        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            title="Keyboard Shortcuts (?)"
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <Keyboard className="w-4 h-4 text-[#1DB954]" />
          </button>
        )}

        <button
          onClick={onOpenInstallModal}
          title="Install App"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-300 hover:text-white transition-all active:scale-95"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>

        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-all active:scale-95 hover:bg-zinc-800"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={displayName} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#1DB954] flex items-center justify-center text-black font-black text-xs shrink-0">
                  {initials}
                </div>
              )}
              <span className="hidden sm:block text-sm font-semibold text-white max-w-[100px] truncate">
                {displayName}
              </span>
            </button>

            {showDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                <div
                  className="absolute right-0 top-full mt-2 w-60 rounded-lg py-1 z-50 shadow-2xl"
                  style={{
                    background: '#282828',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-zinc-700/40">
                    <div className="flex items-center gap-3">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center text-black font-black shrink-0">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{displayName}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>

                  {isAdmin && onOpenAdmin && (
                    <button
                      onClick={() => { setShowDropdown(false); onOpenAdmin(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#1DB954] hover:bg-zinc-700/50 transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      Admin Panel
                    </button>
                  )}

                  <button
                    onClick={() => { setShowDropdown(false); onOpenInstallModal(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700/50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Install App
                  </button>

                  <div className="my-1 border-t border-zinc-700/40" />

                  <button
                    onClick={() => { setShowDropdown(false); onLogOut(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700/50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAuthModal}
              className="px-4 py-1.5 rounded-full text-sm font-semibold text-black transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #1DB954, #1ed760)' }}
            >
              Log in
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
