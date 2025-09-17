const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 1e5
});

app.use(express.static(path.join(__dirname, 'public')));

const ROOMS = new Map();

io.on('connection', (socket) => {
  let joinedRoom = null;
  socket.data = { name: 'Anon', lastMsgAt: 0 };

  socket.on('join', ({ room, name }) => {
    room = String(room || '').trim().slice(0, 64) || 'lobby';
    name = String(name || 'Anon').trim().slice(0, 24) || 'Anon';

    if (!ROOMS.has(room)) ROOMS.set(room, new Set());
    const peers = ROOMS.get(room);
    if (peers.size >= 50) {
      socket.emit('system', `Oda dolu (50). Başka bir oda adı deneyin.`);
      return;
    }

    joinedRoom = room;
    socket.data.name = name;
    peers.add(socket.id);
    socket.join(room);

    socket.emit('system', `Oda: ${room} | Kullanıcı: ${name}`);
    socket.to(room).emit('system', `${name} odaya katıldı.`);
  });

  socket.on('chat', (text) => {
    if (!joinedRoom) return;
    const now = Date.now();
    if (now - socket.data.lastMsgAt < 300) return;
    socket.data.lastMsgAt = now;

    text = String(text || '').slice(0, 2000);
    if (!text.trim()) return;

    io.to(joinedRoom).emit('chat', {
      from: socket.data.name,
      text,
      ts: now
    });
  });

  socket.on('disconnect', () => {
    if (!joinedRoom) return;
    const peers = ROOMS.get(joinedRoom);
    if (peers) {
      peers.delete(socket.id);
      if (peers.size === 0) ROOMS.delete(joinedRoom);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Chat server listening on :' + PORT);
});
