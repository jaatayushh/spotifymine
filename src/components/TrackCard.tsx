import React, { useState } from 'react';
import { Play, Pause, Heart, Music, ListPlus, Plus } from 'lucide-react';
import { Track } from '../types';
import { generateCoverArt } from '../utils/audioUtils';
import { useLongPress } from '../utils/useLongPress';
import { TrackContextMenu } from './TrackContextMenu';

interface TrackCardProps {
  track: Track;
  isPlaying: boolean;
  isCurrentTrack: boolean;
  isLiked: boolean;
  onPlay: (track: Track) => void;
  onToggleLike: (trackId: string, e: React.MouseEvent) => void;
  onAddToPlaylist?: (track: Track) => void;
  onAddToQueue?: (track: Track) => void;
}

export const TrackCard: React.FC<TrackCardProps> = ({
  track,
  isPlaying,
  isCurrentTrack,
  isLiked,
  onPlay,
  onToggleLike,
  onAddToPlaylist,
  onAddToQueue,
}) => {
  const fallbackSvg = generateCoverArt(track.title, track.artist, track.gradientColors);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const longPress = useLongPress((pos) => setMenuPos(pos));

  return (
    <div
      onClick={() => onPlay(track)}
      {...longPress}
      className="group relative bg-[#181818] hover:bg-[#282828] p-3 rounded-md cursor-pointer transition-colors duration-200 flex flex-col gap-3"
    >
      {/* Cover Art */}
      <div className="relative aspect-square w-full rounded-md overflow-hidden shadow-2xl">
        <img
          src={track.coverArtUrl || fallbackSvg}
          alt={track.title}
          onError={(e) => { e.currentTarget.src = fallbackSvg; }}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />

        {/* Equalizer overlay when playing */}
        {isCurrentTrack && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            {isPlaying ? (
              <div className="flex items-end gap-[3px] h-6">
                <span className="w-[3px] bg-[#1DB954] rounded-full eq-bar-1" style={{ height: '100%', transformOrigin: 'bottom' }} />
                <span className="w-[3px] bg-[#1DB954] rounded-full eq-bar-2" style={{ height: '75%', transformOrigin: 'bottom' }} />
                <span className="w-[3px] bg-[#1DB954] rounded-full eq-bar-3" style={{ height: '100%', transformOrigin: 'bottom' }} />
                <span className="w-[3px] bg-[#1DB954] rounded-full eq-bar-4" style={{ height: '55%', transformOrigin: 'bottom' }} />
              </div>
            ) : (
              <Music className="w-7 h-7 text-[#1DB954]" />
            )}
          </div>
        )}

        {/* Play button — appears on hover */}
        <div
          className={`absolute bottom-2 right-2 transition-all duration-200 ${
            isCurrentTrack
              ? 'translate-y-0 opacity-100'
              : 'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
          }`}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onPlay(track); }}
            className="w-10 h-10 rounded-full bg-[#1DB954] hover:bg-[#1ed760] hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-2xl transition-all duration-150"
            aria-label={isCurrentTrack && isPlaying ? 'Pause' : 'Play'}
          >
            {isCurrentTrack && isPlaying
              ? <Pause className="w-4 h-4 fill-black" />
              : <Play className="w-4 h-4 fill-black translate-x-0.5" />}
          </button>
        </div>

        {/* Top-right action buttons */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onAddToQueue && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToQueue(track); }}
              className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              title="Add to Queue"
            >
              <ListPlus className="w-3.5 h-3.5" />
            </button>
          )}
          {onAddToPlaylist && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToPlaylist(track); }}
              className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              title="Add to Playlist"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Persistent heart when liked */}
        {isLiked && (
          <div className="absolute top-2 left-2">
            <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
              <Heart className="w-3 h-3 fill-[#1DB954] text-[#1DB954]" />
            </div>
          </div>
        )}
      </div>

      {/* Track info */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <h3 className={`text-sm font-semibold truncate leading-tight ${isCurrentTrack ? 'text-[#1DB954]' : 'text-white'}`}>
          {track.title}
        </h3>
        <p className="text-xs text-zinc-400 truncate">{track.artist || 'Unknown Artist'}</p>
      </div>

      {/* Like button — hover only, separate from image */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleLike(track.id, e); }}
        className={`absolute top-2 left-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center transition-all ${
          isLiked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        } hover:scale-110 active:scale-90`}
        title={isLiked ? 'Remove from Liked' : 'Save to Liked'}
      >
        <Heart className={`w-3.5 h-3.5 transition-colors ${isLiked ? 'fill-[#1DB954] text-[#1DB954]' : 'text-white'}`} />
      </button>

      {menuPos && (
        <TrackContextMenu
          track={track}
          position={menuPos}
          isLiked={isLiked}
          onClose={() => setMenuPos(null)}
          onPlay={onPlay}
          onAddToQueue={onAddToQueue}
          onAddToPlaylist={onAddToPlaylist}
          onToggleLike={onToggleLike}
        />
      )}
    </div>
  );
};
