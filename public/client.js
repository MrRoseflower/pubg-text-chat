const $ = (id) => document.getElementById(id);
const messages = $("messages");
let socket; let joined = false;

// Bildirim sesi ekle
const notificationSound = new Audio('notification.mp3');

function esc(s){
  return s.replace(/[&<>\"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
}

function addMsg(html, cls=''){
  const d=document.createElement('div');
  d.className='m '+cls; 
  d.innerHTML=html; 
  messages.appendChild(d);
  messages.scrollTop = messages.scrollHeight;
}

function qs(name){
  const u=new URL(location.href); 
  return u.searchParams.get(name);
}

function setShareLink(room){
  const u=new URL(location.href);
  u.searchParams.set('r', room);
  navigator.clipboard.writeText(u.toString()).then(()=>{
    addMsg('<span class="sys">Oda linki panoya kopyalandı.</span>','sys');
  });
}

async function join(){
  const name = $("name").value.trim() || 'Anon';
  const room = $("room").value.trim() || 'lobby';

  socket = io({ transports: ['websocket'], upgrade: false });

  socket.on('connect', () => {
    socket.emit('join', { room, name });
    $("status").textContent = `Oda: ${room} | ${name}`;
    joined = true;
  });

  socket.on('system', (t) => 
    addMsg(`<span class="sys">${esc(t)}</span>`, 'sys')
  );

  socket.on('chat', ({ from, text, ts }) => {
    const time = new Date(ts||Date.now()).toLocaleTimeString();
    addMsg(`<span class="nick">${esc(from)}</span> [${time}]: ${esc(text)}`);

    // Bildirim sesi çal
    notificationSound.play().catch(err => {
      console.log("Ses çalınamadı:", err);
    });
  });

  $("app").classList.remove('hidden');
}

// UI events
$("joinBtn").onclick = join;
$("share").onclick = () => setShareLink($("room").value.trim() || 'lobby');

// form submit
const form = $("form"), input=$("input");
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!joined) return;
  const val = input.value.trim(); if (!val) return;
  socket.emit('chat', val);
  addMsg(`<span class="nick">Ben</span>: ${esc(val)}`);
  input.value='';
});

// URL'den oda cek (r=)
const r = qs('r'); 
if (r) $("room").value = r;
