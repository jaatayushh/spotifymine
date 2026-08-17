import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ActiveTab,
  AiPlaylist,
  Playlist,
  RepeatMode,
  ToastMessage,
  Track
} from './types';
import {
  parseTrackMetadata,
  HF_CONFIG,
  SUPPORTED_AUDIO_EXTENSIONS,
  shuffleArray,
  getStreamableAudioUrl,
  isSafariBrowser,
  isSafariPlayable
} from './utils/audioUtils';
import { Storage } from './utils/storage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MainView } from './components/MainView';
import { PlayerBar } from './components/PlayerBar';
import { QueueModal } from './components/QueueModal';
import { Toast } from './components/Toast';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import { AddToPlaylistModal } from './components/AddToPlaylistModal';
import { AuthModal } from './components/AuthModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { ExpandedNowPlayingModal } from './components/ExpandedNowPlayingModal';
import { InstallAppModal } from './components/InstallAppModal';
import {
  auth,
  logOutUser,
  FirebaseUser,
  subscribeToUserPlaylists,
  savePlaylistToFirestore,
  updatePlaylistTracksInFirestore,
  deletePlaylistFromFirestore,
} from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
  // Navigation & View States
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Firebase Auth State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // "Install App" (PWA) State
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    const installedHandler = () => setDeferredInstallPrompt(null);
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  // Maximized Full-Screen Player State
  const [isMaximizedPlayerOpen, setIsMaximizedPlayerOpen] = useState(false);
  const [maximizedInitialTab, setMaximizedInitialTab] = useState<'art' | 'lyrics'>('art');

  // Notifications Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Helper to add notification toasts
  const addToast = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Audio Tracks 
  const [tracks, setTracks] = useState<Track[]>([]);
  // AI-generated daily playlists (Punjabi Mix, Haryanvi Mix, Hindi Mix,
  // Love Mix...) — same for every visitor for the day, regenerated once
  // every 24h server-side.
  const [aiPlaylists, setAiPlaylists] = useState<AiPlaylist[]>([]);
  // 100-song Today's Mix state (shuffled once per session/tracks load, allowing removal)
  const [todaysMixTrackIds, setTodaysMixTrackIds] = useState<string[]>([]);
  useEffect(() => {
    if (tracks.length > 0 && todaysMixTrackIds.length === 0) {
      // Fill up to 100 tracks with random selection across passes
      const hundredTracks: Track[] = [];
      while (hundredTracks.length < 100 && tracks.length > 0) {
        const shuffledPass: Track[] = shuffleArray(tracks);
        for (const t of shuffledPass) {
          if (hundredTracks.length < 100) hundredTracks.push(t);
        }
      }
      setTodaysMixTrackIds(hundredTracks.map((t, idx) => `${t.id}_${idx}`));
    }
  }, [tracks]);

  // Construct actual track objects for Today's Mix
  const todaysMixTracks = useMemo(() => {
    return todaysMixTrackIds
      .map((compositeId) => {
        const originalId = compositeId.split('_')[0];
        const track = tracks.find((t) => t.id === originalId);
        if (!track) return null;
        // Ensure unique ID instance so removal targets exact entry
        return { ...track, instanceId: compositeId };
      })
      .filter((t): t is (Track & { instanceId: string }) => t !== null);
  }, [todaysMixTrackIds, tracks]);

  const handleRemoveFromTodaysMix = useCallback((instanceId: string) => {
    setTodaysMixTrackIds((prev) => prev.filter((id) => id !== instanceId));
    addToast('Removed song from Today\'s Mix', 'info');
  }, [addToast]);

  const [isLoadingHF, setIsLoadingHF] = useState(false);

  // Playlists & Local State
  const [playlists, setPlaylists] = useState<Playlist[]>(() => Storage.getCustomPlaylists());
  const [likedTrackIds, setLikedTrackIds] = useState<string[]>(() => Storage.getLikedTrackIds());

  // Player State
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState<number>(() => Storage.getVolume());
  const [isMuted, setIsMutedState] = useState<boolean>(() => Storage.getMuted());
  const [isShuffle, setIsShuffle] = useState(true);
  // Last few track ids played during smart shuffle, so it doesn't repeat
  // the same handful of songs back-to-back. A ref (not state) since it's
  // only read/written at track-transition time, never needs to re-render.
  const recentlyShuffledIdsRef = useRef<string[]>([]);
  // Stable shuffled play order — computed once when shuffle is switched on
  // (and reshuffled only after a full pass completes), instead of being
  // re-randomized on every render/re-shuffle-in-place.
  const [shuffledOrder, setShuffledOrder] = useState<Track[]>([]);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [userQueue, setUserQueue] = useState<Track[]>([]);
  const [isAutoplay, setIsAutoplay] = useState(true);
  // Track IDs played in the current listening pass/session so no song repeats until all are played
  const [playedSessionTrackIds, setPlayedSessionTrackIds] = useState<string[]>([]);

  // Playlist Modals State
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<Track | null>(null);

  // Crossfade settings (persisted in localStorage)
  const [crossfadeDuration, setCrossfadeDuration] = useState<number>(() => Storage.getCrossfade());

  // Dual-Deck Audio Refs for seamless overlapping crossfade playback
  const audioRefA = useRef<HTMLAudioElement | null>(null);
  const audioRefB = useRef<HTMLAudioElement | null>(null);
  const activeDeckRef = useRef<'A' | 'B'>('A');
  const fadeVolRefA = useRef<number>(1.0);
  const fadeVolRefB = useRef<number>(0.0);
  const isCrossfadingRef = useRef<boolean>(false);
  const crossfadeAnimFrameRef = useRef<number | null>(null);
  // Guard: prevents duplicate crossfade triggers from rapid timeupdate events
  const crossfadeTriggeredRef = useRef<boolean>(false);

  // Chunked-streaming buffered progress (drives the grey "downloaded" bar)
  const [bufferedPercent, setBufferedPercent] = useState(0);

  // Auto-generated playlists: play counts & recently played (persisted locally)
  const [playCounts, setPlayCounts] = useState<Record<string, number>>(() => Storage.getPlayCounts());
  const [recentlyPlayedIds, setRecentlyPlayedIds] = useState<string[]>(() => Storage.getRecentlyPlayed());

  const trackPlayStart = useCallback((track: Track) => {
    setPlayCounts(Storage.incrementPlayCount(track.id));
    setRecentlyPlayedIds(Storage.addRecentlyPlayed(track.id));
    setPlayedSessionTrackIds((prev) => (prev.includes(track.id) ? prev : [...prev, track.id]));
  }, []);

  // Synchronize actual volume of both audio decks based on master volume, mute, and crossfade attenuation
  const syncDeckVolumes = useCallback(() => {
    const master = isMuted ? 0 : volume;
    if (audioRefA.current) {
      audioRefA.current.volume = Math.max(0, Math.min(1, master * fadeVolRefA.current));
    }
    if (audioRefB.current) {
      audioRefB.current.volume = Math.max(0, Math.min(1, master * fadeVolRefB.current));
    }
  }, [volume, isMuted]);

  // Cancel any active crossfade animation frame and reset fade levels to active deck
  const cancelCrossfade = useCallback(() => {
    if (crossfadeAnimFrameRef.current !== null) {
      cancelAnimationFrame(crossfadeAnimFrameRef.current);
      crossfadeAnimFrameRef.current = null;
    }
    isCrossfadingRef.current = false;
    crossfadeTriggeredRef.current = false;
    if (activeDeckRef.current === 'A') {
      fadeVolRefA.current = 1.0;
      fadeVolRefB.current = 0.0;
      if (audioRefB.current) {
        audioRefB.current.pause();
        audioRefB.current.currentTime = 0;
      }
    } else {
      fadeVolRefA.current = 0.0;
      fadeVolRefB.current = 1.0;
      if (audioRefA.current) {
        audioRefA.current.pause();
        audioRefA.current.currentTime = 0;
      }
    }
    syncDeckVolumes();
  }, [syncDeckVolumes]);

  const handleCrossfadeChange = useCallback((seconds: number) => {
    const clamped = Math.max(0, Math.min(12, seconds));
    setCrossfadeDuration(clamped);
    Storage.setCrossfade(clamped);
  }, []);

  // Firebase Auth Observer & Real-time Playlist Listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  // Sync playlists from Firebase Firestore when logged in
  useEffect(() => {
    if (!user) {
      setPlaylists(Storage.getCustomPlaylists());
      return;
    }

    const unsubscribePlaylists = subscribeToUserPlaylists(
      user.uid,
      (remotePlaylists) => {
        setPlaylists(remotePlaylists);
        Storage.setCustomPlaylists(remotePlaylists);
      },
      (err) => {
        console.error('Failed to sync playlists from Firebase:', err);
      }
    );

    return () => unsubscribePlaylists();
  }, [user]);

  const handleLogOut = useCallback(async () => {
    try {
      await logOutUser();
      addToast('Logged out successfully', 'info');
    } catch (err: any) {
      addToast('Failed to log out', 'error');
    }
  }, [addToast]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleClearUserQueue = useCallback(() => {
    setUserQueue([]);
    addToast('Queue cleared', 'info');
  }, [addToast]);

  // Stable "Up Next" list for the Queue modal — derived directly from current order context
  const upNextQueue = useMemo(() => {
    const userQueueIds = new Set(userQueue.map((t) => t.id));
    if (isShuffle && shuffledOrder.length > 0) {
      const currentIdx = shuffledOrder.findIndex((t) => t.id === currentTrack?.id);
      const upcoming = currentIdx !== -1 ? shuffledOrder.slice(currentIdx + 1) : shuffledOrder.filter((t) => t.id !== currentTrack?.id);
      return upcoming.filter(
        (t) => !playedSessionTrackIds.includes(t.id) && !userQueueIds.has(t.id)
      );
    }

    // Linear playlist mode
    const currentIdx = tracks.findIndex((t) => t.id === currentTrack?.id);
    const upcoming = currentIdx !== -1 ? tracks.slice(currentIdx + 1) : tracks;
    return upcoming.filter(
      (t) => t.id !== currentTrack?.id && !playedSessionTrackIds.includes(t.id) && !userQueueIds.has(t.id)
    );
  }, [isShuffle, shuffledOrder, tracks, currentTrack, playedSessionTrackIds, userQueue]);

  // Helper to compute the next track based on userQueue, shuffle order, autoplay, and Safari compatibility
  const getNextTrackCandidate = useCallback(
    (peekOnly = false): Track | null => {
      if (tracks.length === 0) return null;

      let nextTrack: Track | null = null;

      // 1. Explicit user queue has highest priority
      if (userQueue.length > 0) {
        nextTrack = userQueue[0];
        if (!peekOnly) {
          setUserQueue((prev) => prev.slice(1));
        }
      } else if (upNextQueue.length > 0) {
        // 2. Play the exact top item shown in the "Up Next" queue list!
        nextTrack = upNextQueue[0];
      } else {
        // 3. Queue / pass exhausted — reset session history & start fresh pass
        let candidatePool = tracks.filter((t) => t.id !== currentTrack?.id);
        if (candidatePool.length === 0) candidatePool = tracks;

        if (!peekOnly) {
          setPlayedSessionTrackIds(currentTrack ? [currentTrack.id] : []);
        }

        if (isShuffle) {
          const freshOrder = currentTrack
            ? [currentTrack, ...shuffleArray(tracks.filter((t) => t.id !== currentTrack.id))]
            : shuffleArray(tracks);
          if (!peekOnly) {
            setShuffledOrder(freshOrder);
          }
          nextTrack = freshOrder.find((t) => t.id !== currentTrack?.id) || freshOrder[0] || null;
        } else {
          nextTrack = candidatePool[0] || null;
        }
      }

      if (nextTrack && isSafariBrowser() && !isSafariPlayable(nextTrack.path)) {
        const playableTracks = tracks.filter((t) => isSafariPlayable(t.path));
        nextTrack =
          playableTracks.length > 0
            ? playableTracks[Math.floor(Math.random() * playableTracks.length)]
            : null;
      }

      return nextTrack;
    },
    [tracks, currentTrack, isShuffle, userQueue, upNextQueue]
  );

  // Start crossfading between active deck and secondary deck smoothly
  const startCrossfadeTransition = useCallback(
    (targetTrack: Track, fadeSecs: number) => {
      const outgoingDeckKey = activeDeckRef.current;
      const incomingDeckKey = outgoingDeckKey === 'A' ? 'B' : 'A';
      const outgoingAudio = outgoingDeckKey === 'A' ? audioRefA.current : audioRefB.current;
      const incomingAudio = incomingDeckKey === 'A' ? audioRefA.current : audioRefB.current;

      if (!incomingAudio) return;

      if (crossfadeAnimFrameRef.current !== null) {
        cancelAnimationFrame(crossfadeAnimFrameRef.current);
        crossfadeAnimFrameRef.current = null;
      }

      isCrossfadingRef.current = true;

      // Immediately switch active deck to incoming deck so UI reads incoming track state
      activeDeckRef.current = incomingDeckKey;

      // Prepare incoming deck starting cleanly from 0:00
      incomingAudio.src = getStreamableAudioUrl(targetTrack);
      incomingAudio.currentTime = 0;

      // Set starting fade levels
      if (incomingDeckKey === 'A') {
        fadeVolRefA.current = 0.0;
        fadeVolRefB.current = 1.0;
      } else {
        fadeVolRefA.current = 1.0;
        fadeVolRefB.current = 0.0;
      }
      syncDeckVolumes();

      // Update UI state immediately to the incoming track starting at 0:00
      setCurrentTrack(targetTrack);
      setCurrentTime(0);
      setDuration(targetTrack.duration || 0);
      trackPlayStart(targetTrack);
      setBufferedPercent(0);
      document.title = `${targetTrack.title} • ${targetTrack.artist || 'Spotify'}`;

      // Update duration as soon as metadata loads for incoming track
      incomingAudio.onloadedmetadata = () => {
        setDuration(incomingAudio.duration || targetTrack.duration || 0);
      };

      // Start incoming audio playback
      incomingAudio
        .play()
        .then(() => {
          setIsPlaying(true);
          const startTime = performance.now();
          const durationMs = Math.max(400, fadeSecs * 1000);

          const animateFade = (currentTimeMs: number) => {
            const elapsed = currentTimeMs - startTime;
            const progress = Math.min(1, elapsed / durationMs);

            // Equal-power crossfade curve for smooth perceived constant loudness
            const outgoingFade = Math.cos(progress * 0.5 * Math.PI);
            const incomingFade = Math.sin(progress * 0.5 * Math.PI);

            if (incomingDeckKey === 'A') {
              fadeVolRefA.current = incomingFade;
              fadeVolRefB.current = outgoingFade;
            } else {
              fadeVolRefA.current = outgoingFade;
              fadeVolRefB.current = incomingFade;
            }

            syncDeckVolumes();

            if (progress < 1) {
              crossfadeAnimFrameRef.current = requestAnimationFrame(animateFade);
            } else {
              // Transition complete: stop outgoing audio cleanly
              if (incomingDeckKey === 'A') {
                fadeVolRefA.current = 1.0;
                fadeVolRefB.current = 0.0;
              } else {
                fadeVolRefA.current = 0.0;
                fadeVolRefB.current = 1.0;
              }
              if (outgoingAudio) {
                outgoingAudio.pause();
                outgoingAudio.currentTime = 0;
              }
              syncDeckVolumes();
              isCrossfadingRef.current = false;
              crossfadeTriggeredRef.current = false;
              crossfadeAnimFrameRef.current = null;
            }
          };

          crossfadeAnimFrameRef.current = requestAnimationFrame(animateFade);
        })
        .catch((err) => {
          if (err?.name !== 'AbortError' && !err?.message?.includes('interrupted')) {
            console.error('Crossfade audio playback error:', err);
          }
          if (incomingDeckKey === 'A') {
            fadeVolRefA.current = 1.0;
            fadeVolRefB.current = 0.0;
          } else {
            fadeVolRefA.current = 0.0;
            fadeVolRefB.current = 1.0;
          }
          syncDeckVolumes();
          isCrossfadingRef.current = false;
          crossfadeTriggeredRef.current = false;
        });
    },
    [syncDeckVolumes, trackPlayStart]
  );

  // Continuous Playback / Next Track handler
  const handleNextTrack = useCallback(() => {
    if (tracks.length === 0) return;

    let nextTrack: Track | null = null;
    if (repeatMode === 'one' && currentTrack) {
      nextTrack = currentTrack;
    } else {
      nextTrack = getNextTrackCandidate();
    }

    if (!nextTrack) return;

    // Use crossfade if enabled and currently playing
    if (crossfadeDuration > 0 && isPlaying) {
      startCrossfadeTransition(nextTrack, Math.min(crossfadeDuration, 4));
    } else {
      cancelCrossfade();
      setCurrentTrack(nextTrack);
      trackPlayStart(nextTrack);
      setBufferedPercent(0);

      const activeAudio = activeDeckRef.current === 'A' ? audioRefA.current : audioRefB.current;
      if (activeAudio) {
        activeAudio.src = getStreamableAudioUrl(nextTrack);
        activeAudio.currentTime = 0;
        activeAudio.load();
        activeAudio
          .play()
          .then(() => {
            setIsPlaying(true);
            document.title = `${nextTrack!.title} • ${nextTrack!.artist || 'Spotify'}`;
          })
          .catch((err) => {
            if (err?.name !== 'AbortError' && !err?.message?.includes('interrupted')) {
              console.error('Play next track error:', err);
            }
          });
      }
    }
  }, [
    tracks,
    repeatMode,
    currentTrack,
    getNextTrackCandidate,
    crossfadeDuration,
    isPlaying,
    startCrossfadeTransition,
    cancelCrossfade,
    trackPlayStart,
  ]);

  // Unified audio listeners for both decks
  useEffect(() => {
    const audioA = audioRefA.current;
    const audioB = audioRefB.current;
    if (!audioA || !audioB) return;

    const handleDeckTimeUpdate = (deck: 'A' | 'B') => {
      const activeDeck = activeDeckRef.current;
      if (deck === activeDeck) {
        const audio = deck === 'A' ? audioA : audioB;
        setCurrentTime(audio.currentTime);

        // Automatic end-of-track crossfade trigger
        // Use crossfadeTriggeredRef to prevent this from firing multiple times per track
        if (
          crossfadeDuration > 0 &&
          !isCrossfadingRef.current &&
          !crossfadeTriggeredRef.current &&
          audio.duration > 0 &&
          audio.duration - audio.currentTime <= crossfadeDuration &&
          audio.duration - audio.currentTime > 0.3
        ) {
          // Mark as triggered immediately to prevent race condition across rapid timeupdate events
          crossfadeTriggeredRef.current = true;
          isCrossfadingRef.current = true;

          let nextTrack: Track | null = null;
          if (repeatMode === 'one' && currentTrack) {
            nextTrack = currentTrack;
          } else {
            // Use peekOnly=true to look ahead without mutating queue state here;
            // startCrossfadeTransition will call getNextTrackCandidate(false) internally
            nextTrack = getNextTrackCandidate(true);
          }

          if (nextTrack) {
            // Dequeue properly now that we've committed
            if (repeatMode !== 'one') {
              getNextTrackCandidate(false);
            }
            startCrossfadeTransition(nextTrack, crossfadeDuration);
          } else {
            // No next track — reset guards
            crossfadeTriggeredRef.current = false;
            isCrossfadingRef.current = false;
          }
        }
      }
    };

    const handleDeckLoadedMetadata = (deck: 'A' | 'B') => {
      if (deck === activeDeckRef.current) {
        const audio = deck === 'A' ? audioA : audioB;
        setDuration(audio.duration || 0);
      }
    };

    const handleDeckProgress = (deck: 'A' | 'B') => {
      if (deck === activeDeckRef.current) {
        const audio = deck === 'A' ? audioA : audioB;
        try {
          if (audio.buffered.length > 0 && audio.duration) {
            const end = audio.buffered.end(audio.buffered.length - 1);
            setBufferedPercent(Math.min(100, (end / audio.duration) * 100));
          }
        } catch {
          // ignore transient errors
        }
      }
    };

    const handleDeckError = (deck: 'A' | 'B', e: Event) => {
      if (deck === activeDeckRef.current && !isCrossfadingRef.current) {
        console.error(`Audio error on deck ${deck}:`, e);
        addToast('Error loading audio stream. Skipping to next track...', 'error');
        setIsPlaying(false);
        setTimeout(() => {
          handleNextTrack();
        }, 1200);
      }
    };

    const handleDeckEnded = (deck: 'A' | 'B') => {
      // If we are already crossfading or this was the outgoing deck, ignore ended event
      if (deck === activeDeckRef.current && !isCrossfadingRef.current) {
        if (repeatMode === 'one' && currentTrack) {
          const audio = deck === 'A' ? audioA : audioB;
          audio.currentTime = 0;
          audio.play().catch((err) => {
            if (err?.name !== 'AbortError' && !err?.message?.includes('interrupted')) {
              console.error('Repeat play error:', err);
            }
          });
        } else {
          handleNextTrack();
        }
      }
    };

    const onTimeA = () => handleDeckTimeUpdate('A');
    const onTimeB = () => handleDeckTimeUpdate('B');
    const onMetaA = () => handleDeckLoadedMetadata('A');
    const onMetaB = () => handleDeckLoadedMetadata('B');
    const onProgA = () => handleDeckProgress('A');
    const onProgB = () => handleDeckProgress('B');
    const onErrA = (e: Event) => handleDeckError('A', e);
    const onErrB = (e: Event) => handleDeckError('B', e);
    const onEndA = () => handleDeckEnded('A');
    const onEndB = () => handleDeckEnded('B');

    audioA.addEventListener('timeupdate', onTimeA);
    audioB.addEventListener('timeupdate', onTimeB);
    audioA.addEventListener('loadedmetadata', onMetaA);
    audioB.addEventListener('loadedmetadata', onMetaB);
    audioA.addEventListener('progress', onProgA);
    audioB.addEventListener('progress', onProgB);
    audioA.addEventListener('error', onErrA);
    audioB.addEventListener('error', onErrB);
    audioA.addEventListener('ended', onEndA);
    audioB.addEventListener('ended', onEndB);

    return () => {
      audioA.removeEventListener('timeupdate', onTimeA);
      audioB.removeEventListener('timeupdate', onTimeB);
      audioA.removeEventListener('loadedmetadata', onMetaA);
      audioB.removeEventListener('loadedmetadata', onMetaB);
      audioA.removeEventListener('progress', onProgA);
      audioB.removeEventListener('progress', onProgB);
      audioA.removeEventListener('error', onErrA);
      audioB.removeEventListener('error', onErrB);
      audioA.removeEventListener('ended', onEndA);
      audioB.removeEventListener('ended', onEndB);
    };
  }, [
    crossfadeDuration,
    repeatMode,
    currentTrack,
    getNextTrackCandidate,
    startCrossfadeTransition,
    handleNextTrack,
    addToast,
  ]);

  // Sync volume state changes
  useEffect(() => {
    syncDeckVolumes();
  }, [syncDeckVolumes]);

  // Save Last Played Track position periodically
  useEffect(() => {
    if (currentTrack && currentTime > 0) {
      Storage.setLastPlayed(currentTrack.id, currentTime);
    }
  }, [currentTrack, currentTime]);

  // Fetch Hugging Face Dataset Tree & Apply Strict Poster / Metadata Rules
  const fetchHFMusicLibrary = useCallback(async (isRetry = false) => {
    setIsLoadingHF(true);

    try {
      const response = await fetch(
        `/api/hf-tree?user=${encodeURIComponent(HF_CONFIG.HF_USER)}&repo=${encodeURIComponent(HF_CONFIG.HF_REPO)}`
      );

      if (!response.ok) {
        // Transient blip (cold start, brief HF hiccup)? Try once more
        // silently before bothering the user with an error toast.
        if (!isRetry) {
          setTimeout(() => fetchHFMusicLibrary(true), 1500);
          return;
        }
        const errBody = await response.json().catch(() => null);
        addToast(
          errBody?.error
            ? `Couldn't load your library: ${errBody.error}`
            : "Couldn't load your music library right now. Try refreshing.",
          'error'
        );
        setTracks([]);
        setIsLoadingHF(false);
        return;
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        const audioFiles = data.filter((item: any) => {
          if (item.type !== 'file' || !item.path) return false;
          const ext = item.path.substring(item.path.lastIndexOf('.')).toLowerCase();
          return SUPPORTED_AUDIO_EXTENSIONS.includes(ext);
        });

        if (audioFiles.length > 0) {
          const hfTracks: Track[] = audioFiles.map((file: any) => {
            const metadata = parseTrackMetadata(file.path);

            return {
              id: `hf_${HF_CONFIG.HF_USER}_${HF_CONFIG.HF_REPO}_${file.path}`,
              path: file.path,
              title: metadata.title,
              artist: metadata.artist,
              album: 'Single',
              duration: 210,
              audioUrl: metadata.audioUrl,
              gradientColors: ['#1DB954', '#121212'] as [string, string],
              coverArtUrl: metadata.posterUrl,
              size: file.size,
              source: 'hf',
              dateAdded: 'Recently',
            };
          });

          setTracks(hfTracks);
        } else {
          setTracks([]);
        }
      } else {
        // The endpoint always returns 200, but on failure the body is
        // { error, tracks: [] } instead of an array. Treat that the same
        // way an HTTP error used to be treated: retry once, then tell
        // the user what actually happened instead of just going quiet.
        if (data && typeof data === 'object' && 'error' in data) {
          if (!isRetry) {
            setTimeout(() => fetchHFMusicLibrary(true), 1500);
            return;
          }
          addToast(`Couldn't load your library: ${data.error}`, 'error');
        }
        setTracks([]);
      }
    } catch (err: any) {
      if (!isRetry) {
        setTimeout(() => fetchHFMusicLibrary(true), 1500);
        return;
      }
      console.warn('Hugging Face dataset offline or empty:', err?.message || err);
      addToast("Couldn't reach your music library. Check your connection and try refreshing.", 'error');
      setTracks([]);
    } finally {
      setIsLoadingHF(false);
    }
  }, [addToast]);

  // Mount Fetch
  useEffect(() => {
    fetchHFMusicLibrary();
  }, [fetchHFMusicLibrary]);

  // Shuffle defaults to on, so seed the stable shuffled order as soon as
  // the library loads — otherwise it'd stay empty until the user manually
  // toggled shuffle off and back on.
  useEffect(() => {
    if (isShuffle && tracks.length > 0 && shuffledOrder.length === 0) {
      setShuffledOrder(shuffleArray(tracks));
    }
  }, [isShuffle, tracks, shuffledOrder.length]);

  // Fetch AI-Generated Daily Playlists
  // (Punjabi Mix / Haryanvi Mix / Hindi Mix / Love Mix, etc. — server picks
  // and caches these once per day; every visitor sees the same set.)
  const [rawAiPlaylists, setRawAiPlaylists] = useState<
    { id: string; name: string; emoji: string; description: string; paths: string[] }[]
  >([]);

  useEffect(() => {
    const geminiKey = Storage.getGeminiKey();
    fetch('/api/ai-playlists', {
      headers: geminiKey ? { 'x-gemini-key': geminiKey } : undefined,
    })
      .then((res) => (res.ok ? res.json() : { playlists: [] }))
      .then((data) => setRawAiPlaylists(Array.isArray(data?.playlists) ? data.playlists : []))
      .catch(() => setRawAiPlaylists([]));
  }, []);

  // Resolve each AI playlist's file paths against the loaded track library.
  // Re-runs whenever the library or the raw AI playlist data changes.
  useEffect(() => {
    if (tracks.length === 0 || rawAiPlaylists.length === 0) {
      setAiPlaylists([]);
      return;
    }
    const byPath = new Map(tracks.map((t) => [t.path, t]));
    const resolved: AiPlaylist[] = rawAiPlaylists
      .map((p) => ({
        id: p.id,
        name: p.name,
        emoji: p.emoji,
        description: p.description,
        tracks: p.paths.map((path) => byPath.get(path)).filter((t): t is Track => Boolean(t)),
      }))
      .filter((p) => p.tracks.length > 0);
    setAiPlaylists(resolved);
  }, [tracks, rawAiPlaylists]);

  // Restore Last Played Track from Storage
  useEffect(() => {
    const lastPlayed = Storage.getLastPlayed();
    if (lastPlayed && tracks.length > 0) {
      const track = tracks.find((t) => t.id === lastPlayed.trackId);
      if (track) {
        setCurrentTrack(track);
        if (audioRefA.current) {
          audioRefA.current.src = getStreamableAudioUrl(track);
        }
      }
    } else if (tracks.length > 0 && !currentTrack) {
      setCurrentTrack(tracks[0]);
    }
  }, [tracks]);

  // Helper to check if error is a benign audio play interruption
  const isBenignPlayError = (err: any) => {
    return (
      err?.name === 'AbortError' ||
      err?.message?.includes('interrupted') ||
      err?.message?.includes('pause') ||
      err?.message?.includes('removed')
    );
  };

  // Play Specific Track
  const handlePlayTrack = useCallback(
    (track: Track, customQueue?: Track[]) => {
      const activeAudio = activeDeckRef.current === 'A' ? audioRefA.current : audioRefB.current;
      if (!activeAudio) return;

      if (customQueue && customQueue.length > 0) {
        const trackIdx = customQueue.findIndex((t) => t.id === track.id);
        if (trackIdx !== -1) {
          setUserQueue(customQueue.slice(trackIdx + 1));
        }
      }

      // If shuffle is active, sync shuffledOrder so this track is first and rest are shuffled after it
      if (isShuffle) {
        const list = customQueue && customQueue.length > 0 ? customQueue : tracks;
        const remaining = list.filter((t) => t.id !== track.id);
        setShuffledOrder([track, ...shuffleArray(remaining)]);
      }

      if (currentTrack?.id === track.id) {
        if (isPlaying) {
          cancelCrossfade();
          activeAudio.pause();
          setIsPlaying(false);
        } else {
          activeAudio
            .play()
            .then(() => {
              setIsPlaying(true);
            })
            .catch((err) => {
              if (!isBenignPlayError(err)) {
                console.error('Play failed:', err);
                addToast('Error starting audio playback.', 'error');
              }
            });
        }
        return;
      }

      if (isSafariBrowser() && !isSafariPlayable(track.path)) {
        addToast(`"${track.title}" isn't a format Safari can play. Try it in Chrome instead.`, 'error');
        return;
      }

      // If already playing and crossfade duration > 0, do a smooth crossfade transition
      if (isPlaying && crossfadeDuration > 0) {
        startCrossfadeTransition(track, Math.min(crossfadeDuration, 3));
      } else {
        cancelCrossfade();
        setCurrentTrack(track);
        trackPlayStart(track);
        setBufferedPercent(0);

        const currentActive = activeDeckRef.current === 'A' ? audioRefA.current : audioRefB.current;
        if (currentActive) {
          currentActive.src = getStreamableAudioUrl(track);
          currentActive.currentTime = 0;
          currentActive.load();
          currentActive
            .play()
            .then(() => {
              setIsPlaying(true);
              document.title = `${track.title} • ${track.artist || 'Spotify'}`;
            })
            .catch((err) => {
              if (!isBenignPlayError(err)) {
                console.error('Playback failed:', err);
                addToast(`Failed to play ${track.title}.`, 'error');
              }
              setIsPlaying(false);
            });
        }
      }

      setMaximizedInitialTab('art');
      setIsMaximizedPlayerOpen(true);
    },
    [currentTrack, isPlaying, addToast, trackPlayStart, crossfadeDuration, startCrossfadeTransition, cancelCrossfade]
  );

  const handleAddToQueue = useCallback((track: Track) => {
    setUserQueue((prev) => [...prev, track]);
    addToast(`Added ${track.title} to queue`, 'success');
  }, [addToast]);

  // Play / Pause Toggle
  const handleTogglePlayPause = useCallback(() => {
    const activeAudio = activeDeckRef.current === 'A' ? audioRefA.current : audioRefB.current;
    if (!activeAudio) return;

    if (!currentTrack && tracks.length > 0) {
      handlePlayTrack(tracks[0]);
      return;
    }

    if (isPlaying) {
      cancelCrossfade();
      if (audioRefA.current) audioRefA.current.pause();
      if (audioRefB.current) audioRefB.current.pause();
      setIsPlaying(false);
    } else {
      activeAudio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          if (!isBenignPlayError(err)) {
            console.error('Play error:', err);
            addToast('Playback blocked or failed.', 'error');
          }
        });
    }
  }, [currentTrack, isPlaying, tracks, handlePlayTrack, addToast, cancelCrossfade]);

  // Previous Track Logic
  const handlePrevTrack = useCallback(() => {
    if (tracks.length === 0) return;

    const activeAudio = activeDeckRef.current === 'A' ? audioRefA.current : audioRefB.current;
    if (activeAudio && activeAudio.currentTime > 3) {
      activeAudio.currentTime = 0;
      return;
    }

    const currentIndex = tracks.findIndex((t) => t.id === currentTrack?.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : tracks.length - 1;
    handlePlayTrack(tracks[prevIndex]);
  }, [tracks, currentTrack, handlePlayTrack]);

  // Seek Progress
  const handleSeek = useCallback((time: number) => {
    cancelCrossfade();
    const activeAudio = activeDeckRef.current === 'A' ? audioRefA.current : audioRefB.current;
    if (activeAudio) {
      activeAudio.currentTime = time;
    }
    setCurrentTime(time);
  }, [cancelCrossfade]);

  // Volume Change
  const handleVolumeChange = useCallback((newVol: number) => {
    setVolumeState(newVol);
    Storage.setVolume(newVol);
    if (isMuted && newVol > 0) {
      setIsMutedState(false);
      Storage.setMuted(false);
    }
  }, [isMuted]);

  // Toggle Mute
  const handleToggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMutedState(nextMuted);
    Storage.setMuted(nextMuted);
  }, [isMuted]);

  // Toggle Shuffle & Repeat Modes
  const handleToggleShuffle = useCallback(() => {
    setIsShuffle((prev) => {
      const nextShuffle = !prev;
      if (nextShuffle) {
        const remaining = tracks.filter((t) => t.id !== currentTrack?.id);
        const newOrder = currentTrack ? [currentTrack, ...shuffleArray(remaining)] : shuffleArray(tracks);
        setShuffledOrder(newOrder);
        recentlyShuffledIdsRef.current = [];
        setIsQueueOpen(true);
        addToast('Shuffle On — Up Next Queue Synced', 'info');
      } else {
        addToast('Shuffle Off', 'info');
      }
      return nextShuffle;
    });
  }, [addToast, tracks, currentTrack]);

  const handleToggleRepeat = useCallback(() => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const nextIndex = (modes.indexOf(repeatMode) + 1) % modes.length;
    const nextMode = modes[nextIndex];
    setRepeatMode(nextMode);
    addToast(`Repeat: ${nextMode.toUpperCase()}`, 'info');
  }, [repeatMode, addToast]);

  // Toggle Favorite / Liked Song
  const handleToggleLike = useCallback((trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = Storage.toggleLikedTrack(trackId);
    setLikedTrackIds(updated);
    const isNowLiked = updated.includes(trackId);
    addToast(isNowLiked ? 'Saved to Liked Songs' : 'Removed from Liked Songs', 'info');
  }, [addToast]);

  // Create Custom Playlist
  const handleCreatePlaylist = useCallback(
    async (name: string, description?: string) => {
      const newPlaylist: Playlist = {
        id: `pl_${Date.now()}`,
        name,
        description: description || 'Custom User Playlist',
        gradient: 'from-[#1DB954] to-teal-800',
        trackIds: [],
        isCustom: true,
      };

      if (user) {
        try {
          await savePlaylistToFirestore(user.uid, newPlaylist);
          addToast(`Playlist "${name}" saved to Firebase!`, 'success');
        } catch (err) {
          console.error('Error saving to Firebase:', err);
          addToast(`Failed to save playlist to Firebase.`, 'error');
        }
      } else {
        const updated = [...playlists, newPlaylist];
        setPlaylists(updated);
        Storage.setCustomPlaylists(updated);
        addToast(`Created playlist "${name}" locally! Log in to save to Firebase.`, 'info');
      }

      setActivePlaylistId(newPlaylist.id);
      setActiveTab('playlist');
    },
    [user, playlists, addToast]
  );

  // Toggle Track in Custom Playlist
  const handleToggleTrackInPlaylist = useCallback(
    async (trackId: string, playlistId: string) => {
      let plName = '';
      let isAdded = false;
      let newTrackIds: string[] = [];
      const targetTrack = tracks.find((t) => t.id === trackId);

      const updated = playlists.map((pl) => {
        if (pl.id === playlistId) {
          plName = pl.name;
          const exists = pl.trackIds.includes(trackId);
          isAdded = !exists;
          newTrackIds = exists
            ? pl.trackIds.filter((id) => id !== trackId)
            : [...pl.trackIds, trackId];
          return { ...pl, trackIds: newTrackIds };
        }
        return pl;
      });

      setPlaylists(updated);
      Storage.setCustomPlaylists(updated);

      if (user) {
        try {
          await updatePlaylistTracksInFirestore(user.uid, playlistId, newTrackIds);
        } catch (err) {
          console.error('Error updating playlist in Firebase:', err);
        }
      }

      if (targetTrack) {
        if (isAdded) {
          addToast(`Added "${targetTrack.title}" to ${plName}`, 'success');
        } else {
          addToast(`Removed "${targetTrack.title}" from ${plName}`, 'info');
        }
      }
    },
    [user, playlists, tracks, addToast]
  );

  // Remove Track from Playlist
  const handleRemoveTrackFromPlaylist = useCallback(
    (trackId: string, playlistId: string) => {
      handleToggleTrackInPlaylist(trackId, playlistId);
    },
    [handleToggleTrackInPlaylist]
  );

  // Delete Custom Playlist
  const handleDeletePlaylist = useCallback(
    async (playlistId: string) => {
      const pl = playlists.find((p) => p.id === playlistId);
      const updated = playlists.filter((p) => p.id !== playlistId);
      setPlaylists(updated);
      Storage.setCustomPlaylists(updated);

      if (user) {
        try {
          await deletePlaylistFromFirestore(user.uid, playlistId);
        } catch (err) {
          console.error('Error deleting playlist from Firebase:', err);
        }
      }

      if (activePlaylistId === playlistId) {
        setActivePlaylistId(null);
        setActiveTab('library');
      }
      addToast(`Deleted playlist "${pl?.name || ''}"`, 'info');
    },
    [user, playlists, activePlaylistId, addToast]
  );

  // Select Active Playlist
  const handleSelectPlaylist = useCallback((playlistId: string) => {
    setActivePlaylistId(playlistId);
    setActiveTab('playlist');
  }, []);

  // Keyboard Shortcuts (Space, Arrows, M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlayPause();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const activeAudio = activeDeckRef.current === 'A' ? audioRefA.current : audioRefB.current;
        if (activeAudio) {
          handleSeek(Math.min(activeAudio.currentTime + 5, duration));
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const activeAudio = activeDeckRef.current === 'A' ? audioRefA.current : audioRefB.current;
        if (activeAudio) {
          handleSeek(Math.max(activeAudio.currentTime - 5, 0));
        }
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        handleToggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleTogglePlayPause, handleSeek, handleToggleMute, duration]);

  // Media Session API — this is what makes background/lock-screen playback
  // actually work correctly. Without it, browsers have no signal that this
  // tab is running an active media session, so backgrounded/locked-screen
  // tabs can get frozen by the browser's power-saving throttling — the
  // *current* song keeps playing (native OS audio session), but the JS
  // callback that would advance to the next track when it ends never gets
  // to run. Registering metadata + action handlers here also gives proper
  // lock-screen/notification playback controls (title, artist, artwork,
  // play/pause/next/previous) for free.
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist || 'Unknown Artist',
      album: currentTrack.album || '',
      artwork: currentTrack.coverArtUrl
        ? [
            { src: currentTrack.coverArtUrl, sizes: '512x512', type: 'image/jpeg' },
            { src: currentTrack.coverArtUrl, sizes: '256x256', type: 'image/jpeg' },
            { src: currentTrack.coverArtUrl, sizes: '96x96', type: 'image/jpeg' },
          ]
        : [],
    });
  }, [currentTrack]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => handleTogglePlayPause());
    navigator.mediaSession.setActionHandler('pause', () => handleTogglePlayPause());
    navigator.mediaSession.setActionHandler('previoustrack', () => handlePrevTrack());
    navigator.mediaSession.setActionHandler('nexttrack', () => handleNextTrack());
    try {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime != null) handleSeek(details.seekTime);
      });
    } catch {
      // seekto isn't supported in every browser — safe to ignore
    }

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      try {
        navigator.mediaSession.setActionHandler('seekto', null);
      } catch {
        // ignore
      }
    };
  }, [handleTogglePlayPause, handlePrevTrack, handleNextTrack, handleSeek]);

  // Global Spotify-style Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (isInput) return;

      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      if (e.key === 'Escape') {
        setIsShortcutsOpen(false);
        setIsQueueOpen(false);
        setIsMaximizedPlayerOpen(false);
        return;
      }

      if (e.code === 'Space' || e.key === 'k') {
        e.preventDefault();
        handleTogglePlayPause();
        return;
      }

      if (e.key === 'n' || (e.ctrlKey && e.key === 'ArrowRight')) {
        e.preventDefault();
        handleNextTrack();
        return;
      }

      if (e.key === 'p' || (e.ctrlKey && e.key === 'ArrowLeft')) {
        e.preventDefault();
        handlePrevTrack();
        return;
      }

      if (e.key === 'm') {
        e.preventDefault();
        handleToggleMute();
        return;
      }

      if (e.key === 's') {
        e.preventDefault();
        handleToggleShuffle();
        return;
      }

      if (e.key === 'r') {
        e.preventDefault();
        handleToggleRepeat();
        return;
      }

      if (e.key === 'l' && currentTrack) {
        e.preventDefault();
        handleToggleLike(currentTrack.id, { stopPropagation: () => {} } as any);
        return;
      }

      if (e.key === 'q') {
        e.preventDefault();
        setIsQueueOpen((prev) => !prev);
        return;
      }

      if (e.key === 'f') {
        e.preventDefault();
        setIsMaximizedPlayerOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleTogglePlayPause,
    handleNextTrack,
    handlePrevTrack,
    handleToggleMute,
    handleToggleShuffle,
    handleToggleRepeat,
    handleToggleLike,
    currentTrack,
  ]);

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-white font-sans overflow-hidden select-none">
      {/* Dual Audio Decks for Crossfade */}
      <audio
        ref={audioRefA}
        playsInline
        preload="auto"
        style={{ display: 'none' }}
      />
      <audio
        ref={audioRefB}
        playsInline
        preload="auto"
        style={{ display: 'none' }}
      />
      <Toast toasts={toasts} onDismiss={dismissToast} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          likedCount={likedTrackIds.length}
          playlists={playlists}
          onRequestCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
          activePlaylistId={activePlaylistId}
          setActivePlaylistId={setActivePlaylistId}
          onOpenTodaysMix={() => {
            setActiveTab('home');
            setActivePlaylistId(null);
          }}
        />

        <div className="flex-1 flex flex-col min-w-0 bg-[#121212] overflow-hidden">
          <Header
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            user={user}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onLogOut={handleLogOut}
            onOpenInstallModal={() => setIsInstallModalOpen(true)}
            onOpenAdmin={() => setActiveTab('admin')}
            onOpenShortcuts={() => setIsShortcutsOpen(true)}
          />

          <MainView
            activeTab={activeTab}
            tracks={tracks}
            isLoadingHF={isLoadingHF}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            currentTime={currentTime}
            likedTrackIds={likedTrackIds}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onPlayTrack={(track, customQueue) => {
              handlePlayTrack(track, customQueue);
            }}
            onToggleLike={handleToggleLike}
            playlists={playlists}
            activePlaylistId={activePlaylistId}
            onRequestCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
            onAddToPlaylist={(track) => setAddToPlaylistTrack(track)}
            onAddToQueue={(track) => {
              setUserQueue((prev) => [...prev, track]);
              addToast(`Added "${track.title}" to Queue`, 'success');
            }}
            onRemoveFromPlaylist={handleRemoveTrackFromPlaylist}
            onDeletePlaylist={handleDeletePlaylist}
            onSelectPlaylist={(id) => {
              setActivePlaylistId(id);
              setActiveTab('playlist');
            }}
            onSeek={handleSeek}
            onPlayPause={handleTogglePlayPause}
            playCounts={playCounts}
            recentlyPlayedIds={recentlyPlayedIds}
            onRefreshLibrary={fetchHFMusicLibrary}
            addToast={addToast}
            todaysMixTracks={todaysMixTracks}
            onRemoveFromTodaysMix={handleRemoveFromTodaysMix}
            aiPlaylists={aiPlaylists}
          />
        </div>
      </div>

      <PlayerBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        bufferedPercent={bufferedPercent}
        volume={volume}
        isMuted={isMuted}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        crossfadeDuration={crossfadeDuration}
        onCrossfadeChange={handleCrossfadeChange}
        isLiked={currentTrack ? likedTrackIds.includes(currentTrack.id) : false}
        activeTab={activeTab}
        onPlayPause={handleTogglePlayPause}
        onPrevTrack={handlePrevTrack}
        onNextTrack={handleNextTrack}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
        onToggleLike={handleToggleLike}
        onOpenQueue={() => setIsQueueOpen(true)}
        onToggleLyrics={() => {
          setMaximizedInitialTab('lyrics');
          setIsMaximizedPlayerOpen(true);
        }}
        onOpenMaximizedPlayer={(tab) => {
          setMaximizedInitialTab(tab || 'art');
          setIsMaximizedPlayerOpen(true);
        }}
      />

      {/* Maximized Full-Screen Player Modal */}
      <ExpandedNowPlayingModal
        isOpen={isMaximizedPlayerOpen}
        onClose={() => setIsMaximizedPlayerOpen(false)}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        bufferedPercent={bufferedPercent}
        volume={volume}
        isMuted={isMuted}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        crossfadeDuration={crossfadeDuration}
        onCrossfadeChange={handleCrossfadeChange}
        isLiked={currentTrack ? likedTrackIds.includes(currentTrack.id) : false}
        initialTab={maximizedInitialTab}
        onPlayPause={handleTogglePlayPause}
        onPrevTrack={handlePrevTrack}
        onNextTrack={handleNextTrack}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
        onToggleLike={handleToggleLike}
        onOpenQueue={() => setIsQueueOpen(true)}
        userQueue={userQueue}
        queue={upNextQueue}
        onClearQueue={handleClearUserQueue}
        isAutoplay={isAutoplay}
        onToggleAutoplay={() => setIsAutoplay(!isAutoplay)}
        onRemoveFromQueue={(index) => setUserQueue((prev) => prev.filter((_, i) => i !== index))}
        onPlayTrack={handlePlayTrack}
        onAddToPlaylist={(track) => setAddToPlaylistTrack(track)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Queue Drawer Modal */}
      <QueueModal
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        queue={upNextQueue}
        userQueue={userQueue}
        onClearQueue={handleClearUserQueue}
        currentTrack={currentTrack}
        crossfadeDuration={crossfadeDuration}
        onCrossfadeChange={handleCrossfadeChange}
        onPlayTrack={(track) => {
          handlePlayTrack(track);
          setIsQueueOpen(false);
        }}
        isAutoplay={isAutoplay}
        onToggleAutoplay={() => setIsAutoplay(!isAutoplay)}
        onRemoveFromQueue={(index) => setUserQueue((prev) => prev.filter((_, i) => i !== index))}
        isShuffle={isShuffle}
      />

      {/* Create Custom Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreatePlaylistOpen}
        onClose={() => setIsCreatePlaylistOpen(false)}
        onCreatePlaylist={handleCreatePlaylist}
      />

      {/* Add Track to Playlist Modal */}
      <AddToPlaylistModal
        isOpen={!!addToPlaylistTrack}
        onClose={() => setAddToPlaylistTrack(null)}
        track={addToPlaylistTrack}
        playlists={playlists}
        onToggleTrackInPlaylist={handleToggleTrackInPlaylist}
        onCreateNewPlaylist={() => setIsCreatePlaylistOpen(true)}
      />

      {/* Firebase Auth Login / Signup Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccessToast={(msg) => addToast(msg, 'success')}
      />

      {/* Install App (PWA) Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredInstallPrompt}
        onInstalled={() => {
          addToast('App installed! Check your home screen or app list.', 'success');
          setDeferredInstallPrompt(null);
        }}
      />

      {/* Keyboard Shortcuts Hub Overlay */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
