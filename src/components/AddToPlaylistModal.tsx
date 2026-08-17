import React from 'react';
import { X, Plus, ListMusic, Check } from 'lucide-react';
import { Playlist, Track } from '../types';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  track: Track | null;
  playlists: Playlist[];
  onClose: () => void;
  onAddToPlaylist: (track: Track, playlistId: string) => void;
  onCreatePlaylist: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  isOpen,
  track,
  playlists,
  onClose,
  onAddToPlaylist,
  onCreatePlaylist,
}) => {
  if (!isOpen || !track) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-sm bg-[#282828] border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden text-white p-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-700/60 mb-4">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <ListMusic className="w-5 h-5 text-[#1DB954] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate">Add to Playlist</h2>
              <p className="text-[11px] text-zinc-400 truncate">{track.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => {
            onClose();
            onCreatePlaylist();
          }}
          className="w-full flex items-center gap-3 p-3 mb-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-700/80 border border-zinc-700 text-left transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#1DB954] text-black flex items-center justify-center font-bold shadow group-hover:scale-105 transition-transform">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Create New Playlist</p>
            <p className="text-[10px] text-zinc-400">Start with a fresh custom mix</p>
          </div>
        </button>

        <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
          {playlists.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-6">No custom playlists created yet</p>
          ) : (
            playlists.map((pl) => {
              const alreadyAdded = pl.tracks.some((t) => t.id === track.id);
              return (
                <button
                  key={pl.id}
                  onClick={() => {
                    onAddToPlaylist(track, pl.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-700/60 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                      <ListMusic className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{pl.title}</p>
                      <p className="text-[10px] text-zinc-400">{pl.tracks.length} tracks</p>
                    </div>
                  </div>

                  {alreadyAdded ? (
                    <span className="text-[10px] font-bold text-[#1DB954] flex items-center gap-1 shrink-0">
                      <Check className="w-3.5 h-3.5" /> Added
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-zinc-400 group-hover:text-white shrink-0">
                      + Add
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
