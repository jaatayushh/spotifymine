import React from 'react';
import { X, User, LogOut, CheckCircle2 } from 'lucide-react';
import { FirebaseUser } from '../main';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser | null;
  onLogOut: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogOut,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-sm bg-[#282828] border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden text-white p-6 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 rounded-full bg-[#1DB954]/20 text-[#1DB954] flex items-center justify-center mx-auto mb-4 border border-[#1DB954]/30">
          <User className="w-8 h-8" />
        </div>

        {user ? (
          <div className="space-y-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1DB954]/10 border border-[#1DB954]/30 text-[#1DB954] text-xs font-bold mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> Logged In
              </div>
              <h2 className="text-lg font-bold text-white">{user.displayName || 'Spotify User'}</h2>
              <p className="text-xs text-zinc-400 mt-0.5">{user.email}</p>
            </div>

            <div className="pt-2 border-t border-zinc-700/60">
              <button
                onClick={() => {
                  onLogOut();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-all active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                Sign Out Account
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Guest Account</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                You are currently listening in Guest session mode. All playlists, favorites, and settings are saved locally to your browser.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full px-6 py-2.5 rounded-full text-xs font-bold text-black bg-[#1DB954] hover:bg-[#1ed760] transition-all shadow-md active:scale-95"
            >
              Continue Listening
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
