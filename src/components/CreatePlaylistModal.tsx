import React, { useState } from 'react';
import { X, Music } from 'lucide-react';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string) => void;
}

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), description.trim());
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-md bg-[#282828] border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden text-white p-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-700/60 mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-[#1DB954]/20 text-[#1DB954]">
              <Music className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold">Create New Playlist</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Playlist Name <span className="text-[#1DB954]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. My Favorite Chill Hits"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-[#1DB954] text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Give your playlist a descriptive tagline..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-[#1DB954] text-sm resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-6 py-2.5 rounded-full text-xs font-bold text-black bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-50 transition-all shadow-md active:scale-95"
            >
              Create Playlist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
