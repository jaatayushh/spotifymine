import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

const server = createServer(app);
const wss = new WebSocketServer({ server });

// Watch Party Rooms Store
const partyRooms = new Map();

function getRoom(roomId) {
  if (!partyRooms.has(roomId)) {
    partyRooms.set(roomId, {
      id: roomId,
      state: { currentTime: 0, isPaused: true, mediaTitle: '', mediaUrl: '', lastUpdated: Date.now() },
      members: new Map(),
      chat: []
    });
  }
  return partyRooms.get(roomId);
}

function broadcastRoom(roomId, message, senderWs = null) {
  const room = partyRooms.get(roomId);
  if (!room) return;
  const payload = JSON.stringify(message);
  for (const [clientWs] of room.members) {
    if (clientWs !== senderWs && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(payload);
    }
  }
}

wss.on('connection', (ws) => {
  let currentRoomId = null;
  let clientUser = { name: 'Guest', avatar: '' };

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'join') {
        currentRoomId = msg.partyId || 'default';
        clientUser = { name: msg.user || 'Guest', avatar: msg.avatar || '' };
        const room = getRoom(currentRoomId);
        room.members.set(ws, clientUser);

        ws.send(JSON.stringify({
          type: 'room_init',
          partyId: currentRoomId,
          state: room.state,
          memberCount: room.members.size,
          chat: room.chat.slice(-50)
        }));

        broadcastRoom(currentRoomId, {
          type: 'user_joined',
          partyId: currentRoomId,
          user: clientUser.name,
          memberCount: room.members.size
        });
      } else if (msg.type === 'sync_state') {
        if (!currentRoomId) return;
        const room = getRoom(currentRoomId);
        room.state = {
          currentTime: msg.currentTime,
          isPaused: msg.isPaused,
          mediaTitle: msg.mediaTitle || room.state.mediaTitle,
          mediaUrl: msg.mediaUrl || room.state.mediaUrl,
          lastUpdated: Date.now()
        };
        broadcastRoom(currentRoomId, {
          type: 'sync_state',
          partyId: currentRoomId,
          state: room.state,
          sender: clientUser.name
        }, ws);
      } else if (msg.type === 'chat_message') {
        if (!currentRoomId) return;
        const room = getRoom(currentRoomId);
        const chatItem = {
          id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          user: clientUser.name,
          avatar: clientUser.avatar,
          message: msg.message,
          timestamp: Date.now()
        };
        room.chat.push(chatItem);
        if (room.chat.length > 100) room.chat.shift();

        broadcastRoom(currentRoomId, {
          type: 'chat_message',
          partyId: currentRoomId,
          chatItem
        });
        ws.send(JSON.stringify({
          type: 'chat_message',
          partyId: currentRoomId,
          chatItem
        }));
      } else if (msg.type === 'reaction') {
        if (!currentRoomId) return;
        broadcastRoom(currentRoomId, {
          type: 'reaction',
          partyId: currentRoomId,
          user: clientUser.name,
          emoji: msg.emoji
        }, ws);
      }
    } catch (e) {
      console.error('WS message error:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && partyRooms.has(currentRoomId)) {
      const room = partyRooms.get(currentRoomId);
      room.members.delete(ws);
      if (room.members.size > 0) {
        broadcastRoom(currentRoomId, {
          type: 'user_left',
          partyId: currentRoomId,
          user: clientUser.name,
          memberCount: room.members.size
        });
      }
    }
  });
});

// Watch Party REST endpoints for backup
app.post('/api/party/sync', (req, res) => {
  const { partyId, currentTime, isPaused, mediaTitle, mediaUrl } = req.body;
  if (!partyId) return res.status(400).json({ error: 'Missing partyId' });
  const room = getRoom(partyId);
  room.state = { currentTime, isPaused, mediaTitle, mediaUrl, lastUpdated: Date.now() };
  res.json({ success: true, state: room.state, memberCount: room.members.size });
});

app.get('/api/party/state', (req, res) => {
  const partyId = req.query.partyId;
  if (!partyId) return res.status(400).json({ error: 'Missing partyId' });
  const room = getRoom(partyId);
  res.json({ state: room.state, memberCount: room.members.size, chat: room.chat.slice(-50) });
});

app.post('/api/party/chat', (req, res) => {
  const { partyId, user, avatar, message } = req.body;
  if (!partyId || !message) return res.status(400).json({ error: 'Invalid message' });
  const room = getRoom(partyId);
  const chatItem = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    user: user || 'Guest',
    avatar: avatar || '',
    message,
    timestamp: Date.now()
  };
  room.chat.push(chatItem);
  res.json({ success: true, chatItem });
});

app.get('/api/tmdb', async (req, res) => {
  const tmdbPath = req.query.path;
  const apiKey = req.query.api_key || process.env.TMDB_API_KEY || '6cffbd2afef40abe5ce96016e1c81548';
  if (!tmdbPath) return res.status(400).json({ error: 'Missing path param' });

  const cleanPath = tmdbPath.startsWith('/') ? tmdbPath.slice(1) : tmdbPath;
  const delimiter = cleanPath.includes('?') ? '&' : '?';
  const targetUrl = `https://api.themoviedb.org/3/${cleanPath}${delimiter}api_key=${apiKey}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (!response.ok) {
      // Try fallback proxy if official domain responds with error
      const fallbackUrl = `https://api.tmdb.org/3/${cleanPath}${delimiter}api_key=${apiKey}`;
      const fbResponse = await fetch(fallbackUrl);
      if (fbResponse.ok) {
        const fbData = await fbResponse.json();
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.json(fbData);
      }
      return res.status(response.status).json({ error: `TMDB returned status ${response.status}` });
    }
    const data = await response.json();
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.json(data);
  } catch (error) {
    console.error('TMDB Proxy primary error, trying fallback:', error.message);
    try {
      const fallbackUrl = `https://api.tmdb.org/3/${cleanPath}${delimiter}api_key=${apiKey}`;
      const fbResponse = await fetch(fallbackUrl);
      if (fbResponse.ok) {
        const fbData = await fbResponse.json();
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.json(fbData);
      }
    } catch (fbErr) {
      console.error('TMDB fallback error:', fbErr.message);
    }
    res.status(500).json({ error: 'TMDB proxy request failed' });
  }
});

// Image Proxy to unblock TMDB posters/backdrops in India & restricted regions
app.get('/api/tmdb-image', async (req, res) => {
  const imagePath = req.query.path;
  const size = req.query.size || 'w500';
  if (!imagePath) {
    return res.redirect('https://placehold.co/500x750/111/fff?text=No+Image');
  }

  const clean = imagePath.startsWith('/') ? imagePath : '/' + imagePath;
  const tmdbImageUrl = `https://image.tmdb.org/t/p/${size}${clean}`;

  try {
    const imgRes = await fetch(tmdbImageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    if (imgRes.ok) {
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      const arrayBuffer = await imgRes.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }
  } catch (err) {
    console.warn('Direct TMDB image fetch failed, redirecting to CDN mirror:', err.message);
  }

  // Fallback to Cloudflare-backed global image proxy (wsrv.nl works worldwide including India)
  const cdnMirrorUrl = `https://wsrv.nl/?url=${encodeURIComponent(tmdbImageUrl)}&default=${encodeURIComponent('https://placehold.co/500x750/111/fff?text=No+Image')}`;
  res.redirect(cdnMirrorUrl);
});

app.use(express.static(__dirname));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
