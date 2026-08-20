/* ---------- storage ---------- */
const STORE_KEY = 'cardtray.cards.v1';

function loadCards(){
  try{
    return JSON.parse(localStorage.getItem(STORE_KEY)) || [];
  }catch(e){ return []; }
}
function saveCards(cards){
  localStorage.setItem(STORE_KEY, JSON.stringify(cards));
}
function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}

/* ---------- base64url encode/decode of card data (for shareable link) ---------- */
function encodeCard(card){
  const payload = {
    n:card.name, t:card.title, c:card.company,
    e:card.email, p:card.phone, w:card.website,
    b:card.bio, s:card.stock
  };
  const json = JSON.stringify(payload);
  let b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function cardShareUrl(card){
  const base = new URL('card.html', window.location.href);
  base.searchParams.set('d', encodeCard(card));
  return base.href;
}

const STOCKS = {
  navy:'#14213D', forest:'#1F4B3F', burgundy:'#5B1F2E', charcoal:'#2B2926'
};

/* ---------- rendering ---------- */
const grid = document.getElementById('grid');
const empty = document.getElementById('empty');

function render(){
  const cards = loadCards();
  grid.innerHTML = '';
  if(cards.length === 0){
    empty.style.display = 'block';
    grid.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  grid.style.display = 'grid';

  cards.forEach((card, i) => {
    const slot = document.createElement('div');
    slot.className = 'card-slot';
    slot.dataset.id = card.id;

    const stockColor = STOCKS[card.stock] || STOCKS.navy;
    const no = String(i+1).padStart(3,'0');

    slot.innerHTML = `
      <div class="card-flip">
        <div class="card-face front" style="background:${stockColor}">
          <div class="perf"></div>
          <div class="card-actions">
            <button class="icon-btn" data-action="edit" title="Edit">&#9998;</button>
            <button class="icon-btn" data-action="delete" title="Delete">&times;</button>
          </div>
          <div class="card-front">
            <div class="no">No. ${no}</div>
            <div class="id">
              <h3>${escapeHtml(card.name || 'Unnamed')}</h3>
              <p class="role">${escapeHtml(card.title || '')}</p>
              <div class="co">${escapeHtml(card.company || '')}</div>
            </div>
            <div class="foot">
              <div class="contact-line">${escapeHtml(card.email || card.phone || '')}</div>
            </div>
          </div>
          <div class="flip-hint" data-action="flip">Flip &#8635;</div>
        </div>
        <div class="card-face back">
          <div class="perf"></div>
          <div class="card-back">
            <div class="qr-wrap" data-qr></div>
            <div>
              <div class="stamp-text">
                <span class="name">${escapeHtml(card.name || '')}</span>
                Scan to view &amp; save
              </div>
              <div class="row-actions">
                <button data-action="copy">Copy link</button>
                <button data-action="open">Open card</button>
                <button data-action="flip">&#8635; Flip back</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(slot);

    // generate QR into the back once
    const qrHost = slot.querySelector('[data-qr]');
    new QRCode(qrHost, {
      text: cardShareUrl(card),
      width: 108,
      height: 108,
      colorDark: '#14213D',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  });
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* ---------- interactions ---------- */
grid.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  const slot = e.target.closest('.card-slot');
  if(!slot) return;
  const id = slot.dataset.id;
  const cards = loadCards();
  const card = cards.find(c => c.id === id);

  if(!btn){
    // click on card body (not a button) -> flip
    slot.classList.toggle('flipped');
    return;
  }

  const action = btn.dataset.action;
  if(action === 'flip'){
    slot.classList.toggle('flipped');
  } else if(action === 'edit'){
    openModal(card);
  } else if(action === 'delete'){
    if(confirm(`Delete "${card.name || 'this card'}"? This can't be undone.`)){
      saveCards(cards.filter(c => c.id !== id));
      render();
      toast('Card deleted');
    }
  } else if(action === 'copy'){
    navigator.clipboard.writeText(cardShareUrl(card)).then(()=> toast('Link copied'));
  } else if(action === 'open'){
    window.open(cardShareUrl(card), '_blank');
  }
});

/* ---------- modal ---------- */
const backdrop = document.getElementById('modal-backdrop');
const form = document.getElementById('card-form');
let editingId = null;

function openModal(card){
  editingId = card ? card.id : null;
  document.getElementById('modal-title').textContent = card ? 'Edit card' : 'New card';
  form.name.value = card?.name || '';
  form.title.value = card?.title || '';
  form.company.value = card?.company || '';
  form.email.value = card?.email || '';
  form.phone.value = card?.phone || '';
  form.website.value = card?.website || '';
  form.bio.value = card?.bio || '';
  const stock = card?.stock || 'navy';
  document.querySelectorAll('.stock-dot').forEach(d => {
    d.classList.toggle('selected', d.dataset.stock === stock);
  });
  form.dataset.stock = stock;
  backdrop.classList.add('show');
  form.name.focus();
}
function closeModal(){
  backdrop.classList.remove('show');
  editingId = null;
}

document.getElementById('add-card-btn').addEventListener('click', () => openModal(null));
document.getElementById('empty-add-btn').addEventListener('click', () => openModal(null));
document.getElementById('cancel-btn').addEventListener('click', closeModal);
backdrop.addEventListener('click', (e) => { if(e.target === backdrop) closeModal(); });

document.querySelectorAll('.stock-dot').forEach(dot => {
  dot.addEventListener('click', () => {
    document.querySelectorAll('.stock-dot').forEach(d => d.classList.remove('selected'));
    dot.classList.add('selected');
    form.dataset.stock = dot.dataset.stock;
  });
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const cards = loadCards();
  const data = {
    id: editingId || uid(),
    name: form.name.value.trim(),
    title: form.title.value.trim(),
    company: form.company.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    website: form.website.value.trim(),
    bio: form.bio.value.trim(),
    stock: form.dataset.stock || 'navy'
  };
  if(!data.name){
    form.name.focus();
    return;
  }
  if(editingId){
    const idx = cards.findIndex(c => c.id === editingId);
    cards[idx] = data;
  } else {
    cards.push(data);
  }
  saveCards(cards);
  closeModal();
  render();
  toast(editingId ? 'Card updated' : 'Card added');
});

/* ---------- toast ---------- */
let toastTimer;
function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.classList.remove('show'), 2200);
}

render();
