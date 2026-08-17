import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Play / Pause audio playback' },
    { key: 'M', desc: 'Mute / Unmute volume' },
    { key: 'S', desc: 'Toggle Shuffle mode' },
    { key: 'R', desc: 'Cycle Repeat mode (Off / All / 1)' },
    { key: 'L', desc: 'Like / Unlike current track' },
    { key: 'F', desc: 'Toggle Full Screen Player' },
    { key: 'Shift + Right', desc: 'Jump to Next track' },
    { key: 'Shift + Left', desc: 'Jump to Previous track' },
    { key: '?', desc: 'Open Keyboard Shortcuts menu' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-md bg-[#282828] border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden text-white p-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-700/60 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-[#1DB954]/20 text-[#1DB954]">
              <Keyboard className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
          {shortcuts.map((sc) => (
            <div
              key={sc.key}
              className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80"
            >
              <span className="text-xs text-zinc-300 font-medium">{sc.desc}</span>
              <kbd className="px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-[11px] font-mono font-bold text-[#1DB954]">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-zinc-700/60 mt-4 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full text-xs font-bold text-black bg-[#1DB954] hover:bg-[#1ed760] transition-all shadow active:scale-95"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
