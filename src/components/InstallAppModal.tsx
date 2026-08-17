import React from 'react';
import { X, Download, ShieldCheck } from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
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
          <Download className="w-8 h-8" />
        </div>

        <h2 className="text-lg font-bold text-white mb-1">Install SpotifyMine PWA</h2>
        <p className="text-xs text-zinc-400 leading-relaxed mb-5">
          Install SpotifyMine directly to your desktop or mobile home screen for offline support, instant launching, and native audio background controls!
        </p>

        <div className="space-y-3">
          <button
            onClick={() => {
              alert('SpotifyMine is a Progressive Web App (PWA). Click your browser address bar menu ("Install App" or "Add to Home Screen") to install instantly!');
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold text-black bg-[#1DB954] hover:bg-[#1ed760] transition-all shadow-md active:scale-95"
          >
            <Download className="w-4 h-4" />
            Install App Now
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1DB954]" />
            Fast, secure & light (no download needed)
          </div>
        </div>
      </div>
    </div>
  );
};
